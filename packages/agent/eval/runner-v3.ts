/**
 * Phase 4.2 — Three-arm v3 generative-benchmark harness.
 *
 * Implements the locked spec at `benchmarks/spec-v3.md`:
 *   - Arm A: Agent.run({ brief, cwd: <tmp project with saas-dashboard DESIGN.md> })
 *   - Arm B: Agent.run({ brief })  -- no cwd, no figma
 *   - Arm C: raw Anthropic.messages.create() -- no system prompt, no sampling
 *
 * Sequential execution with per-fixture checkpoint resume; cumulative-cost
 * kill-switch; v2-broad TS classifier as primary scorer.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... pnpm --filter @atelier-oss/agent exec tsx eval/runner-v3.ts \
 *     [--dry-run] [--out-dir benchmarks/results] [--date 2026-05-08] \
 *     [--budget-cap-usd 30] [--n 3]
 *
 * Phase 4.3 (dry-run) and Phase 4.4 (full run) execute this harness; the
 * file itself does not call the live API at import time.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { scoreText, type ScoreResult } from '@atelier-oss/classify';
import { Agent } from '../src/index';
import { estimateUsd } from '../src/models/defaults';
import type { CodeFile } from '../src/types';

// ---------------------------------------------------------------------------
// Constants — frozen by spec-v3.
// ---------------------------------------------------------------------------

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const CORPUS_DIR = join(HERE, 'golden-corpus');

/** Exact corpus IDs per spec-v3 §Corpus (10 carryover + 5 fresh). */
export const V3_CORPUS = [
  '01-pricing-tiers',
  '02-saas-hero',
  '05-data-table',
  '06-warm-coral-pricing',
  '07-dusty-teal-hero',
  '08-cinematic-orb-hero',
  '09-full-landing-page',
  '12-explicit-hex-brand',
  '14-explicit-palette-brand',
  '15-photo-overlay-hero',
  '16-aubergine-music-card',
  '17-champagne-watch-detail',
  '18-fintech-portfolio-tile',
  '19-medical-records-table',
  '20-onboarding-modal',
];

/** Fresh-fixture subset reported separately in the result file. */
export const V3_FRESH_FIXTURES = new Set([
  '16-aubergine-music-card',
  '17-champagne-watch-detail',
  '18-fintech-portfolio-tile',
  '19-medical-records-table',
  '20-onboarding-modal',
]);

/** Dry-run subset: first 5 fixtures (a,b for control, c, d, e from fresh). */
const DRY_RUN_CORPUS = [
  '01-pricing-tiers',
  '02-saas-hero',
  '16-aubergine-music-card',
  '17-champagne-watch-detail',
  '18-fintech-portfolio-tile',
];

const ARMS = ['A', 'B', 'C'] as const;
type Arm = (typeof ARMS)[number];

const RAW_C_MODEL = 'claude-sonnet-4-6';
const RAW_C_MAX_TOKENS = 16384;

const PRIMARY_THRESHOLD = 0.30;
const PARTIAL_THRESHOLD = 0.20;
const SECONDARY_THRESHOLD = 0.10;
const HIGH_VARIANCE_THRESHOLD = 0.10;

// ---------------------------------------------------------------------------
// Types.
// ---------------------------------------------------------------------------

interface Fixture {
  id: string;
  brief: string;
  category?: string;
}

export interface CompletedRun {
  fixture: string;
  arm: Arm;
  i: number;
  initial_conformance: number | null;
  final_conformance: number | null;
  tokens: number;
  raw: number;
  iterations: number;
  duration_ms: number;
  cost_usd: number;
  error?: string;
}

interface Checkpoint {
  spec_sha: string;
  started_at: string;
  n: number;
  budget_cap_usd: number;
  cumulative_cost_usd: number;
  completed_runs: CompletedRun[];
}

interface ParsedFlags {
  dryRun: boolean;
  outDir: string;
  date: string;
  budgetCapUsd: number;
  n: number;
}

// ---------------------------------------------------------------------------
// Flag parsing — minimal, matches the documented CLI surface.
// ---------------------------------------------------------------------------

