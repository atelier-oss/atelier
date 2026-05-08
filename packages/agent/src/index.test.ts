/**
 * Phase 0 + Phase 1 + Phase 2 + Phase 3a unit tests for @atelier-oss/agent.
 *
 * Anthropic SDK is mocked -- these tests run offline. The eval/runner.ts
 * harness exercises the live API (separate gate, kicked off manually).
 *
 * Phase 2 mocks:
 *   - @atelier-oss/atlas fingerprint() returns a deterministic AtlasResult.
 *   - node:fs/promises readFile() returns a tiny PNG buffer so screenshot
 *     loading never touches disk.
 *
 * Phase 3a mocks:
 *   - global.fetch is stubbed via vi.stubGlobal() to return deterministic
 *     Figma API responses. Reset via vi.unstubAllGlobals() in afterEach.
 *     No live API calls are made.
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
  // stat() is used by loadScreenshot() for the 20MB size guard.
  stat: vi.fn().mockResolvedValue({ size: TINY_PNG_BUFFER.length }),
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

// --- Phase 3a mock Figma API responses ---

const MOCK_FIGMA_VARIABLES_RESPONSE = {
  meta: {
    variables: {
      'var1': {
        name: 'color/primary',
        resolvedType: 'COLOR',
        valuesByMode: {
          mode1: { r: 0.957, g: 0.482, b: 0.125, a: 1 },
        },
      },
      'var2': {
        name: 'color/background',
        resolvedType: 'COLOR',
        valuesByMode: {
          mode1: { r: 0.98, g: 0.98, b: 0.98, a: 1 },
        },
      },
      'var3': {
        name: 'color/text-primary',
        resolvedType: 'COLOR',
        valuesByMode: {
          mode1: { r: 0.094, g: 0.094, b: 0.106, a: 1 },
        },
      },
      'var4': {
        name: 'spacing/4',
        resolvedType: 'FLOAT',
        valuesByMode: { mode1: 16 },
      },
    },
  },
};

const MOCK_FIGMA_STYLES_RESPONSE = {
  meta: {
    styles: [
      { key: 's1', name: 'Primary/500', style_type: 'FILL' },
      { key: 's2', name: 'Heading/H1', style_type: 'TEXT' },
    ],
  },
};

const MOCK_FIGMA_FILE_RESPONSE = {
  name: 'Acme Brand System',
};

/** Build a fetch mock that returns Figma API responses for all three endpoints. */
function makeFigmaFetchMock(fileKey: string) {
  return vi.fn().mockImplementation((url: string) => {
    const urlStr = String(url);
    let body: unknown;

    if (urlStr.includes('/variables/local')) {
      body = MOCK_FIGMA_VARIABLES_RESPONSE;
    } else if (urlStr.includes('/styles')) {
      body = MOCK_FIGMA_STYLES_RESPONSE;
    } else if (urlStr.includes(`/files/${fileKey}`)) {
      body = MOCK_FIGMA_FILE_RESPONSE;
    } else {
      body = {};
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
    });
  });
}

// -------------------------------------------------------------------------

beforeEach(() => {
  mockMessageCreate.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('Agent.run() -- pipeline shape (Phase 0 + Phase 1)', () => {
  it('returns { code, scores, trace, cost, iterations } for a token-heavy generation', async () => {
    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: TOKEN_HEAVY_TSX }],
      usage: { input_tokens: 120, output_tokens: 340 },
      model: 'claude-sonnet-4-6',
    });

    const { Agent } = await import('./index');
    // iterate=0 disables the loop -- pure Phase 0 shape, single API call.
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

describe('Agent.run() -- Phase 1 iteration loop', () => {
  it('short-circuits the loop when initial conformance >= threshold', async () => {
    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: TOKEN_HEAVY_TSX }],
      usage: { input_tokens: 100, output_tokens: 200 },
      model: 'claude-sonnet-4-6',
    });

    const { Agent } = await import('./index');
    const agent = new Agent({ apiKey: 'test-key', iterate: 3, threshold: 0.95 });
    const result = await agent.run({ brief: 'anything' });

    // Token-heavy fixture is 100% conformance -- should short-circuit.
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
    // No crash -- the failed iteration is recorded with the prior score.
    expect(result.iterations).toHaveLength(2);
    expect(result.scores.classify.raw).toBeGreaterThan(0);
  });
});

