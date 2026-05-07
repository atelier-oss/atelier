/**
 * Parity test for @atelier/classify.
 *
 * Loads benchmarks/fixtures/classify-parity.yaml and asserts every row.
 * Phase 2.1 ships when this passes 60/60 AND the Python parity oracle does too.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  classifyClass,
  extractInlineColors,
  scoreText,
  type Verdict,
} from './score';

interface ParityCase {
  input: string;
  kind?: 'class' | 'inline';
  expected: 'token' | 'raw' | 'none';
  rationale: string;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = resolve(HERE, '../../../benchmarks/fixtures/classify-parity.yaml');

function expectedToVerdict(s: string): Verdict | null {
  if (s === 'token') return 'token';
  if (s === 'raw') return 'raw';
  if (s === 'none') return null;
  throw new Error(`unknown expected value: ${s}`);
}

describe('classify-parity.yaml fixture', () => {
  const cases = parse(readFileSync(FIXTURE_PATH, 'utf-8')) as ParityCase[];

  it('loads exactly 60 cases', () => {
    expect(cases.length).toBe(60);
  });

  for (const [idx, c] of cases.entries()) {
    const kind = c.kind ?? 'class';
    const label = `#${idx} [${kind}] ${JSON.stringify(c.input)} → ${c.expected}`;
    it(label, () => {
      const expected = expectedToVerdict(c.expected);
      let actual: Verdict | null;
      if (kind === 'class') {
        actual = classifyClass(c.input);
      } else if (kind === 'inline') {
        actual = extractInlineColors(c.input).length > 0 ? 'raw' : null;
      } else {
        throw new Error(`unknown kind: ${kind satisfies never}`);
      }
      expect(actual, c.rationale).toBe(expected);
    });
  }
});

describe('scoreText', () => {
  it('returns null conformance on empty text', () => {
    expect(scoreText('').conformance).toBeNull();
  });

  it('returns null conformance on text with no color signal', () => {
    expect(scoreText('const x = 42;').conformance).toBeNull();
  });

  it('counts tokens and raw across mixed JSX', () => {
    const text = `
      <div className="bg-foreground text-zinc-900 border-border">
        <span style={{ color: '#1A7BA5' }} className="bg-blue-500 text-primary">x</span>
      </div>
    `;
    const r = scoreText(text);
    // Expected: bg-foreground, border-border, text-primary → 3 tokens
    //           text-zinc-900, bg-blue-500 → 2 raw classes + 1 inline #1A7BA5 = 3 raw
    expect(r.tokens).toBe(3);
    expect(r.raw).toBe(3);
    expect(r.conformance).toBeCloseTo(0.5, 5);
  });

  it('handles template literal classes with nested quotes', () => {
    const text = 'cn(`bg-foreground ${cond && "text-pf"}`)';
    const r = scoreText(text);
    expect(r.tokens).toBe(2);
    expect(r.raw).toBe(0);
  });
});