export function parseFlags(argv: string[]): ParsedFlags {
  const flags: Partial<ParsedFlags> = {};
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === '--dry-run') {
      flags.dryRun = true;
      i += 1;
    } else if (a === '--out-dir') {
      flags.outDir = argv[i + 1] ?? '';
      i += 2;
    } else if (a === '--date') {
      flags.date = argv[i + 1] ?? '';
      i += 2;
    } else if (a === '--budget-cap-usd') {
      flags.budgetCapUsd = Number(argv[i + 1]);
      i += 2;
    } else if (a === '--n') {
      flags.n = Number(argv[i + 1]);
      i += 2;
    } else {
      // Ignore unknown — keeps tsx invocations forgiving.
      i += 1;
    }
  }

  const dryRun = flags.dryRun ?? false;
  return {
    dryRun,
    outDir: flags.outDir ?? join(REPO_ROOT, 'benchmarks', 'results'),
    date: flags.date ?? new Date().toISOString().slice(0, 10),
    budgetCapUsd: flags.budgetCapUsd ?? (dryRun ? 1 : 30),
    n: flags.n ?? (dryRun ? 1 : 3),
  };
}

// ---------------------------------------------------------------------------
// Fenced-code parser — extracts the first ```tsx / ```jsx / ```ts / ```js
// fenced block. Falls back to the entire content as a single CodeFile when
// the model omits the fence (raw Claude sometimes does).
// ---------------------------------------------------------------------------

export function parseFencedCode(text: string): CodeFile[] {
  const fenceMatch = /```(?:tsx|jsx|ts|js)?\n([\s\S]*?)```/.exec(text);
  if (fenceMatch && fenceMatch[1] !== undefined) {
    return [{ path: 'Component.tsx', content: fenceMatch[1] }];
  }
  return [{ path: 'Component.tsx', content: text }];
}

// ---------------------------------------------------------------------------
// Saas-dashboard canonical DESIGN.md template — extracted verbatim from
// packages/atlas/shards/saas-dashboard.md lines 108-218 per spec-v3 §Arm A.
// ---------------------------------------------------------------------------

const SAAS_DASHBOARD_DESIGN_MD = `---
version: alpha
name: Atelier Phase 4 v3 Harness Project
description: SaaS dashboard for benchmark harness. Tokens favor density, status legibility, and WCAG AA contrast across light + dark.
colors:
  background: "#FAFAFA"
  foreground: "#18181B"
  card: "#FFFFFF"
  card-foreground: "#18181B"
  popover: "#FFFFFF"
  popover-foreground: "#18181B"
  muted: "#F4F4F5"
  muted-foreground: "#52525B"
  border: "#E4E4E7"
  input: "#E4E4E7"
  primary: "#4F46E5"
  primary-foreground: "#FFFFFF"
  secondary: "#F4F4F5"
  secondary-foreground: "#18181B"
  accent: "#F4F4F5"
  accent-foreground: "#18181B"
  destructive: "#E11D48"
  destructive-foreground: "#FFFFFF"
  ring: "#4F46E5"
  status-success: "#16A34A"
  status-warning: "#F59E0B"
  status-error: "#E11D48"
  status-info: "#0EA5E9"
  sidebar-background: "#F4F4F5"
  sidebar-foreground: "#18181B"
  sidebar-primary: "#4F46E5"
  sidebar-accent: "#E4E4E7"
typography:
  display:
    fontFamily: Inter
    fontSize: 1.875rem
    fontWeight: 600
    lineHeight: 2.25rem
  heading-page:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 2rem
  heading-section:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.75rem
  body:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.25rem
  caption:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1rem
  mono-sm:
    fontFamily: Geist Mono
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.25rem
spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  2xl: 3rem
rounded:
  sm: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    typography: "{typography.body-sm}"
    height: "2.25rem"
  data-table-row:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-sm}"
    padding: "{spacing.sm}"
---
`;

/** Scaffold the per-run Arm A project dir (tmpdir + DESIGN.md). */
export async function writeProjectDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'atelier-v3-arm-a-'));
  await writeFile(join(dir, 'DESIGN.md'), SAAS_DASHBOARD_DESIGN_MD, 'utf-8');
  return dir;
}

// ---------------------------------------------------------------------------
// Corpus loader.
// ---------------------------------------------------------------------------

