/**
 * @atelier/lint — DESIGN.md linter.
 *
 * Wraps @google/design.md@0.1.1 (Apache-2.0) and layers the Atelier
 * precedence rule (explicit > atlas > palette). The 8 sub-token vocabulary
 * lands in Phase 2.4 once spec/DESIGN.md.spec.md is authored.
 */

import { performance } from 'node:perf_hooks';
import { lint as upstreamLint, type Finding, type LintReport } from '@google/design.md/linter';
import { checkPrecedence } from './precedence';
import type { AtelierLintResult, LintDesignMdOptions, Severity } from './types';

export const VERSION = '0.0.0';

/** The exact upstream version this wrapper is pinned to. Bump deliberately. */
export const UPSTREAM_PIN = '0.1.1' as const;

export {
  ATELIER_MISSING_ROLE,
  ATELIER_PRECEDENCE_VIOLATION,
  CANONICAL_SUBTOKEN_ROLES,
  type AtelierLintResult,
  type CanonicalSubtokenRole,
  type Finding,
  type LintDesignMdOptions,
  type LintReport,
  type Precedence,
  type Severity,
} from './types';

export { checkPrecedence } from './precedence';
export { checkSubTokens, extractColorTokenNames } from './sub-tokens';

/** Re-export upstream `lint` for callers who want raw Google output. */
export { lint as lintUpstream } from '@google/design.md/linter';

/**
 * Lint a DESIGN.md document with Atelier extensions.
 *
 * @param content  Raw DESIGN.md content.
 * @param path     File path for reporting (informational; not read).
 * @param options  Optional upstream rules + atlas defaults.
 */
export function lintDesignMd(
  content: string,
  path: string,
  options: LintDesignMdOptions = {},
): AtelierLintResult {
  const start = performance.now();

  const upstream: LintReport = upstreamLint(content, {
    rules: options.rules,
  });

  const { precedence, findings: atelierFindings } = checkPrecedence({
    upstream,
    atlas: options.atlas,
  });

  // Partition upstream findings by severity. Atelier findings are kept
  // separate so the 0-diff gate can compare upstream-only.
  const errors: Finding[] = [];
  const warnings: Finding[] = [];
  const infos: Finding[] = [];
  for (const f of upstream.findings) {
    if (f.severity === 'error') errors.push(f);
    else if (f.severity === 'warning') warnings.push(f);
    else infos.push(f);
  }

  const all: Finding[] = [...upstream.findings, ...atelierFindings];

  return {
    path,
    errors,
    warnings,
    infos,
    atelierFindings,
    findings: all,
    conformanceVersion: UPSTREAM_PIN,
    precedence,
    durationMs: performance.now() - start,
  };
}
