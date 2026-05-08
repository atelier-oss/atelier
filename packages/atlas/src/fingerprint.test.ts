/**
 * Phase 2.5 gate: each corpus repo must fingerprint to its expected
 * category. Skips repos that don't exist locally so the test runs in
 * any environment.
 */

import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fingerprint, getShard, loadCategories } from './fingerprint';
import type { BuildCategory } from './types';

// Corpus targets the 7 build categories. Paths point at project roots; the
// fingerprinter discovers the actual app root (where package.json lives) so
// nested layouts (consult-ops/koho/code/...) are handled transparently.
const CORPUS: ReadonlyArray<{ path: string; expected: BuildCategory }> = [
  { path: '/Users/alexhale/Projects/koho/consult-ops', expected: 'saas-dashboard' },
  { path: '/Users/alexhale/Projects/advisory-board', expected: 'multi-llm-synthesis' },
  { path: '/Users/alexhale/Projects/1g1f', expected: 'marketing-landing' },
  { path: '/Users/alexhale/Projects/gravity-claw', expected: 'conversational-agent-ui' },
  { path: '/Users/alexhale/Projects/sportsbook-edge', expected: 'trading-analytics' },
  { path: '/Users/alexhale/Projects/prettyfly-os', expected: 'internal-ops' },
  { path: '/Users/alexhale/Projects/prettyfly-audit-engine', expected: 'saas-dashboard' },
];

describe('loadCategories', () => {
  it('parses categories.json', () => {
    const cats = loadCategories();
    expect(cats.version).toBe(2);
    expect(cats.categories).toHaveLength(8);
    expect(cats.min_signals_for_classification).toBeGreaterThan(0);
  });
});

describe('fingerprint corpus parity', () => {
  for (const { path, expected } of CORPUS) {
    const skip = !existsSync(path);
    const fn = skip ? it.skip : it;
    fn(`${path.split('/').slice(-2).join('/')} → ${expected}`, () => {
      const r = fingerprint(path);
      // rootPath is the discovered app root; equals input if package.json
      // lives at top level, else a subdirectory of input.
      expect(r.rootPath === path || r.rootPath.startsWith(`${path}/`)).toBe(true);
      // category resolves via canonical-name override OR auto heuristic.
      expect(r.category).toBe(expected);
      expect(r.shardPath).toBeTruthy();
      expect(r.exemplars.length).toBeGreaterThan(0);
    });
  }
});

describe('fingerprint edge cases', () => {
  it('returns null category on a directory with no signals', () => {
    const r = fingerprint('/tmp');
    expect(r.category).toBeNull();
    expect(r.exemplars).toEqual([]);
    expect(r.shardPath).toBeNull();
  });

  it('returns ranking sorted descending by score', () => {
    const r = fingerprint('/tmp');
    for (let i = 1; i < r.ranking.length; i++) {
      const prev = r.ranking[i - 1];
      const curr = r.ranking[i];
      expect(prev?.score ?? 0).toBeGreaterThanOrEqual(curr?.score ?? 0);
    }
  });
});

describe('getShard', () => {
  it('reads the markdown shard for a known category', () => {
    const md = getShard('saas-dashboard');
    expect(md.length).toBeGreaterThan(100);
    expect(md.toLowerCase()).toMatch(/dashboard|saas/);
  });

  it('reads the cinematic-hero-catalog shard (intent-only category)', () => {
    const md = getShard('cinematic-hero-catalog');
    expect(md.length).toBeGreaterThan(100);
    expect(md.toLowerCase()).toMatch(/motionsites|mendes|cinematic/);
  });

  it('throws on an unknown category', () => {
    expect(() => getShard('nonexistent' as BuildCategory)).toThrow();
  });
});