async function loadFixture(id: string): Promise<Fixture> {
  const path = join(CORPUS_DIR, `${id}.json`);
  const raw = await readFile(path, 'utf-8');
  return JSON.parse(raw) as Fixture;
}

// ---------------------------------------------------------------------------
// Per-arm runners.
// ---------------------------------------------------------------------------

interface RunOutcome {
  initial_conformance: number | null;
  final_conformance: number | null;
  tokens: number;
  raw: number;
  iterations: number;
  duration_ms: number;
  cost_usd: number;
}

async function runArmA(
  brief: string,
  apiKey: string,
  projectDir: string,
): Promise<RunOutcome> {
  const start = Date.now();
  const agent = new Agent({ apiKey, iterate: 3, threshold: 0.95 });
  const result = await agent.run({ brief, cwd: projectDir });
  return {
    initial_conformance: result.iterations[0]?.conformance ?? null,
    final_conformance: result.scores.classify.conformance,
    tokens: result.scores.classify.tokens,
    raw: result.scores.classify.raw,
    iterations: result.iterations.length - 1,
    duration_ms: Date.now() - start,
    cost_usd: result.cost.usd,
  };
}

async function runArmB(brief: string, apiKey: string): Promise<RunOutcome> {
  const start = Date.now();
  const agent = new Agent({ apiKey, iterate: 3, threshold: 0.95 });
  const result = await agent.run({ brief });
  return {
    initial_conformance: result.iterations[0]?.conformance ?? null,
    final_conformance: result.scores.classify.conformance,
    tokens: result.scores.classify.tokens,
    raw: result.scores.classify.raw,
    iterations: result.iterations.length - 1,
    duration_ms: Date.now() - start,
    cost_usd: result.cost.usd,
  };
}

async function runArmC(brief: string, client: Anthropic): Promise<RunOutcome> {
  const start = Date.now();
  const response = await client.messages.create({
    model: RAW_C_MODEL,
    max_tokens: RAW_C_MAX_TOKENS,
    // NO system, NO temperature, NO top_p, NO top_k (CARL [OPUS-4-7] sampling policy).
    messages: [
      {
        role: 'user',
        content: `Build this React + Tailwind component:\n\n${brief}`,
      },
    ],
  });
  const text =
    response.content.find(
      (b: { type: string }): b is { type: 'text'; text: string } =>
        b.type === 'text',
    )?.text ?? '';
  const code = parseFencedCode(text);
  const concat = code.map((f) => f.content).join('\n');
  const score: ScoreResult = scoreText(concat);
  const cost = estimateUsd(
    response.model,
    response.usage.input_tokens,
    response.usage.output_tokens,
  );
  return {
    initial_conformance: score.conformance,
    final_conformance: score.conformance,
    tokens: score.tokens,
    raw: score.raw,
    iterations: 0,
    duration_ms: Date.now() - start,
    cost_usd: cost,
  };
}

// ---------------------------------------------------------------------------
// Checkpoint persistence.
// ---------------------------------------------------------------------------

function checkpointPath(outDir: string): string {
  return join(outDir, '.checkpoint-v3.json');
}

async function loadCheckpoint(
  outDir: string,
  specSha: string,
  n: number,
  budgetCapUsd: number,
): Promise<Checkpoint> {
  const path = checkpointPath(outDir);
  if (!existsSync(path)) {
    return {
      spec_sha: specSha,
      started_at: new Date().toISOString(),
      n,
      budget_cap_usd: budgetCapUsd,
      cumulative_cost_usd: 0,
      completed_runs: [],
    };
  }
  const raw = await readFile(path, 'utf-8');
  const ck = JSON.parse(raw) as Checkpoint;
  if (ck.spec_sha !== specSha || ck.n !== n) {
    // Mismatched run config — archive the old one and start fresh.
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const archived = join(outDir, `.checkpoint-v3-${ts}.json`);
    await rename(path, archived);
    return {
      spec_sha: specSha,
      started_at: new Date().toISOString(),
      n,
      budget_cap_usd: budgetCapUsd,
      cumulative_cost_usd: 0,
      completed_runs: [],
    };
  }
  return ck;
}

