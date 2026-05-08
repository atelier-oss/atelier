import { existsSync, readFileSync } from 'node:fs';
import { defineCommand } from 'citty';
import { lintDesignMd, type AtelierLintResult } from '@atelier-oss/lint';

export type Format = 'stdout' | 'json' | 'md';

export interface RunLintOptions {
  path: string;
  format?: Format;
}

export interface RunLintResult {
  result: AtelierLintResult;
  output: string;
  exitCode: 0 | 1 | 2;
}

export function runLint(options: RunLintOptions): RunLintResult {
  if (!existsSync(options.path)) {
    return {
      result: {
        path: options.path,
        errors: [],
        warnings: [],
        infos: [],
        atelierFindings: [],
        findings: [],
        conformanceVersion: '0.1.1',
        precedence: 'explicit',
        durationMs: 0,
      },
      output: `error: DESIGN.md not found at ${options.path}\n`,
      exitCode: 2,
    };
  }

  const content = readFileSync(options.path, 'utf-8');
  const result = lintDesignMd(content, options.path);
  const format = options.format ?? 'stdout';

  let output: string;
  if (format === 'json') {
    output = JSON.stringify(
      {
        path: result.path,
        precedence: result.precedence,
        conformanceVersion: result.conformanceVersion,
        summary: {
          errors: result.errors.length,
          warnings: result.warnings.length,
          infos: result.infos.length,
        },
        findings: result.findings.map((f) => ({
          severity: f.severity,
          path: f.path,
          message: f.message,
        })),
        durationMs: result.durationMs,
      },
      null,
      2,
    );
  } else if (format === 'md') {
    const lines: string[] = [`# Lint: ${result.path}`, ''];
    lines.push(
      `${result.errors.length} error(s), ${result.warnings.length} warning(s), ${result.infos.length} info(s)`,
    );
    lines.push('');
    for (const f of result.findings) {
      const where = f.path ? ` \`${f.path}\`` : '';
      lines.push(`- **[${f.severity}]**${where} — ${f.message}`);
    }
    output = lines.join('\n') + '\n';
  } else {
    const lines: string[] = [];
    if (result.findings.length === 0) {
      lines.push(`${result.path}: clean (0 errors, 0 warnings, 0 infos)`);
    } else {
      lines.push(
        `${result.path}: ${result.errors.length} error(s), ${result.warnings.length} warning(s), ${result.infos.length} info(s)`,
      );
      for (const f of result.findings) {
        const where = f.path ? ` (${f.path})` : '';
        lines.push(`  [${f.severity}]${where} ${f.message}`);
      }
    }
    output = lines.join('\n') + '\n';
  }

  return {
    result,
    output,
    exitCode: result.errors.length > 0 ? 1 : 0,
  };
}

export const lintCommand = defineCommand({
  meta: {
    name: 'lint',
    description: 'Lint a DESIGN.md file (default: ./DESIGN.md).',
  },
  args: {
    path: {
      type: 'positional',
      description: 'Path to DESIGN.md (defaults to ./DESIGN.md).',
      required: false,
    },
    format: {
      type: 'string',
      description: 'Output format: stdout (default), json, md.',
      default: 'stdout',
    },
  },
  run({ args }) {
    const path = args.path ?? 'DESIGN.md';
    const format = args.format as Format;
    const { output, exitCode } = runLint({ path, format });
    process.stdout.write(output);
    process.exit(exitCode);
  },
});
