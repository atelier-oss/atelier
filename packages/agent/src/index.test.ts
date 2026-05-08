/**
 * Phase 0 + Phase 1 + Phase 2 unit tests for @atelier-oss/agent.
 *
 * Anthropic SDK is mocked — these tests run offline. The eval/runner.ts
 * harness exercises the live API (separate gate, kicked off manually).
 *
 * Phase 2 mocks:
 *   - @atelier-oss/atlas fingerprint() returns a deterministic AtlasResult.
 *   - node:fs/promises readFile() returns a tiny PNG buffer so screenshot
 *     loading never touches disk.
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

// --- Phase 2 mocks ---

// Minimal 1x1 transparent PNG (67 bytes), base64-safe to encode.
const TINY_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(TINY_PNG_BUFFER),
}));

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

// -------------------------------------------------------------------------

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

describe('Agent.run() — Phase 2 screenshot input', () => {
  it('passes an image content block when screenshot path is provided', async () => {
    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: TOKEN_HEAVY_TSX }],
      usage: { input_tokens: 200, output_tokens: 340 },
      model: 'claude-sonnet-4-6',
    });

    const { Agent } = await import('./index');
    const agent = new Agent({ apiKey: 'test-key', iterate: 0 });
    await agent.run({
      brief: 'dashboard card',
      screenshot: '/fake/screenshot.png',
    });

    expect(mockMessageCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockMessageCreate.mock.calls[0]?.[0] ?? {};

    // The user message content must be an array (not a plain string).
    const userMessage = callArgs.messages?.[0];
    expect(Array.isArray(userMessage?.content)).toBe(true);

    // First element is the image block.
    const [imageBlock, textBlock] = userMessage?.content ?? [];
    expect(imageBlock?.type).toBe('image');
    expect(imageBlock?.source?.type).toBe('base64');
    expect(imageBlock?.source?.media_type).toBe('image/png');
    expect(typeof imageBlock?.source?.data).toBe('string');
    expect(imageBlock?.source?.data.length).toBeGreaterThan(0);

    // Second element is the text block.
    expect(textBlock?.type).toBe('text');
    expect(typeof textBlock?.text).toBe('string');
    // The text brief should mention the screenshot.
    expect(textBlock?.text).toContain('reference screenshot');
  });

  it('sends a plain string content when no screenshot is provided (backwards compat)', async () => {
    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: TOKEN_HEAVY_TSX }],
      usage: { input_tokens: 100, output_tokens: 200 },
      model: 'claude-sonnet-4-6',
    });

    const { Agent } = await import('./index');
    const agent = new Agent({ apiKey: 'test-key', iterate: 0 });
    await agent.run({ brief: 'pricing page' });

    const callArgs = mockMessageCreate.mock.calls[0]?.[0] ?? {};
    const userMessage = callArgs.messages?.[0];
    // Plain string when no screenshot.
    expect(typeof userMessage?.content).toBe('string');
  });
});

describe('Agent.run() — Phase 2 atlas fingerprint context', () => {
  it('augments the system prompt with project-context preamble when cwd resolves a category', async () => {
    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: TOKEN_HEAVY_TSX }],
      usage: { input_tokens: 150, output_tokens: 300 },
      model: 'claude-sonnet-4-6',
    });

    const { Agent } = await import('./index');
    const agent = new Agent({ apiKey: 'test-key', iterate: 0 });
    await agent.run({ brief: 'sidebar nav', cwd: '/fake/project' });

    const callArgs = mockMessageCreate.mock.calls[0]?.[0] ?? {};
    // System prompt should contain the project context preamble.
    expect(typeof callArgs.system).toBe('string');
    expect(callArgs.system).toContain('## Project context');
    expect(callArgs.system).toContain('saas-dashboard');
    // Original system prompt content should still be present.
    expect(callArgs.system).toContain('Token discipline');
  });

  it('does not augment the system prompt when atlas returns no category (graceful fallback)', async () => {
    const { fingerprint } = await import('@atelier-oss/atlas');
    vi.mocked(fingerprint).mockReturnValueOnce({
      rootPath: '/fake/unknown',
      category: null,
      ranking: [],
      exemplars: [],
      shardPath: null,
    });

    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: TOKEN_HEAVY_TSX }],
      usage: { input_tokens: 100, output_tokens: 200 },
      model: 'claude-sonnet-4-6',
    });

    const { Agent } = await import('./index');
    const agent = new Agent({ apiKey: 'test-key', iterate: 0 });
    await agent.run({ brief: 'generic component', cwd: '/fake/unknown' });

    const callArgs = mockMessageCreate.mock.calls[0]?.[0] ?? {};
    // System prompt should be the bare SYSTEM_PROMPT — no preamble.
    expect(callArgs.system).not.toContain('## Project context');
    // Token discipline content should still be present.
    expect(callArgs.system).toContain('Token discipline');
  });

  it('records atlasCategory in the intake and generate trace notes when cwd resolves', async () => {
    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: TOKEN_HEAVY_TSX }],
      usage: { input_tokens: 100, output_tokens: 200 },
      model: 'claude-sonnet-4-6',
    });

    const { Agent } = await import('./index');
    const agent = new Agent({ apiKey: 'test-key', iterate: 0 });
    const result = await agent.run({ brief: 'data table', cwd: '/fake/project' });

    const intakeEntry = result.trace.find((t) => t.phase === 'intake');
    expect(intakeEntry?.notes?.atlasCategory).toBe('saas-dashboard');

    const generateEntry = result.trace.find((t) => t.phase === 'generate');
    expect(generateEntry?.notes?.atlasCategory).toBe('saas-dashboard');
  });
});