async function writeCheckpoint(outDir: string, ck: Checkpoint): Promise<void> {
  await mkdir(outDir, { recursive: true });
  await writeFile(checkpointPath(outDir), JSON.stringify(ck, null, 2), 'utf-8');
}

function isCompleted(
  ck: Checkpoint,
  fixture: string,
  arm: Arm,
  i: number,
): boolean {
  return ck.completed_runs.some(
    (r) => r.fixture === fixture && r.arm === arm && r.i === i,
  );
}

// ---------------------------------------------------------------------------
// Aggregation.
// ---------------------------------------------------------------------------

interface FixtureStats {
  initial_mean: number | null;
  initial_std: number;
  final_mean: number | null;
  final_std: number;
  tokens_total: number;
  raw_total: number;
  cost_usd_total: number;
  runs: number;
}

interface ArmAgg {
  initial: { mean: number; std: number; by_fixture: Record<string, number | null> };
  final: { mean: number; std: number; by_fixture: Record<string, number | null> };
  tokens_total: number;
  raw_total: number;
  cost_usd_total: number;
}

function meanStd(xs: number[]): { mean: number; std: number } {
  if (xs.length === 0) return { mean: 0, std: 0 };
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance =
    xs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / xs.length;
  return { mean, std: Math.sqrt(variance) };
}

function statsForFixtureArm(
  runs: CompletedRun[],
  fixture: string,
  arm: Arm,
): FixtureStats {
  const filtered = runs.filter((r) => r.fixture === fixture && r.arm === arm);
  const initials = filtered
    .map((r) => r.initial_conformance)
    .filter((v): v is number => v !== null);
  const finals = filtered
    .map((r) => r.final_conformance)
    .filter((v): v is number => v !== null);
  const i = meanStd(initials);
  const f = meanStd(finals);
  return {
    initial_mean: initials.length > 0 ? i.mean : null,
    initial_std: i.std,
    final_mean: finals.length > 0 ? f.mean : null,
    final_std: f.std,
    tokens_total: filtered.reduce((a, r) => a + r.tokens, 0),
    raw_total: filtered.reduce((a, r) => a + r.raw, 0),
    cost_usd_total: filtered.reduce((a, r) => a + r.cost_usd, 0),
    runs: filtered.length,
  };
}

function aggregateArm(
  runs: CompletedRun[],
  corpus: string[],
  arm: Arm,
): ArmAgg {
  const initialByFixture: Record<string, number | null> = {};
  const finalByFixture: Record<string, number | null> = {};
  let tokens = 0;
  let raw = 0;
  let cost = 0;
  for (const f of corpus) {
    const s = statsForFixtureArm(runs, f, arm);
    initialByFixture[f] = s.initial_mean;
    finalByFixture[f] = s.final_mean;
    tokens += s.tokens_total;
    raw += s.raw_total;
    cost += s.cost_usd_total;
  }
  const initialsForMean = Object.values(initialByFixture).filter(
    (v): v is number => v !== null,
  );
  const finalsForMean = Object.values(finalByFixture).filter(
    (v): v is number => v !== null,
  );
  const im = meanStd(initialsForMean);
  const fm = meanStd(finalsForMean);
  return {
    initial: { mean: im.mean, std: im.std, by_fixture: initialByFixture },
    final: { mean: fm.mean, std: fm.std, by_fixture: finalByFixture },
    tokens_total: tokens,
    raw_total: raw,
    cost_usd_total: cost,
  };
}

// ---------------------------------------------------------------------------
// Gate evaluation.
// ---------------------------------------------------------------------------

type Verdict = 'PASS' | 'PARTIAL' | 'FAIL';

interface Gates {
  primary: { value: number; threshold: number; verdict: Verdict };
  secondary: { value: number; threshold: number; verdict: 'PASS' | 'FAIL' };
  honesty_check: { value: number };
  user_experience: { value: number };
}

