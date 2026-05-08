import { describe, it, expect } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { audit } from './audit';
import { shadcnDefaults } from './presets';

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
    const { mkdirSync, writeFileSync } = require('node:fs');
    mkdirSync(join(root, 'components'), { recursive: true });
    writeFileSync(join(root, 'components', 'Button.tsx'), 'export const x = 1;\n');
    const result = audit({ root, ...shadcnDefaults() });
    const all = Object.values(result.sections).flat();
    const noTargets = all.find((f) => f.message.includes('no audit targets'));
    expect(noTargets).toBeUndefined();
  });
});
