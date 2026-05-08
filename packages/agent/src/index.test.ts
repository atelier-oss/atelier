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

describe('Agent.run() — Phase 0 shape', () => {
  it('returns { code, scores, trace, cost } for a token-heavy generation', async () => {
    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: TOKEN_HEAVY_TSX }],
      usage: { input_tokens: 120, output_tokens: 340 },
      model: 'claude-sonnet-4-6',
    });

    const { Agent } = await import('./index');
    const agent = new Agent({ apiKey: 'test-key' });
    const result = await agent.run({ brief: 'pricing page with three tiers' });

    expect(result.code).toHaveLength(1);
    expect(result.code[0]?.path).toMatch(/\.tsx$/);
    expect(result.code[0]?.content).toContain('export default function');
    expect(result.code[0]?.content).toContain('bg-background');

    expect(result.scores.classify).toBeDefined();
    expect(result.scores.classify.tokens).toBeGreaterThan(0);
    expect(result.scores.classify.conformance).toBeGreaterThanOrEqual(0.5);

    expect(result.trace).toHaveLength(4);
    expect(result.trace.map((t) => t.phase)).toEqual([
      'intake',
      'generate',
      'verify',
      'deliver',
    ]);
    for (const entry of result.trace) {
      expect(entry.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(entry.durationMs).toBeGreaterThanOrEqual(0);
    }

    expect(result.cost.input_tokens).toBe(120);
    expect(result.cost.output_tokens).toBe(340);
    expect(result.cost.usd).toBeGreaterThan(0);
  });

  it('returns a low conformance score for raw-palette-heavy code', async () => {
    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: RAW_HEAVY_TSX }],
      usage: { input_tokens: 80, output_tokens: 60 },
      model: 'claude-sonnet-4-6',
    });

    const { Agent } = await import('./index');
    const agent = new Agent({ apiKey: 'test-key' });
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
    const agent = new Agent({ apiKey: 'test-key' });
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
    const agent = new Agent({ apiKey: 'test-key' });
    await agent.run({ brief: 'anything' });

    const callArgs = mockMessageCreate.mock.calls[0]?.[0] ?? {};
    expect(callArgs).not.toHaveProperty('temperature');
    expect(callArgs).not.toHaveProperty('top_p');
    expect(callArgs).not.toHaveProperty('top_k');
  });
});