function evalGates(perArm: Record<Arm, ArmAgg>): Gates {
  const primaryDelta = perArm.A.initial.mean - perArm.C.initial.mean;
  let primaryVerdict: Verdict;
  if (primaryDelta >= PRIMARY_THRESHOLD) primaryVerdict = 'PASS';
  else if (primaryDelta >= PARTIAL_THRESHOLD) primaryVerdict = 'PARTIAL';
  else primaryVerdict = 'FAIL';

  const secondaryDelta = perArm.A.initial.mean - perArm.B.initial.mean;
  return {
    primary: {
      value: primaryDelta,
      threshold: PRIMARY_THRESHOLD,
      verdict: primaryVerdict,
    },
    secondary: {
      value: secondaryDelta,
      threshold: SECONDARY_THRESHOLD,
      verdict: secondaryDelta >= SECONDARY_THRESHOLD ? 'PASS' : 'FAIL',
    },
    honesty_check: { value: perArm.B.initial.mean - perArm.C.initial.mean },
    user_experience: { value: perArm.A.final.mean - perArm.C.initial.mean },
  };
}

// ---------------------------------------------------------------------------
// Output writers.
// ---------------------------------------------------------------------------

interface ResultDoc {
  spec_version: 3;
  spec_sha: string;
  date: string;
  n: number;
  corpus: string[];
  fresh_fixtures: string[];
  runs: CompletedRun[];
  per_arm: Record<Arm, ArmAgg>;
  gates: Gates;
  fresh_fixture_subset: Record<Arm, ArmAgg>;
  high_variance_fixtures: string[];
  partial: boolean;
  partial_reason?: string;
  cumulative_cost_usd: number;
}

function findHighVariance(runs: CompletedRun[], corpus: string[]): string[] {
  const out: string[] = [];
  for (const f of corpus) {
    for (const arm of ARMS) {
      const s = statsForFixtureArm(runs, f, arm);
      if (s.runs >= 2 && s.initial_std > HIGH_VARIANCE_THRESHOLD) {
        out.push(`${f} (arm ${arm}, std=${(s.initial_std * 100).toFixed(1)}pp)`);
        break;
      }
    }
  }
  return out;
}

function pp(n: number): string {
  return `${(n * 100).toFixed(1)}pp`;
}

function pct(n: number | null): string {
  if (n === null) return 'n/a';
  return `${(n * 100).toFixed(1)}%`;
}

