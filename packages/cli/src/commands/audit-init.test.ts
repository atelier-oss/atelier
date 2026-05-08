import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runAuditInit } from './audit-init';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'atelier-audit-init-'));
}

describe('runAuditInit', () => {
  it('writes atelier.audit.config.ts with the requested preset', () => {
    const cwd = tmp();
    const result = runAuditInit({ cwd, preset: 'shadcn' });
    expect(result.alreadyExisted).toBe(false);
    expect(result.written).toBe(join(cwd, 'atelier.audit.config.ts'));
    expect(existsSync(result.written)).toBe(true);
    const text = readFileSync(result.written, 'utf-8');
    expect(text).toContain("import { shadcnDefaults } from '@atelier/audit'");
    expect(text).toContain('shadcnDefaults()');
  });

  it('writes the prettyfly preset when requested', () => {
    const cwd = tmp();
    const result = runAuditInit({ cwd, preset: 'prettyfly' });
    const text = readFileSync(result.written, 'utf-8');
    expect(text).toContain("import { prettyflyDefaults } from '@atelier/audit'");
    expect(text).toContain('prettyflyDefaults()');
  });

  it('defaults to shadcn preset', () => {
    const cwd = tmp();
    const result = runAuditInit({ cwd });
    const text = readFileSync(result.written, 'utf-8');
    expect(text).toContain('shadcnDefaults');
  });

  it('refuses to overwrite without --force', () => {
    const cwd = tmp();
    runAuditInit({ cwd });
    const result = runAuditInit({ cwd });
    expect(result.alreadyExisted).toBe(true);
  });

  it('overwrites with --force', () => {
    const cwd = tmp();
    runAuditInit({ cwd, preset: 'shadcn' });
    const result = runAuditInit({ cwd, preset: 'prettyfly', force: true });
    expect(result.alreadyExisted).toBe(false);
    const text = readFileSync(result.written, 'utf-8');
    expect(text).toContain('prettyflyDefaults');
  });

  it('rejects unknown preset names', () => {
    const cwd = tmp();
    expect(() =>
      runAuditInit({ cwd, preset: 'nonsense' as 'shadcn' }),
    ).toThrow(/unknown preset/i);
  });
});
