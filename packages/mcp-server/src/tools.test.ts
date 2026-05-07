/**
 * Phase 2.7 gate: each of the 4 MCP tools returns a well-formed envelope.
 *
 * Tests call the pure handlers directly — the MCP transport itself is
 * thin glue and not under test here.
 */

import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  atlasTool,
  auditTool,
  classifyTool,
  lintTool,
} from './tools';

function fresh(): string {
  return mkdtempSync(join(tmpdir(), 'atelier-mcp-'));
}

describe('lintTool', () => {
  it('returns ok=false when DESIGN.md is missing', async () => {
    const r = await lintTool({ path: '/nonexistent/DESIGN.md' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('not found');
  });

  it('returns a well-formed envelope on a real DESIGN.md', async () => {
    const fixtures = [
      '/Users/alexhale/Projects/koho/consult-ops/DESIGN.md',
      '/Users/alexhale/Projects/prettyfly-os/DESIGN.md',
    ];
    const path = fixtures.find((p) => existsSync(p));
    if (!path) return;
    const r = await lintTool({ path });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.path).toBe(path);
      expect(r.data.conformanceVersion).toBe('0.1.1');
      expect(r.data.precedence).toBe('explicit');
      expect(typeof r.data.errors).toBe('number');
      expect(Array.isArray(r.data.findings)).toBe(true);
    }
  });
});

describe('classifyTool', () => {
  it('returns null conformance on an empty repo', async () => {
    const root = fresh();
    const r = await classifyTool({ path: root });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.filesScanned).toBe(0);
      expect(r.data.conformance).toBeNull();
    }
  });

  it('counts tokens vs raw on a small fixture', async () => {
    const root = fresh();
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(
      join(root, 'src', 'a.tsx'),
      '<div className="bg-foreground text-zinc-900">x</div>',
    );
    const r = await classifyTool({ path: root });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.tokens).toBe(1);
      expect(r.data.raw).toBe(1);
      expect(r.data.conformance).toBeCloseTo(0.5, 5);
    }
  });
});

describe('auditTool', () => {
  it('returns 0 findings on an empty project', async () => {
    const root = fresh();
    const r = await auditTool({ root });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.rootPath).toBe(root);
      // Empty dir: file-dependent sections are 0; contrast section may have findings.
      expect(typeof r.data.findingCount).toBe('number');
      expect(r.data.bySection.tokenUsage).toBe(0);
      expect(r.data.bySection.designCoverage).toBe(0);
    }
  });

  it('returns expected finding shape on prettyfly-os if available', async () => {
    const root = '/Users/alexhale/Projects/prettyfly-os';
    if (!existsSync(root)) return;
    const r = await auditTool({ root });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.findingCount).toBeGreaterThan(0);
      for (const section of [
        'tokenUsage',
        'contrast',
        'motion',
        'accessibility',
        'designCoverage',
        'responsive',
      ]) {
        expect(typeof r.data.bySection[section]).toBe('number');
      }
    }
  });
});

describe('atlasTool', () => {
  it('returns null category on an unknown directory', async () => {
    const root = fresh();
    const r = await atlasTool({ path: root });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.category).toBeNull();
      expect(r.data.exemplars).toEqual([]);
      expect(r.data.shardPath).toBeNull();
    }
  });

  it('classifies a corpus repo via canonical-name override', async () => {
    const root = '/Users/alexhale/Projects/advisory-board';
    if (!existsSync(root)) return;
    const r = await atlasTool({ path: root });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.category).toBe('multi-llm-synthesis');
      expect(r.data.exemplars).toContain('advisory-board');
      expect(r.data.shardPath).toBeTruthy();
    }
  });
});

describe('schema validation', () => {
  it('lintInput rejects non-string path', async () => {
    const { lintInput } = await import('./tools');
    expect(() => lintInput.parse({ path: 123 })).toThrow();
  });

  it('classifyInput rejects empty path', async () => {
    const { classifyInput } = await import('./tools');
    expect(() => classifyInput.parse({ path: '' })).toThrow();
  });

  it('auditInput requires root', async () => {
    const { auditInput } = await import('./tools');
    expect(() => auditInput.parse({})).toThrow();
  });

  it('atlasInput accepts an absolute path', async () => {
    const { atlasInput } = await import('./tools');
    const r = atlasInput.parse({ path: '/Users/alex/proj' });
    expect(r.path).toBe('/Users/alex/proj');
  });
});
