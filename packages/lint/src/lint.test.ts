/**
 * 0-diff gate for Phase 2.2.
 *
 * Confirms @atelier/lint produces the same findings as the raw
 * @google/design.md upstream lint on 4 real DESIGN.md files. The Atelier
 * precedence layer is intentionally a no-op without atlas input, so any
 * diff would mean the wrapper is mishandling upstream output.
 */

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lint as upstreamLint } from '@google/design.md/linter';
import { lintDesignMd } from './index';

const FIXTURES = [
  '/Users/alexhale/Projects/koho/consult-ops/DESIGN.md',
  '/Users/alexhale/Projects/eight12-run-club-website/DESIGN.md',
  '/Users/alexhale/Projects/advisory-board/DESIGN.md',
  '/Users/alexhale/Projects/prettyfly-os/DESIGN.md',
] as const;

describe('lintDesignMd 0-diff gate', () => {
  for (const path of FIXTURES) {
    const skip = !existsSync(path);
    const fn = skip ? it.skip : it;
    fn(`matches upstream findings on ${path.split('/').slice(-3).join('/')}`, () => {
      const content = readFileSync(path, 'utf-8');
      const upstreamReport = upstreamLint(content);
      const wrapped = lintDesignMd(content, path);

      expect(wrapped.findings.length).toBe(upstreamReport.findings.length);
      // Atelier-emitted findings must be empty without an atlas input.
      expect(wrapped.atelierFindings.length).toBe(0);
      // Findings preserved 1:1 (same severity, code, message).
      for (const [i, expected] of upstreamReport.findings.entries()) {
        const actual = wrapped.findings[i];
        expect(actual?.severity).toBe(expected.severity);
        expect(actual?.code).toBe(expected.code);
        expect(actual?.message).toBe(expected.message);
      }
      // Severity bucket totals match upstream summary.
      expect(wrapped.errors.length).toBe(upstreamReport.summary.errors);
      expect(wrapped.warnings.length).toBe(upstreamReport.summary.warnings);
      expect(wrapped.infos.length).toBe(upstreamReport.summary.infos);
    });
  }

  it('returns precedence=explicit when no atlas is provided', () => {
    const path = FIXTURES[0];
    if (!existsSync(path)) return;
    const result = lintDesignMd(readFileSync(path, 'utf-8'), path);
    expect(result.precedence).toBe('explicit');
    expect(result.conformanceVersion).toBe('0.1.1');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
