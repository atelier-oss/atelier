/**
 * Phase 0 unit tests for @atelier-oss/agent.
 *
 * Anthropic SDK is mocked — these tests run offline. The eval/runner.ts
 * harness exercises the live API (separate gate, kicked off manually).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockMessageCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = vi.fn().mockImplementation(() => ({
    messages: {
      create: mockMessageCreate,
    },
  }));
  return { default: MockAnthropic };
});

const TOKEN_HEAVY_TSX = `\`\`\`tsx
import * as React from 'react';

export default function PricingTiers() {
  return (
    <section className="bg-background text-foreground">
      <div className="bg-card border border-border rounded-lg">
        <h2 className="text-foreground">Starter</h2>
        <p className="text-muted-foreground">For solo projects</p>
        <button className="bg-primary text-primary-foreground">Get started</button>
      </div>
      <div className="bg-card border border-border rounded-lg ring-2 ring-ring">
        <h2 className="text-foreground">Pro</h2>
        <p className="text-muted-foreground">For growing teams</p>
        <button className="bg-primary text-primary-foreground">Get started</button>
      </div>
      <div className="bg-card border border-border rounded-lg">
        <h2 className="text-foreground">Enterprise</h2>
        <p className="text-muted-foreground">For organizations</p>
        <button className="bg-accent text-accent-foreground">Contact sales</button>
      </div>
    </section>
  );
}
\`\`\``;

const RAW_HEAVY_TSX = `\`\`\`tsx
export default function BadButton() {
  return (
    <button className="bg-zinc-900 text-zinc-50 hover:bg-zinc-800 border border-zinc-200">
      Save
    </button>
  );
}
\`\`\``;

beforeEach(() => {
  mockMessageCreate.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('Agent.run() — pipeline shape (Phase 0 + Phase 1)', () => {
  it('returns { code, scores, trace, cost, iterations } for a token-heavy generation', async () => {
    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: TOKEN_HEAVY_TSX }],
      usage: { input_tokens: 120, output_tokens: 340 },
      model: 'claude-sonnet-4-6',
    });

    const { Agent } = await import('./index');
    // iterate=0 disables the loop — pure Phase 0 shape, single API call.
    const agent = new Agent({ apiKey: 'test-key', iterate: 0 });
    const result = await agent.run({ brief: 'pricing page with three tiers' });

    expect(result.code).toHaveLength(1);
    expect(result.code[0]?.path).toMatch(/\.tsx$/);
    expect(result.code[0]?.content).toContain('export default function');
    expect(result.code[0]?.content).toContain('bg-background');

    expect(result.scores.classify).toBeDefined();
    expect(result.scores.classify.tokens).toBeGreaterThan(0);
    expect(result.scores.classify.conformance).toBeGreaterThanOrEqual(0.5);

    // Phase 1 adds an 'iterate' phase entry between verify and deliver.
    expect(result.trace).toHaveLength(5);
    expect(result.trace.map((t) => t.phase)).toEqual([
      'intake',
      'generate',
      'verify',
      'iterate',
      'deliver',
    ]);
    for (const entry of result.trace) {
      expect(entry.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(entry.durationMs).toBeGreaterThanOrEqual(0);
    }

    // iterate=0 still records the initial iteration (n=0) for trace continuity.
    expect(result.iterations).toHaveLength(1);
    expect(result.iterations[0]?.n).toBe(0);

    expect(result.cost.input_tokens).toBe(120);
    expect(result.cost.output_tokens).toBe(340);
    expect(result.cost.usd).toBeGreaterThan(0);
  });

  it('returns a low conformance score for raw-palette-heavy code with iterate=0', async () => {
    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: RAW_HEAVY_TSX }],
      usage: { input_tokens: 80, output_tokens: 60 },
      model: 'claude-sonnet-4-6',
    });

    const { Agent } = await import('./index');
    const agent = new Agent({ apiKey: 'test-key', iterate: 0 });
    const result = await agent.run({ brief: 'a button' });

    expect(result.scores.classify.raw).toBeGreaterThan(0);
    expect(result.scores.classify.conformance ?? 1).toBeLessThan(0.5);
  });

  it('throws a clear error when the brief is empty', async () => {
    const { Agent } = await import('./index');
    const agent = new Agent({ apiKey: 'test-key' });
    await expect(agent.run({ brief: '' })).rejects.toThrow(/brief/i);
  });

  it('throws when ANTHROPIC_API_KEY is not provided in env or opts', async () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const { Agent } = await import('./index');
      expect(() => new Agent()).toThrow(/ANTHROPIC_API_KEY/);
    } finally {
      if (prev !== undefined) process.env.ANTHROPIC_API_KEY = prev;
    }
  });

  it('uses claude-sonnet-4-6 by default and respects model overrides', async () => {
    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: TOKEN_HEAVY_TSX }],
      usage: { input_tokens: 1, output_tokens: 1 },
      model: 'claude-sonnet-4-6',
    });

    const { Agent } = await import('./index');
    const agent = new Agent({ apiKey: 'test-key', iterate: 0 });
    await agent.run({ brief: 'anything' });

    expect(mockMessageCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-sonnet-4-6' }),
    );

    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: TOKEN_HEAVY_TSX }],
      usage: { input_tokens: 1, output_tokens: 1 },
      model: 'claude-opus-4-7',
    });

    const opusAgent = new Agent({
      apiKey: 'test-key',
      iterate: 0,
      models: { codegen: 'claude-opus-4-7' },
    });
    await opusAgent.run({ brief: 'anything' });

    expect(mockMessageCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({ model: 'claude-opus-4-7' }),
    );
  });

  it('does not pass temperature, top_p, or top_k (CARL [OPUS-4-7] sampling policy)', async () => {
    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: TOKEN_HEAVY_TSX }],
      usage: { input_tokens: 1, output_tokens: 1 },
      model: 'claude-sonnet-4-6',
    });

    const { Agent } = await import('./index');
    const agent = new Agent({ apiKey: 'test-key', iterate: 0 });
    await agent.run({ brief: 'anything' });

    const callArgs = mockMessageCreate.mock.calls[0]?.[0] ?? {};
    expect(callArgs).not.toHaveProperty('temperature');
    expect(callArgs).not.toHaveProperty('top_p');
    expect(callArgs).not.toHaveProperty('top_k');
  });
});

describe('Agent.run() — Phase 1 iteration loop', () => {
  it('short-circuits the loop when initial conformance >= threshold', async () => {
    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: TOKEN_HEAVY_TSX }],
      usage: { input_tokens: 100, output_tokens: 200 },
      model: 'claude-sonnet-4-6',
    });

    const { Agent } = await import('./index');
    const agent = new Agent({ apiKey: 'test-key', iterate: 3, threshold: 0.95 });
    const result = await agent.run({ brief: 'anything' });

    // Token-heavy fixture is 100% conformance — should short-circuit.
    expect(mockMessageCreate).toHaveBeenCalledTimes(1);
    expect(result.iterations).toHaveLength(1);
    expect(result.iterations[0]?.n).toBe(0);
    expect(result.scores.classify.conformance).toBe(1);
  });

  it('triggers rewrite passes when initial conformance < threshold and recovers', async () => {
    // Initial: raw-heavy, will fail threshold.
    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: RAW_HEAVY_TSX }],
      usage: { input_tokens: 80, output_tokens: 60 },
      model: 'claude-sonnet-4-6',
    });
    // Iteration 1: model returns clean tokenized version.
    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: TOKEN_HEAVY_TSX }],
      usage: { input_tokens: 200, output_tokens: 250 },
      model: 'claude-sonnet-4-6',
    });

    const { Agent } = await import('./index');
    const agent = new Agent({ apiKey: 'test-key', iterate: 3, threshold: 0.95 });
    const result = await agent.run({ brief: 'a button' });

    expect(mockMessageCreate).toHaveBeenCalledTimes(2);
    expect(result.iterations).toHaveLength(2); // n=0 (initial) + n=1 (rewrite)
    expect(result.iterations[0]?.conformance).toBe(0); // raw-heavy initial
    expect(result.iterations[1]?.conformance).toBe(1); // recovered

    // BEST score is returned, not the most-recent.
    expect(result.scores.classify.conformance).toBe(1);
    expect(result.code[0]?.content).toContain('bg-background');

    // Total cost rolls up both API calls.
    expect(result.cost.input_tokens).toBe(280); // 80 + 200
    expect(result.cost.output_tokens).toBe(310); // 60 + 250
  });

  it('caps at maxIterations when threshold is never met', async () => {
    // Initial + 3 rewrites all return raw-heavy code; never clears 0.95.
    for (let i = 0; i < 4; i++) {
      mockMessageCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: RAW_HEAVY_TSX }],
        usage: { input_tokens: 80, output_tokens: 60 },
        model: 'claude-sonnet-4-6',
      });
    }

    const { Agent } = await import('./index');
    const agent = new Agent({ apiKey: 'test-key', iterate: 3, threshold: 0.95 });
    const result = await agent.run({ brief: 'a button' });

    // 1 initial + 3 rewrites = 4 calls.
    expect(mockMessageCreate).toHaveBeenCalledTimes(4);
    expect(result.iterations).toHaveLength(4); // n=0..3
    expect(result.iterations.map((r) => r.n)).toEqual([0, 1, 2, 3]);
    expect(result.scores.classify.conformance ?? 1).toBeLessThan(0.95);
  });

  it('returns BEST emission seen across iterations, not the last', async () => {
    // Initial: raw-heavy (0%).
    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: RAW_HEAVY_TSX }],
      usage: { input_tokens: 80, output_tokens: 60 },
      model: 'claude-sonnet-4-6',
    });
    // Iteration 1: clean (100%).
    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: TOKEN_HEAVY_TSX }],
      usage: { input_tokens: 200, output_tokens: 250 },
      model: 'claude-sonnet-4-6',
    });
    // Iteration 2: model regresses to raw-heavy. Should NOT overwrite the best.
    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: RAW_HEAVY_TSX }],
      usage: { input_tokens: 100, output_tokens: 60 },
      model: 'claude-sonnet-4-6',
    });

    const { Agent } = await import('./index');
    // threshold above 1.0 forces all iterations to run.
    const agent = new Agent({ apiKey: 'test-key', iterate: 2, threshold: 2.0 });
    const result = await agent.run({ brief: 'a button' });

    // Best seen was iteration 1 (100%), not iteration 2 (0%).
    expect(result.scores.classify.conformance).toBe(1);
    expect(result.code[0]?.content).toContain('bg-background');
    expect(result.iterations).toHaveLength(3); // n=0, 1, 2
  });

  it('stops gracefully on rewrite API errors and keeps best so far', async () => {
    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: RAW_HEAVY_TSX }],
      usage: { input_tokens: 80, output_tokens: 60 },
      model: 'claude-sonnet-4-6',
    });
    mockMessageCreate.mockRejectedValueOnce(new Error('rate-limited'));

    const { Agent } = await import('./index');
    const agent = new Agent({ apiKey: 'test-key', iterate: 3, threshold: 0.95 });
    const result = await agent.run({ brief: 'a button' });

    // Initial + 1 failed rewrite, then break.
    expect(mockMessageCreate).toHaveBeenCalledTimes(2);
    // No crash — the failed iteration is recorded with the prior score.
    expect(result.iterations).toHaveLength(2);
    expect(result.scores.classify.raw).toBeGreaterThan(0);
  });
});
