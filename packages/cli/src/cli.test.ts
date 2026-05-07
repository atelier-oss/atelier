/**
 * Integration tests for @atelier/cli — the 4-line golden-path gate.
 *
 * Tests run against compiled dist/ to mirror what users get via npm/pnpm
 * dlx. Each test creates a tmp dir, runs the bin via execFileSync, asserts
 * exit code + stdout shape.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runAtlasList } from './commands/atlas';
import { runClassify } from './commands/classify';
import { runInit } from './commands/init';
import { runLint } from './commands/lint';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI_BIN = resolve(HERE, '..', 'dist', 'cli.js');

function fresh(prefix = 'atelier-cli-'): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe('runInit (programmatic)', () => {
  it('writes DESIGN.md to a clean cwd', () => {
    const cwd = fresh();
    const r = runInit({ cwd });
    expect(r.alreadyExisted).toBe(false);
    expect(existsSync(r.written)).toBe(true);
    const content = readFileSync(r.written, 'utf-8');
    expect(content).toContain('---');
    expect(content).toContain('colors:');
    expect(content).toContain('# Design System');
  });

  it('refuses to overwrite without force', () => {
    const cwd = fresh();
    runInit({ cwd });
    const r2 = runInit({ cwd });
    expect(r2.alreadyExisted).toBe(true);
  });

  it('overwrites with force=true', () => {
    const cwd = fresh();
    writeFileSync(join(cwd, 'DESIGN.md'), 'OLD\n');
    const r = runInit({ cwd, force: true });
    expect(r.alreadyExisted).toBe(false);
    expect(readFileSync(r.written, 'utf-8')).toContain('# Design System');
  });
});

describe('runLint (programmatic)', () => {
  it('returns exit 2 when DESIGN.md is missing', () => {
    const cwd = fresh();
    const r = runLint({ path: join(cwd, 'DESIGN.md') });
    expect(r.exitCode).toBe(2);
    expect(r.output).toContain('not found');
  });

  it('lints a freshly initialized DESIGN.md without crashing', () => {
    const cwd = fresh();
    runInit({ cwd });
    const r = runLint({ path: join(cwd, 'DESIGN.md') });
    // Exit 0 or 1 both acceptable here; we only require structured output.
    expect([0, 1]).toContain(r.exitCode);
    expect(r.result.conformanceVersion).toBe('0.1.1');
    expect(r.result.precedence).toBe('explicit');
  });

  it('emits valid JSON when format=json', () => {
    const cwd = fresh();
    runInit({ cwd });
    const r = runLint({ path: join(cwd, 'DESIGN.md'), format: 'json' });
    const parsed = JSON.parse(r.output);
    expect(parsed.precedence).toBe('explicit');
    expect(parsed.conformanceVersion).toBe('0.1.1');
    expect(parsed.summary).toBeDefined();
    expect(Array.isArray(parsed.findings)).toBe(true);
  });
});

describe('runClassify (programmatic)', () => {
  it('returns null conformance on empty repo', async () => {
    const cwd = fresh();
    const r = await runClassify({ path: cwd });
    expect(r.result.filesScanned).toBe(0);
    expect(r.result.conformance).toBeNull();
  });

  it('emits parseable JSON conformance', async () => {
    const cwd = fresh();
    mkdirSync(join(cwd, 'src'), { recursive: true });
    writeFileSync(
      join(cwd, 'src', 'a.tsx'),
      '<div className="bg-foreground text-zinc-900">x</div>',
    );
    const r = await runClassify({ path: cwd, format: 'json' });
    const parsed = JSON.parse(r.output);
    expect(parsed.tokens).toBe(1);
    expect(parsed.raw).toBe(1);
    expect(parsed.conformance).toBeCloseTo(0.5, 5);
  });
});

describe('runAtlasList (programmatic)', () => {
  it('lists all 7 categories', () => {
    const r = runAtlasList();
    expect(r.categories.length).toBe(7);
    expect(r.categories).toContain('saas-dashboard');
  });

  it('emits valid JSON when format=json', () => {
    const r = runAtlasList('json');
    const parsed = JSON.parse(r.output);
    expect(parsed.categories.length).toBe(7);
  });
});

describe('end-to-end golden path (built bin)', () => {
  beforeAll(() => {
    if (!existsSync(CLI_BIN)) {
      // Skip-rather-than-fail if dist isn't built; the package.json `test`
      // script runs after `build` in CI, so this only triggers locally.
      console.warn(`[skip] ${CLI_BIN} not built`);
    }
  });

  const skipIfMissing = (): boolean => !existsSync(CLI_BIN);

  it('init → lint → classify --format=json → atlas list', () => {
    if (skipIfMissing()) return;
    const cwd = fresh();

    const initOut = execFileSync('node', [CLI_BIN, 'init'], { cwd, encoding: 'utf-8' });
    expect(initOut).toContain('wrote');
    expect(existsSync(join(cwd, 'DESIGN.md'))).toBe(true);

    // lint may exit 0 or 1 depending on upstream rules; we just want it to
    // not crash and produce structured output.
    let lintOut = '';
    try {
      lintOut = execFileSync('node', [CLI_BIN, 'lint', 'DESIGN.md'], {
        cwd,
        encoding: 'utf-8',
      });
    } catch (e) {
      const err = e as { stdout?: string; status?: number };
      lintOut = err.stdout ?? '';
      expect([0, 1]).toContain(err.status);
    }
    expect(lintOut).toContain('DESIGN.md');

    mkdirSync(join(cwd, 'src'), { recursive: true });
    writeFileSync(
      join(cwd, 'src', 'a.tsx'),
      '<div className="bg-foreground">a</div>',
    );

    const classifyOut = execFileSync(
      'node',
      [CLI_BIN, 'classify', '.', '--format=json'],
      { cwd, encoding: 'utf-8' },
    );
    const parsed = JSON.parse(classifyOut);
    expect(typeof parsed.conformance === 'number' || parsed.conformance === null).toBe(true);

    const atlasOut = execFileSync('node', [CLI_BIN, 'atlas', 'list'], { cwd, encoding: 'utf-8' });
    expect(atlasOut).toContain('saas-dashboard');
  });
});