describe('Agent.run() -- Phase 2 screenshot input', () => {
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

describe('Agent.run() -- Phase 2 atlas fingerprint context', () => {
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
    // System prompt should be the bare SYSTEM_PROMPT -- no preamble.
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

// =========================================================================
// Phase 3a -- Figma REST adapter unit tests
// =========================================================================

describe('extractFileKey', () => {
  it('handles a raw alphanumeric key', async () => {
    const { extractFileKey } = await import('./adapters/figma');
    expect(extractFileKey('ABC123xyzREALISTIC22')).toBe('ABC123xyzREALISTIC22');
  });

  it('handles a /file/ URL', async () => {
    const { extractFileKey } = await import('./adapters/figma');
    expect(
      extractFileKey('https://www.figma.com/file/AbCdEfGhIjKlMnOpQrSt12/My-Design-File'),
    ).toBe('AbCdEfGhIjKlMnOpQrSt12');
  });

  it('handles a /design/ URL (new Figma URL format)', async () => {
    const { extractFileKey } = await import('./adapters/figma');
    expect(
      extractFileKey('https://www.figma.com/design/XYZ999/Acme-Brand?node-id=0%3A1'),
    ).toBe('XYZ999');
  });

  it('throws on malformed input', async () => {
    const { extractFileKey } = await import('./adapters/figma');
    expect(() => extractFileKey('not-a-valid-key!')).toThrow(/file key/i);
    expect(() => extractFileKey('')).toThrow(/file key/i);
    expect(() => extractFileKey('https://example.com/not-figma')).toThrow(/file key/i);
  });
});

describe('loadFigmaContext', () => {
  it('fetches both endpoints with X-Figma-Token header', async () => {
    const mockFetch = makeFigmaFetchMock('TESTKEYABCDEFGHIJKLMNO');
    vi.stubGlobal('fetch', mockFetch);

    const { loadFigmaContext } = await import('./adapters/figma');
    await loadFigmaContext('TESTKEYABCDEFGHIJKLMNO', 'my-token');

    // Should have made 3 calls: variables, styles, and file metadata.
    expect(mockFetch).toHaveBeenCalledTimes(3);

    // Every call must include the X-Figma-Token header.
    for (const call of mockFetch.mock.calls) {
      const [, init] = call as [string, RequestInit];
      expect((init?.headers as Record<string, string>)?.['X-Figma-Token']).toBe('my-token');
    }

    // Verify the endpoints called.
    const urls = mockFetch.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(urls.some((u: string) => u.includes('/variables/local'))).toBe(true);
    expect(urls.some((u: string) => u.includes('/styles'))).toBe(true);
    expect(urls.some((u: string) => u.includes('/files/TESTKEYABCDEFGHIJKLMNO'))).toBe(true);
  });

  it('normalizes RGBA floats to hex correctly', async () => {
    const mockFetch = makeFigmaFetchMock('COLORKEYABCDEFGHIJKLMN');
    vi.stubGlobal('fetch', mockFetch);

    const { loadFigmaContext } = await import('./adapters/figma');
    const ctx = await loadFigmaContext('COLORKEYABCDEFGHIJKLMN', 'tok');

    // color/primary is { r: 0.957, g: 0.482, b: 0.125, a: 1 }
    // -> r=244, g=123, b=32 -> #f47b20
    const primary = ctx.variables.find((v) => v.name === 'color/primary');
    expect(primary).toBeDefined();
    expect(primary?.value).toMatch(/^#[0-9a-f]{6}$/i);
    // Exact hex: r=round(0.957*255)=244, g=round(0.482*255)=123, b=round(0.125*255)=32
    expect(primary?.value.toLowerCase()).toBe('#f47b20');

    // FLOAT variable should not be in the COLOR list with a hex value, but should be present.
    const spacing = ctx.variables.find((v) => v.name === 'spacing/4');
    expect(spacing).toBeDefined();
    expect(spacing?.type).toBe('FLOAT');
    expect(spacing?.value).toBe('16');
  });

  it('throws a contextual error on non-OK HTTP responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({}) }),
    );

    const { loadFigmaContext } = await import('./adapters/figma');
    await expect(loadFigmaContext('BADKEY', 'invalid-token')).rejects.toThrow(
      /401|Unauthorized|BADKEY/i,
    );
  });
});

describe('rgbaToHex', () => {
  it('converts opaque colors to #RRGGBB', async () => {
    const { rgbaToHex } = await import('./adapters/figma');
    expect(rgbaToHex({ r: 1, g: 0, b: 0, a: 1 })).toBe('#ff0000');
    expect(rgbaToHex({ r: 0, g: 1, b: 0 })).toBe('#00ff00'); // a defaults to 1
    expect(rgbaToHex({ r: 0, g: 0, b: 0, a: 1 })).toBe('#000000');
  });

  it('appends alpha channel when a < 1', async () => {
    const { rgbaToHex } = await import('./adapters/figma');
    // a=0.5 -> round(0.5*255)=128=0x80
    const result = rgbaToHex({ r: 1, g: 0, b: 0, a: 0.5 });
    expect(result).toMatch(/^#[0-9a-f]{8}$/i);
    expect(result.toLowerCase()).toBe('#ff000080');
  });
});

describe('Agent.run() -- Phase 3a Figma integration', () => {
  it('includes the figma-context preamble in the system prompt when figma is provided', async () => {
    vi.stubGlobal('fetch', makeFigmaFetchMock('FILEKEY1ABCDEFGHIJKLMN'));

    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: TOKEN_HEAVY_TSX }],
      usage: { input_tokens: 200, output_tokens: 300 },
      model: 'claude-sonnet-4-6',
    });

    const { Agent } = await import('./index');
    const agent = new Agent({ apiKey: 'test-key', iterate: 0, figmaToken: 'fig-token' });
    await agent.run({
      brief: 'hero section using brand colors',
      figma: 'FILEKEY1ABCDEFGHIJKLMN',
    });

    const callArgs = mockMessageCreate.mock.calls[0]?.[0] ?? {};
    expect(typeof callArgs.system).toBe('string');
    expect(callArgs.system).toContain('## Figma file context');
    expect(callArgs.system).toContain('Acme Brand System');
    // Should still contain the core token-discipline rules.
    expect(callArgs.system).toContain('Token discipline');
  });

  it('throws a clear error when figma is provided but no token exists', async () => {
    // No figmaToken in opts, no FIGMA_TOKEN env var.
    const prevToken = process.env.FIGMA_TOKEN;
    delete process.env.FIGMA_TOKEN;

    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    try {
      const { Agent } = await import('./index');
      const agent = new Agent({ apiKey: 'test-key', iterate: 0 });
      await expect(
        agent.run({ brief: 'anything', figma: 'SOMEKEY' }),
      ).rejects.toThrow(/FIGMA_TOKEN/i);

      // fetch should never have been called.
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      if (prevToken !== undefined) process.env.FIGMA_TOKEN = prevToken;
    }
  });

  it('renders atlas-context preamble BEFORE figma-context preamble when both are present', async () => {
    vi.stubGlobal('fetch', makeFigmaFetchMock('DUALKEYABCDEFGHIJKLMNO'));

    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: TOKEN_HEAVY_TSX }],
      usage: { input_tokens: 250, output_tokens: 350 },
      model: 'claude-sonnet-4-6',
    });

    const { Agent } = await import('./index');
    const agent = new Agent({ apiKey: 'test-key', iterate: 0, figmaToken: 'fig-token' });
    await agent.run({
      brief: 'sidebar with brand colors',
      cwd: '/fake/project',
      figma: 'DUALKEYABCDEFGHIJKLMNO',
    });

    const callArgs = mockMessageCreate.mock.calls[0]?.[0] ?? {};
    const system: string = callArgs.system ?? '';

    // Both preambles must be present.
    expect(system).toContain('## Project context');
    expect(system).toContain('## Figma file context');

    // Atlas must come before Figma.
    const atlasPos = system.indexOf('## Project context');
    const figmaPos = system.indexOf('## Figma file context');
    expect(atlasPos).toBeLessThan(figmaPos);

    // Core system prompt must also be present.
    expect(system).toContain('Token discipline');
  });

  it('records figmaFileKey and variableCount in trace notes', async () => {
    vi.stubGlobal('fetch', makeFigmaFetchMock('TRACEKEYABCDEFGHIJKLMN'));

    mockMessageCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: TOKEN_HEAVY_TSX }],
      usage: { input_tokens: 180, output_tokens: 280 },
      model: 'claude-sonnet-4-6',
    });

    const { Agent } = await import('./index');
    const agent = new Agent({ apiKey: 'test-key', iterate: 0, figmaToken: 'fig-token' });
    const result = await agent.run({
      brief: 'nav bar',
      figma: 'TRACEKEYABCDEFGHIJKLMN',
    });

    const intakeEntry = result.trace.find((t) => t.phase === 'intake');
    expect(intakeEntry?.notes?.figmaFileKey).toBe('TRACEKEYABCDEFGHIJKLMN');
    expect(typeof intakeEntry?.notes?.figmaVariableCount).toBe('number');

    const generateEntry = result.trace.find((t) => t.phase === 'generate');
    expect(generateEntry?.notes?.figmaFileKey).toBe('TRACEKEYABCDEFGHIJKLMN');
    expect(typeof generateEntry?.notes?.figmaMappedRoleCount).toBe('number');
  });
});