function renderMarkdown(doc: ResultDoc): string {
  const verdict = doc.gates.primary.verdict;
  const lines: string[] = [];
  lines.push(`# Atelier Phase 4 Generative Benchmark v3 — ${doc.date}`);
  lines.push('');
  lines.push(
    `Pre-registered in \`benchmarks/spec-v3.md\`. Three-arm generative study; ` +
      `spec SHA: \`${doc.spec_sha.slice(0, 12)}\`; n=${doc.n} per fixture × ${doc.corpus.length} fixtures × 3 arms.`,
  );
  lines.push('');
  lines.push(`**Primary gate verdict: ${verdict}**`);
  if (doc.partial) {
    lines.push('');
    lines.push(
      `> NOTE: Run was \`partial: true\` — reason: ${doc.partial_reason ?? 'unknown'}. ` +
        `Cumulative spend: $${doc.cumulative_cost_usd.toFixed(4)}.`,
    );
  }
  lines.push('');

  lines.push('## Per-arm summary');
  lines.push('');
  lines.push(
    '| Arm | Initial mean | Initial std | Final mean | Final std | Tokens | Raw | Cost (USD) |',
  );
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const arm of ARMS) {
    const a = doc.per_arm[arm];
    lines.push(
      `| ${arm} | ${pct(a.initial.mean)} | ${pp(a.initial.std)} | ${pct(a.final.mean)} | ${pp(a.final.std)} | ${a.tokens_total} | ${a.raw_total} | $${a.cost_usd_total.toFixed(4)} |`,
    );
  }
  lines.push('');

  lines.push('## Gate evaluation');
  lines.push('');
  lines.push('| Comparison | Metric | Threshold | Value | Verdict |');
  lines.push('|---|---|---|---|---|');
  lines.push(
    `| Primary — A.initial vs C | absolute Δ | ≥ +${(PRIMARY_THRESHOLD * 100).toFixed(0)}pp | ${pp(doc.gates.primary.value)} | **${doc.gates.primary.verdict}** |`,
  );
  lines.push(
    `| Secondary — A.initial vs B | absolute Δ | ≥ +${(SECONDARY_THRESHOLD * 100).toFixed(0)}pp | ${pp(doc.gates.secondary.value)} | ${doc.gates.secondary.verdict} |`,
  );
  lines.push(
    `| Honesty — B vs C | absolute Δ | (any sign) | ${pp(doc.gates.honesty_check.value)} | -- |`,
  );
  lines.push(
    `| User experience — A.final vs C | absolute Δ | (report only) | ${pp(doc.gates.user_experience.value)} | -- |`,
  );
  lines.push('');

  lines.push('## Per-fixture × arm conformance (initial / final)');
  lines.push('');
  lines.push('| Fixture | A initial | A final | B initial | B final | C |');
  lines.push('|---|---|---|---|---|---|');
  for (const f of doc.corpus) {
    const a = doc.per_arm.A;
    const b = doc.per_arm.B;
    const c = doc.per_arm.C;
    lines.push(
      `| ${f} | ${pct(a.initial.by_fixture[f] ?? null)} | ${pct(a.final.by_fixture[f] ?? null)} | ${pct(b.initial.by_fixture[f] ?? null)} | ${pct(b.final.by_fixture[f] ?? null)} | ${pct(c.initial.by_fixture[f] ?? null)} |`,
    );
  }
  lines.push('');

  lines.push('## Fresh-fixture subset (5 authored against spec-v3)');
  lines.push('');
  lines.push(
    '| Arm | Initial mean | Final mean | Tokens | Raw | Cost (USD) |',
  );
  lines.push('|---|---|---|---|---|---|');
  for (const arm of ARMS) {
    const a = doc.fresh_fixture_subset[arm];
    lines.push(
      `| ${arm} | ${pct(a.initial.mean)} | ${pct(a.final.mean)} | ${a.tokens_total} | ${a.raw_total} | $${a.cost_usd_total.toFixed(4)} |`,
    );
  }
  lines.push('');

  lines.push('## High-variance fixtures');
  lines.push('');
  if (doc.high_variance_fixtures.length === 0) {
    lines.push('None — all per-fixture std-dev ≤ 10pp on the initial-conformance metric.');
  } else {
    for (const f of doc.high_variance_fixtures) {
      lines.push(`- ${f}`);
    }
    lines.push('');
    lines.push(
      'Per spec-v3 §Sample size, a v3.1 with n=5 is recommended on these fixtures (not blocking).',
    );
  }
  lines.push('');

  lines.push('## Cost snapshot');
  lines.push('');
  lines.push(`Total cumulative spend: **$${doc.cumulative_cost_usd.toFixed(4)}**.`);
  lines.push('');
  lines.push('| Arm | Cost (USD) | Share |');
  lines.push('|---|---|---|');
  const total = doc.cumulative_cost_usd || 1;
  for (const arm of ARMS) {
    const a = doc.per_arm[arm];
    lines.push(
      `| ${arm} | $${a.cost_usd_total.toFixed(4)} | ${((a.cost_usd_total / total) * 100).toFixed(1)}% |`,
    );
  }
  lines.push('');

  lines.push('## Caveats (v3-specific)');
  lines.push('');
  lines.push(
    '- All three arms use the same model (Sonnet 4.6). Whether the lift holds on Opus 4.7 or Haiku 4.5 is out of scope for v3 — that is a v3.1 sensitivity.',
  );
  lines.push(
    '- The DESIGN.md handed to Arm A is the saas-dashboard canonical template. Whether the lift holds on the other 7 build-category templates is out of scope for v3 — a v3.2 study could vary the template.',
  );
  lines.push(
    '- Briefs are written for the saas-dashboard / marketing-landing surfaces (the categories the agent\'s system prompt was tuned around). Cross-domain lift is not measured here.',
  );
  lines.push(
    '- All fixtures are still authored by one developer (Alex). External validation requires fork-and-rerun by an independent maintainer — same caveat as v1/v2.',
  );
  lines.push(
    '- The iterate loop in Arm A and B may converge at different rates per fixture; we report `iterations_used` to surface this.',
  );
  lines.push('');

  lines.push('## What this means for Phase 5');
  lines.push('');
  if (verdict === 'PASS') {
    lines.push(
      'The primary gate cleared at ' +
        `${pp(doc.gates.primary.value)}. The agent + DESIGN.md is the source of the lift, ` +
        'not project-hygiene confounding. Phase 5 (public launch + distribution) is unblocked on the v3 evidence.',
    );
  } else if (verdict === 'PARTIAL') {
    lines.push(
      'The primary gate fell into the PARTIAL band (' +
        `${pp(doc.gates.primary.value)}, between +20pp and +30pp). ` +
        'Published as a near-miss with full numbers. Phase 5 distribution proceeds with caveats; a v3.1 with refined methodology may be warranted.',
    );
  } else {
    lines.push(
      'The primary gate did not clear (' +
        `${pp(doc.gates.primary.value)} < +20pp). ` +
        'This is a publishable negative result. Either the system prompt is doing the work (check the honesty-check delta), or the calling shape needs revision (a dated `spec-v4.md` would be the correct response).',
    );
  }
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main harness.
// ---------------------------------------------------------------------------

