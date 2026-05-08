import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runAuditInit, auditInitCommand } from './audit-init';

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
    expect(text).toContain("import { shadcnDefaults } from '@atelier-oss/audit'");
    expect(text).toContain('shadcnDefaults()');
  });

  it('writes the prettyfly preset when requested', () => {
    const cwd = tmp();
    const result = runAuditInit({ cwd, preset: 'prettyfly' });
    const text = readFileSync(result.written, 'utf-8');
    expect(text).toContain("import { prettyflyDefaults } from '@atelier-oss/audit'");
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

// Citty-wiring smoke: confirms args.preset / args.force pass through correctly
// and that an unknown preset reaches the CLI guard before runAuditInit throws.
describe('auditInitCommand (citty wiring)', () => {
  const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
  const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const cwdSpy = vi.spyOn(process, 'cwd');

  afterEach(() => {
    exit.mockClear();
    err.mockClear();
    log.mockClear();
    cwdSpy.mockReset();
  });

  it('writes the file end-to-end through the citty handler', async () => {
    const cwd = tmp();
    cwdSpy.mockReturnValue(cwd);
    // citty's `run` accepts a context object; we shape the minimum it reads.
    await (auditInitCommand as unknown as {
      run: (ctx: { args: { preset: string; force: boolean } }) => Promise<void> | void;
    }).run({ args: { preset: 'shadcn', force: false } });
    expect(existsSync(join(cwd, 'atelier.audit.config.ts'))).toBe(true);
    expect(exit).not.toHaveBeenCalled();
  });

  it('exits with code 2 on unknown preset (CLI guard fires before runAuditInit)', async () => {
    const cwd = tmp();
    cwdSpy.mockReturnValue(cwd);
    await (auditInitCommand as unknown as {
      run: (ctx: { args: { preset: string; force: boolean } }) => Promise<void> | void;
    }).run({ args: { preset: 'nonsense', force: false } });
    expect(exit).toHaveBeenCalledWith(2);
    expect(err).toHaveBeenCalledWith(
      expect.stringMatching(/unknown preset/i),
    );
  });

  it('exits with code 1 when target already exists and --force is false', async () => {
    const cwd = tmp();
    cwdSpy.mockReturnValue(cwd);
    runAuditInit({ cwd, preset: 'shadcn' });
    await (auditInitCommand as unknown as {
      run: (ctx: { args: { preset: string; force: boolean } }) => Promise<void> | void;
    }).run({ args: { preset: 'shadcn', force: false } });
    expect(exit).toHaveBeenCalledWith(1);
  });
});
