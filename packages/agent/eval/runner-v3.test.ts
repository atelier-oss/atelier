/**
 * Phase 4.2 — three-arm v3 harness unit tests.
 *
 * The Anthropic SDK + @atelier-oss/atlas are mocked; node:fs/promises is real
 * so the harness writes its checkpoint + result artifacts to a per-test
 * tmpdir. No live API calls.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const mockMessageCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = vi.fn().mockImplementation(() => ({
    messages: { create: mockMessageCreate },
  }));
  return { default: MockAnthropic };
});

const MOCK_ATLAS_RESULT = {
  rootPath: '/fake/project',
  category: 'saas-dashboard' as const,
  ranking: [{ category: 'saas-dashboard' as const, score: 3, signals: [] }],
  exemplars: ['consult-ops', 'excerpa'],
  shardPath: null,
};

vi.mock('@atelier-oss/atlas', () => ({
  fingerprint: vi.fn().mockReturnValue(MOCK_ATLAS_RESULT),
}));

const TOKEN_HEAVY_TSX = `\`\`\`tsx
import * as React from 'react';
export default function Component() {
  return (
    <section className="bg-background text-foreground">
      <div className="bg-card border border-border rounded-lg">
        <h2 className="text-foreground">Title</h2>
        <p className="text-muted-foreground">Body</p>
        <button className="bg-primary text-primary-foreground">CTA</button>
      </div>
    </section>
  );
}
\`\`\``;

beforeEach(() => {
  mockMessageCreate.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. parseFencedCode unit tests.
// ---------------------------------------------------------------------------

describe('parseFencedCode', () => {
  it('extracts a ```tsx fenced block', async () => {
    const { parseFencedCode } = await import('./runner-v3');
    const input = 'preamble\n```tsx\nconst a = 1;\n```\ntrailing';
    const out = parseFencedCode(input);
    expect(out).toHaveLength(1);
    expect(out[0]?.path).toBe('Component.tsx');
    expect(out[0]?.content).toBe('const a = 1;\n');
  });

  it('extracts a ```jsx fenced block', async () => {
    const { parseFencedCode } = await import('./runner-v3');
    const input = '```jsx\nconst b = 2;\n```';
    const out = parseFencedCode(input);
    expect(out[0]?.content).toBe('const b = 2;\n');
  });

  it('extracts an unlabeled ``` fenced block', async () => {
    const { parseFencedCode } = await import('./runner-v3');
    const input = '```\nconst c = 3;\n```';
    const out = parseFencedCode(input);
    expect(out[0]?.content).toBe('const c = 3;\n');
  });

  it('falls back to the entire content when no fence is present', async () => {
    const { parseFencedCode } = await import('./runner-v3');
    const input = 'export default function Foo() { return null; }';
    const out = parseFencedCode(input);
    expect(out).toHaveLength(1);
    expect(out[0]?.content).toBe(input);
  });
});

// ---------------------------------------------------------------------------
// 2. Budget kill-switch fires after the first run when cap is tight.
// ---------------------------------------------------------------------------

describe('budget kill-switch', () => {
  it('aborts after the first run when cumulative cost exceeds the cap; exit code 2', async () => {
    // High-cost response: 50K input + 50K output → ~$0.90 on Sonnet 4.6
    // (input $3/M + output $15/M). One run will exceed a $0.01 cap.
    mockMessageCreate.mockResolvedValue({
      content: [{ type: 'text', text: TOKEN_HEAVY_TSX }],
      usage: { input_tokens: 50000, output_tokens: 50000 },
      model: 'claude-sonnet-4-6',
    });

    const outDir = await mkdtemp(join(tmpdir(), 'atelier-v3-test-'));
    try {
      const { runHarness } = await import('./runner-v3');
      const res = await runHarness({
        argv: [
          '--dry-run',
          '--out-dir',
          outDir,
          '--date',
          '2099-01-01',
          '--budget-cap-usd',
          '0.01',
          '--n',
          '1',
        ],
        apiKey: 'test-key',
        silent: true,
      });

      // Cumulative cost should jump well past $0.01 after the first run.
      expect(res.doc.cumulative_cost_usd).toBeGreaterThan(0.01);
      // Partial flag set, kill-switch reason recorded.
      expect(res.doc.partial).toBe(true);
      expect(res.doc.partial_reason).toBe('budget-cap-reached');
      // Exit code 2 = budget overrun.
      expect(res.exitCode).toBe(2);
      // We should have completed exactly 1 run before the kill-switch fired
      // on the next iteration (cap is checked at top of inner loop).
      expect(res.doc.runs.length).toBe(1);

      // Confirm both artifacts were written.
      const jsonRaw = await readFile(res.jsonPath, 'utf-8');
      expect(JSON.parse(jsonRaw).partial).toBe(true);
      const md = await readFile(res.mdPath, 'utf-8');
      expect(md).toContain('partial: true');
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Checkpoint resume — pre-populated entries are skipped.
// ---------------------------------------------------------------------------

describe('checkpoint resume', () => {
  it('skips fixture/arm/i tuples already recorded in the checkpoint', async () => {
    const { execFileSync } = await import('node:child_process');
    // Match what the harness will compute internally so spec_sha lines up.
    const repoRoot = join(__dirname, '..', '..', '..');
    let specSha = 'unknown';
    try {
      specSha = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .toString()
        .trim();
    } catch {
      specSha = 'unknown';
    }

    const outDir = await mkdtemp(join(tmpdir(), 'atelier-v3-test-'));
    try {
      // Pre-populate the checkpoint with one completed run for fixture
      // 01-pricing-tiers, arm A, i=0.
      const ckPath = join(outDir, '.checkpoint-v3.json');
      await mkdir(outDir, { recursive: true });
      await writeFile(
        ckPath,
        JSON.stringify(
          {
            spec_sha: specSha,
            started_at: '2099-01-01T00:00:00.000Z',
            n: 1,
            budget_cap_usd: 1,
            cumulative_cost_usd: 0.005,
            completed_runs: [
              {
                fixture: '01-pricing-tiers',
                arm: 'A',
                i: 0,
                initial_conformance: 0.85,
                final_conformance: 1.0,
                tokens: 31,
                raw: 0,
                iterations: 2,
                duration_ms: 12345,
                cost_usd: 0.005,
              },
            ],
          },
          null,
          2,
        ),
        'utf-8',
      );

      // Each subsequent generation returns a low-cost stub. Cap is high
      // enough that the budget kill-switch never fires.
      mockMessageCreate.mockResolvedValue({
        content: [{ type: 'text', text: TOKEN_HEAVY_TSX }],
        usage: { input_tokens: 100, output_tokens: 200 },
        model: 'claude-sonnet-4-6',
      });

      const { runHarness } = await import('./runner-v3');
      const res = await runHarness({
        argv: [
          '--dry-run',
          '--out-dir',
          outDir,
          '--date',
          '2099-01-01',
          '--budget-cap-usd',
          '5',
          '--n',
          '1',
        ],
        apiKey: 'test-key',
        silent: true,
      });

      // The pre-populated run for (01-pricing-tiers, A, 0) is preserved
      // and was NOT re-executed. Total runs = pre-populated 1 + new ones.
      const armA01 = res.doc.runs.filter(
        (r) => r.fixture === '01-pricing-tiers' && r.arm === 'A',
      );
      expect(armA01).toHaveLength(1);
      // The pre-populated values must be preserved verbatim — proves the
      // skip happened, not a re-execute.
      expect(armA01[0]?.tokens).toBe(31);
      expect(armA01[0]?.duration_ms).toBe(12345);
      expect(armA01[0]?.iterations).toBe(2);

      // Dry-run corpus has 5 fixtures × 3 arms × n=1 = 15 expected slots.
      // One was already done, so mockMessageCreate is called for the rest.
      // (Each agent run = 1 generate call when iterate converges on first
      //  pass, but the iterate pipeline can call up to 4× for arm A/B —
      //  so we just assert no re-exec on the pre-populated tuple, not the
      //  exact call count.)
      expect(res.doc.runs.length).toBeGreaterThanOrEqual(15);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});