export interface HarnessOptions {
  argv?: string[];
  apiKey?: string;
  /** Allow tests to inject a stubbed Anthropic client. Production: pass undefined. */
  client?: Anthropic;
  /** When set, suppresses stdout/stderr writes so tests stay quiet. */
  silent?: boolean;
}

export interface HarnessResult {
  exitCode: 0 | 1 | 2;
  doc: ResultDoc;
  jsonPath: string;
  mdPath: string;
}

function getSpecSha(): string {
  // execFileSync (no shell) is safe for fixed-arg git invocation.
  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    return sha || 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function runHarness(
  opts: HarnessOptions = {},
): Promise<HarnessResult> {
  const flags = parseFlags(opts.argv ?? process.argv.slice(2));
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'runner-v3: ANTHROPIC_API_KEY is required (pass via env or HarnessOptions.apiKey).',
    );
  }

  const log = (s: string) => {
    if (!opts.silent) process.stdout.write(s);
  };
  const logErr = (s: string) => {
    if (!opts.silent) process.stderr.write(s);
  };

  const corpus = flags.dryRun ? DRY_RUN_CORPUS : V3_CORPUS;
  const specSha = getSpecSha();
  await mkdir(flags.outDir, { recursive: true });

  const checkpoint = await loadCheckpoint(
    flags.outDir,
    specSha,
    flags.n,
    flags.budgetCapUsd,
  );
  // Always honor the latest budget cap requested at invocation; the cap is a
  // run-time control, not a fixed-at-startup property of the checkpoint.
  checkpoint.budget_cap_usd = flags.budgetCapUsd;

  const client = opts.client ?? new Anthropic({ apiKey });

  // Arm A scaffolds a fresh project dir per harness invocation.
  const armAProjectDir = await writeProjectDir();

  log(
    `\n=== Atelier Phase 4 v3 harness ===\n` +
      `dry-run: ${flags.dryRun}; n=${flags.n}; budget_cap=$${flags.budgetCapUsd.toFixed(2)}; ` +
      `out-dir=${flags.outDir}; date=${flags.date}; spec=${specSha.slice(0, 12)}\n` +
      `corpus: ${corpus.length} fixtures × 3 arms × ${flags.n} runs = ${corpus.length * 3 * flags.n} max generations\n\n`,
  );

  let partial = false;
  let partialReason: string | undefined;

  outer: for (const fixtureId of corpus) {
    let fixture: Fixture;
    try {
      fixture = await loadFixture(fixtureId);
    } catch (err) {
      logErr(`[${fixtureId}] failed to load fixture: ${String(err)}\n`);
      continue;
    }

    for (const arm of ARMS) {
      for (let i = 0; i < flags.n; i += 1) {
        if (isCompleted(checkpoint, fixtureId, arm, i)) continue;

        if (checkpoint.cumulative_cost_usd >= flags.budgetCapUsd) {
          partial = true;
          partialReason = 'budget-cap-reached';
          logErr(
            `\n[budget] cumulative $${checkpoint.cumulative_cost_usd.toFixed(4)} >= cap $${flags.budgetCapUsd.toFixed(2)} -- aborting.\n`,
          );
          break outer;
        }

        let outcome: RunOutcome | null = null;
        let errorMsg: string | undefined;
        try {
          if (arm === 'A') {
            outcome = await runArmA(fixture.brief, apiKey, armAProjectDir);
          } else if (arm === 'B') {
            outcome = await runArmB(fixture.brief, apiKey);
          } else {
            outcome = await runArmC(fixture.brief, client);
          }
        } catch (err) {
          errorMsg = err instanceof Error ? err.message : String(err);
          logErr(`[${fixtureId} arm=${arm} i=${i}] error: ${errorMsg}\n`);
        }

        const completed: CompletedRun = {
          fixture: fixtureId,
          arm,
          i,
          initial_conformance: outcome?.initial_conformance ?? null,
          final_conformance: outcome?.final_conformance ?? null,
          tokens: outcome?.tokens ?? 0,
          raw: outcome?.raw ?? 0,
          iterations: outcome?.iterations ?? 0,
          duration_ms: outcome?.duration_ms ?? 0,
          cost_usd: outcome?.cost_usd ?? 0,
          ...(errorMsg ? { error: errorMsg } : {}),
        };
        checkpoint.completed_runs.push(completed);
        checkpoint.cumulative_cost_usd += completed.cost_usd;
        await writeCheckpoint(flags.outDir, checkpoint);

        log(
          `[${fixtureId} arm=${arm} i=${i}] initial=${pct(completed.initial_conformance)} final=${pct(completed.final_conformance)} tokens=${completed.tokens} raw=${completed.raw} iter=${completed.iterations} cost=$${completed.cost_usd.toFixed(4)} cum=$${checkpoint.cumulative_cost_usd.toFixed(4)}\n`,
        );
      }
    }
  }

  // Aggregate.
  const perArm: Record<Arm, ArmAgg> = {
    A: aggregateArm(checkpoint.completed_runs, corpus, 'A'),
    B: aggregateArm(checkpoint.completed_runs, corpus, 'B'),
    C: aggregateArm(checkpoint.completed_runs, corpus, 'C'),
  };
  const freshCorpus = corpus.filter((id) => V3_FRESH_FIXTURES.has(id));
  const freshSubset: Record<Arm, ArmAgg> = {
    A: aggregateArm(checkpoint.completed_runs, freshCorpus, 'A'),
    B: aggregateArm(checkpoint.completed_runs, freshCorpus, 'B'),
    C: aggregateArm(checkpoint.completed_runs, freshCorpus, 'C'),
  };
  const gates = evalGates(perArm);
  const highVariance = findHighVariance(checkpoint.completed_runs, corpus);

  const doc: ResultDoc = {
    spec_version: 3,
    spec_sha: specSha,
    date: flags.date,
    n: flags.n,
    corpus,
    fresh_fixtures: freshCorpus,
    runs: checkpoint.completed_runs,
    per_arm: perArm,
    gates,
    fresh_fixture_subset: freshSubset,
    high_variance_fixtures: highVariance,
    partial,
    ...(partialReason ? { partial_reason: partialReason } : {}),
    cumulative_cost_usd: checkpoint.cumulative_cost_usd,
  };

  const jsonName = `${flags.date}-phase-4-v3.json`;
  const mdName = `${flags.date}-phase-4-v3.md`;
  const jsonPath = join(flags.outDir, jsonName);
  const mdPath = join(flags.outDir, mdName);
  await mkdir(dirname(jsonPath), { recursive: true });
  await writeFile(jsonPath, JSON.stringify(doc, null, 2), 'utf-8');
  await writeFile(mdPath, renderMarkdown(doc), 'utf-8');

  log(`\nResults written:\n  ${jsonPath}\n  ${mdPath}\n`);

  let exitCode: 0 | 1 | 2;
  if (partial) exitCode = 2;
  else if (gates.primary.verdict === 'FAIL') exitCode = 1;
  else exitCode = 0;

  return { exitCode, doc, jsonPath, mdPath };
}

// ---------------------------------------------------------------------------
// CLI entry — only when invoked directly, not when imported by the test file.
// ---------------------------------------------------------------------------

const isMain = (() => {
  try {
    const entry = process.argv[1];
    if (!entry) return false;
    return import.meta.url === new URL(`file://${entry}`).href;
  } catch {
    return false;
  }
})();

if (isMain) {
  runHarness()
    .then((res) => process.exit(res.exitCode))
    .catch((err) => {
      process.stderr.write(
        `runner-v3 crashed: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      process.exit(2);
    });
}
