import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { audit } from './audit';
import { shadcnDefaults, prettyflyDefaults } from './presets';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'atelier-audit-preset-'));
}

describe('presets', () => {
  describe('shadcnDefaults', () => {
    it('exports a partial AuditConfig with shadcn-typical paths', () => {
      const cfg = shadcnDefaults();
      // Must point at a generic shadcn-style component dir.
      expect(cfg.componentDir).toBe('components');
      // Must keep the canonical shadcn token names front-and-center in design coverage.
      expect(cfg.designKeywords).toContain('background');
      expect(cfg.designKeywords).toContain('foreground');
      expect(cfg.designKeywords).toContain('primary');
      // Must NOT carry prettyfly-specific component names.
      expect(cfg.designComponents).not.toContain('CommandSphere');
    });

    it('audits a clean shadcn-style project without findings beyond DESIGN coverage', () => {
      const root = tmp();
      // No DESIGN.md → designCoverage is silent (returns early by design).
      // No components/ dir → tokenUsage / motion / a11y / responsive emit no false positives.
      const result = audit({ root, ...shadcnDefaults() });
      // Audit should not crash on a fresh project.
      expect(result.rootPath).toBe(root);
      // No DESIGN.md = no design coverage findings (existing behavior).
      expect(result.sections.designCoverage).toEqual([]);
    });

    it('flags inline hex in a shadcn-style components dir', () => {
      const root = tmp();
      mkdirSync(join(root, 'components'), { recursive: true });
      writeFileSync(
        join(root, 'components', 'Button.tsx'),
        `export const Button = () => <button style={{ color: '#FF0000' }}>x</button>;\n`,
      );
      const result = audit({ root, ...shadcnDefaults() });
      expect(result.sections.tokenUsage.length).toBeGreaterThan(0);
      expect(result.sections.tokenUsage[0]?.message).toContain('#FF0000');
    });
  });

  describe('prettyflyDefaults', () => {
    it('reproduces prettyfly-os audit_home_dashboard.py defaults', () => {
      const cfg = prettyflyDefaults();
      expect(cfg.componentDir).toBe('components/home/command-center');
      expect(cfg.motionTarget).toBe('CommandSphere.tsx');
      expect(cfg.designComponents).toContain('CommandSphere');
    });
  });
});
