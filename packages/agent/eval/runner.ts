/**
 * Phase 0 gate harness — runs the agent against the 5-fixture golden corpus
 * and reports pass/fail vs the average conformance threshold.
 *
 * Skips gracefully when ANTHROPIC_API_KEY is not in env so CI / smoke runs
 * never fail-loud.
 *
 * Usage:
 *   pnpm --filter @atelier-oss/agent eval
 *
 * Output format: human-readable summary table + JSON dump at the end so
 * downstream tools (or `pnpm eval | jq`) can ingest the result.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Agent } from '../src/index';

interface Fixture {
  id: string;
  brief: string;
  category: string;
}

interface FixtureRun {
  id: string;
  brief: string;
  category: string;
  conformance: number | null;
  tokens: number;
  raw: number;
  iterations: number;
  scoreAt: (number | null)[];
  durationMs: number;
  costUsd: number;
  passed: boolean;
}

const HERE = fileURLToPath(new URL('.', import.meta.url));
const CORPUS_DIR = join(HERE, 'golden-corpus');
// Phase 1 gate: 95% avg conformance with no individual fixture below 75%.
// (Phase 0 gate of 50% avg is now trivially cleared by the Phase 1 loop.)
const PHASE_1_GATE_AVG = 0.95;
const PHASE_1_GATE_MIN = 0.75;
const ITERATE_MAX = 3;
const ITERATE_THRESHOLD = 0.95;

async function loadFixtures(): Promise<Fixture[]> {
  const entries = await readdir(CORPUS_DIR);
  const files = entries.filter((f) => f.endsWith('.json')).sort();
  const fixtures: Fixture[] = [];
  for (const f of files) {
    const raw = await readFile(join(CORPUS_DIR, f), 'utf-8');
    fixtures.push(JSON.parse(raw) as Fixture);
  }
  return fixtures;
}

async function runOne(agent: Agent, fixture: Fixture): Promise<FixtureRun> {
  const start = Date.now();
  try {
    const result = await agent.run({ brief: fixture.brief });
    const conformance = result.scores.classify.conformance;
    const scoreAt = result.iterations.map((r) => r.conformance);
    return {
      id: fixture.id,
      brief: fixture.brief.slice(0, 60) + (fixture.brief.length > 60 ? '...' : ''),
      category: fixture.category,
      conformance,
      tokens: result.scores.classify.tokens,
      raw: result.scores.classify.raw,
      iterations: result.iterations.length - 1, // exclude initial
      scoreAt,
      durationMs: Date.now() - start,
      costUsd: result.cost.usd,
      // Phase 1 per-fixture floor: every fixture must clear the gate min.
      passed: conformance !== null && conformance >= PHASE_1_GATE_MIN,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[${fixture.id}] error: ${message}\n`);
    return {
      id: fixture.id,
      brief: fixture.brief.slice(0, 60) + (fixture.brief.length > 60 ? '...' : ''),
      category: fixture.category,
      conformance: null,
      tokens: 0,
      raw: 0,
      iterations: 0,
      scoreAt: [],
      durationMs: Date.now() - start,
      costUsd: 0,
      passed: false,
    };
  }
}

function printSummary(runs: FixtureRun[]): { avg: number; gatePassed: boolean } {
  const conformances = runs
    .map((r) => r.conformance)
    .filter((c): c is number => c !== null);
  const avg =
    conformances.length > 0
      ? conformances.reduce((a, b) => a + b, 0) / conformances.length
      : 0;

  // Phase 1 gate: avg >= 95% AND every fixture >= 75%.
  const allPassFloor = runs.every((r) => r.passed);
  const gatePassed = avg >= PHASE_1_GATE_AVG && allPassFloor;

  process.stdout.write('\n=== Phase 1 gate run ===\n\n');
  process.stdout.write('id'.padEnd(28));
  process.stdout.write('conformance'.padEnd(14));
  process.stdout.write('tokens/raw'.padEnd(12));
  process.stdout.write('iters'.padEnd(8));
  process.stdout.write('scores'.padEnd(28));
  process.stdout.write('cost'.padEnd(10));
  process.stdout.write('verdict\n');
  process.stdout.write('-'.repeat(112) + '\n');

  for (const run of runs) {
    process.stdout.write(run.id.padEnd(28));
    process.stdout.write(
      (run.conformance !== null
        ? `${(run.conformance * 100).toFixed(1)}%`
        : 'n/a'
      ).padEnd(14),
    );
    process.stdout.write(`${run.tokens}/${run.raw}`.padEnd(12));
    process.stdout.write(String(run.iterations).padEnd(8));
    const scoreStr = run.scoreAt
      .map((s) => (s === null ? 'n/a' : `${Math.round(s * 100)}%`))
      .join('->');
    process.stdout.write(scoreStr.slice(0, 26).padEnd(28));
    process.stdout.write(`$${run.costUsd.toFixed(4)}`.padEnd(10));
    process.stdout.write(run.passed ? 'PASS\n' : 'FAIL\n');
  }

  process.stdout.write('-'.repeat(112) + '\n');
  const totalCost = runs.reduce((a, r) => a + r.costUsd, 0);
  process.stdout.write(
    `Average: ${(avg * 100).toFixed(2)}%   Gate avg threshold: ${(PHASE_1_GATE_AVG * 100).toFixed(0)}%   Per-fixture floor: ${(PHASE_1_GATE_MIN * 100).toFixed(0)}%   Total cost: $${totalCost.toFixed(4)}   ${gatePassed ? 'GATE: PASS' : 'GATE: FAIL'}\n\n`,
  );

  process.stdout.write('=== JSON ===\n');
  process.stdout.write(
    JSON.stringify(
      {
        gate: {
          avg_threshold: PHASE_1_GATE_AVG,
          per_fixture_min: PHASE_1_GATE_MIN,
          iterate_max: ITERATE_MAX,
          iterate_threshold: ITERATE_THRESHOLD,
        },
        average: avg,
        total_cost_usd: totalCost,
        gate_passed: gatePassed,
        runs,
      },
      null,
      2,
    ) + '\n',
  );

  return { avg, gatePassed };
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    process.stdout.write(
      'Phase 0 eval skipped: ANTHROPIC_API_KEY is not set. ' +
        'Set the env var and rerun:\n  ANTHROPIC_API_KEY=... pnpm --filter @atelier-oss/agent eval\n',
    );
    process.exit(0);
  }

  const fixtures = await loadFixtures();
  if (fixtures.length === 0) {
    process.stderr.write('No fixtures found in golden-corpus/\n');
    process.exit(1);
  }

  process.stdout.write(
    `Running ${fixtures.length} fixtures against the live Anthropic API (iterate=${ITERATE_MAX}, threshold=${ITERATE_THRESHOLD})...\n`,
  );
  const agent = new Agent({ iterate: ITERATE_MAX, threshold: ITERATE_THRESHOLD });
  const runs: FixtureRun[] = [];
  for (const f of fixtures) {
    runs.push(await runOne(agent, f));
  }

  const { gatePassed } = printSummary(runs);
  process.exit(gatePassed ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`Eval runner crashed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(2);
});
