import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { audit } from './audit';
import { shadcnDefaults, prettyflyDefaults } from './presets';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'atelier-audit-warn-'));
}

describe('audit warn-loud (no targets resolved)', () => {
  it('emits a no-targets-found finding when none of the configured targets exist', () => {
    const root = tmp(); // empty dir — nothing matches
    const result = audit({ root, ...shadcnDefaults() });
    // Aggregate across all sections — must include a "no targets resolved" finding so the user
    // doesn't mistake an empty audit for a clean codebase.
    const all = Object.values(result.sections).flat();
    const noTargets = all.find((f) => f.message.includes('no audit targets'));
    expect(noTargets, 'expected a no-audit-targets-found finding').toBeDefined();
    expect(noTargets?.section).toBe('tokenUsage');
  });

  it('does NOT emit no-targets-found when at least one target exists', () => {
    const root = tmp();
    mkdirSync(join(root, 'components'), { recursive: true });
    writeFileSync(join(root, 'components', 'Button.tsx'), 'export const x = 1;\n');
    const result = audit({ root, ...shadcnDefaults() });
    const all = Object.values(result.sections).flat();
    const noTargets = all.find((f) => f.message.includes('no audit targets'));
    expect(noTargets).toBeUndefined();
  });

  it('STILL emits warn-loud when componentDir exists but is empty', () => {
    // The bug review #C1 caught: an existing-but-empty directory previously
    // suppressed warn-loud, leaving the user with a silent "0 findings" on
    // a directory the audit had nothing to look at.
    const root = tmp();
    mkdirSync(join(root, 'components'), { recursive: true });
    const result = audit({ root, ...shadcnDefaults() });
    const all = Object.values(result.sections).flat();
    const noTargets = all.find((f) => f.message.includes('no audit targets'));
    expect(noTargets).toBeDefined();
  });

  it('does NOT emit warn-loud when prettyfly preset has all four targets', () => {
    // Regression check: the multi-arm targetExists logic must keep warn-loud
    // suppressed when the full prettyfly directory tree exists, even if the
    // .tsx files are minimal (no color content).
    const root = tmp();
    const dir = 'components/home/command-center';
    mkdirSync(join(root, dir), { recursive: true });
    for (const f of ['CommandSphere.tsx', 'TelemetryStream.tsx', 'CommandCenter.tsx']) {
      writeFileSync(join(root, dir, f), 'export const x = 1;\n');
    }
    const result = audit({ root, ...prettyflyDefaults() });
    const all = Object.values(result.sections).flat();
    const noTargets = all.find((f) => f.message.includes('no audit targets'));
    expect(noTargets).toBeUndefined();
  });
});
