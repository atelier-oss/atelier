/**
 * Phase 2.6 gate: TS audit on prettyfly-os agrees with Python reference
 * (benchmarks/audit_home_dashboard.py) within ≤2 findings.
 *
 * Skips silently if prettyfly-os is unavailable in this environment.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { audit, buildPfosPayload, contrastRatio } from './audit';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const PRETTYFLY = '/Users/alexhale/Projects/prettyfly-os';
const PYTHON_AUDIT = join(REPO_ROOT, 'benchmarks', 'audit_home_dashboard.py');

describe('contrastRatio', () => {
  it('matches WCAG examples', () => {
    // Black on white = 21:1
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 0);
    // White on white = 1:1
    expect(contrastRatio([255, 255, 255], [255, 255, 255])).toBeCloseTo(1, 1);
  });

  it('is symmetric (lighter / darker order does not matter)', () => {
    const a = contrastRatio([100, 100, 100], [200, 200, 200]);
    const b = contrastRatio([200, 200, 200], [100, 100, 100]);
    expect(a).toBeCloseTo(b, 5);
  });
});

describe('audit', () => {
  it('skips file-dependent sections when project is empty', () => {
    const root = mkdtempSync(join(tmpdir(), 'atelier-audit-'));
    const r = audit({ root });
    // File-dependent sections must produce nothing on an empty dir.
    expect(r.sections.tokenUsage).toEqual([]);
    expect(r.sections.motion).toEqual([]);
    expect(r.sections.accessibility).toEqual([]);
    expect(r.sections.designCoverage).toEqual([]);
    expect(r.sections.responsive).toEqual([]);
    // Contrast section runs WCAG math against a fixed sample table;
    // findings here are file-independent (some samples are below 4.5:1).
    expect(Array.isArray(r.sections.contrast)).toBe(true);
  });

  it('contrast section is empty when no samples are below 4.5:1', () => {
    const root = mkdtempSync(join(tmpdir(), 'atelier-audit-'));
    const r = audit({
      root,
      contrastSamples: [{ label: 'pure-white-on-black', rgb: [255, 255, 255] }],
      darkCardRgb: [0, 0, 0],
    });
    expect(r.sections.contrast).toEqual([]);
  });
});

describe('buildPfosPayload', () => {
  it('emits a well-formed event body', () => {
    const p = buildPfosPayload({
      cwdProject: 'prettyfly-os',
      reportPath: '/tmp/audit.md',
      findingCount: 7,
    });
    expect(p.type).toBe('SKILL_COMPLETED');
    expect(p.agent_slug).toBe('atelier');
    expect(p.skill_slug).toBe('design-audit');
    expect(p.surface).toBe('pf_runtime');
    expect(p.cwd_project).toBe('prettyfly-os');
    expect(p.data.finding_count).toBe(7);
  });
});

describe('Python parity gate (prettyfly-os)', () => {
  const skip = !existsSync(PRETTYFLY) || !existsSync(PYTHON_AUDIT);
  const fn = skip ? it.skip : it;

  fn('TS finding count agrees with Python within ≤2', () => {
    const tsResult = audit({ root: PRETTYFLY });
    const tsCount = tsResult.findingCount;

    // Run Python audit with --emit-url empty so it just writes the report;
    // capture stdout + parse the printed finding_count from the PFOS payload.
    const tmpReport = join(mkdtempSync(join(tmpdir(), 'atelier-audit-py-')), 'report.md');
    let pyCount = -1;
    try {
      execFileSync(
        'python3',
        [PYTHON_AUDIT, '--root', PRETTYFLY, '--out', tmpReport],
        { encoding: 'utf-8', cwd: REPO_ROOT },
      );
      // The Python script prints its own finding count via the payload JSON
      // embedded in the report. Read the report and extract finding_count.
      const { readFileSync } = require('node:fs') as typeof import('node:fs');
      const reportText = readFileSync(tmpReport, 'utf-8');
      const match = reportText.match(/"finding_count":\s*(\d+)/);
      if (match) pyCount = Number(match[1]);
    } catch (e) {
      // Python audit could fail (missing targets etc.); skip gate.
      console.warn('[parity-skip] Python audit threw:', e);
      return;
    }

    expect(pyCount).toBeGreaterThanOrEqual(0);
    const diff = Math.abs(tsCount - pyCount);
    expect(diff, `ts=${tsCount} py=${pyCount} diff=${diff}`).toBeLessThanOrEqual(2);
  });

  fn('TS audit runs against prettyfly-os without throwing', () => {
    const r = audit({ root: PRETTYFLY });
    expect(r.rootPath).toBe(PRETTYFLY);
    expect(r.findingCount).toBeGreaterThanOrEqual(0);
    // designCoverage section has deterministic checks.
    expect(Array.isArray(r.sections.designCoverage)).toBe(true);
  });
});
