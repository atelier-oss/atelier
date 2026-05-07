/**
 * Public types for @atelier/lint.
 *
 * The upstream `LintReport` from @google/design.md is exposed verbatim via
 * the `upstream` field. The Atelier extension fields layer on top.
 */

import type { Finding, LintReport, Severity } from '@google/design.md/linter';

export type { Finding, LintReport, Severity };

/** Where a token reference came from when resolved against an Atelier project. */
export type Precedence = 'explicit' | 'atlas' | 'palette';

/**
 * Atelier-specific finding code emitted when a higher-precedence source is
 * shadowed by a lower-precedence one (e.g. atlas default overrides explicit
 * DESIGN.md). Wired in Phase 2.4 once spec/DESIGN.md.spec.md lands; in 2.2
 * the precedence layer is a typed scaffold that emits zero findings.
 */
export const ATELIER_PRECEDENCE_VIOLATION = 'ATELIER_PRECEDENCE_VIOLATION';

export interface AtelierLintResult {
  /** Absolute or relative path of the DESIGN.md being linted (informational). */
  path: string;
  /** Findings from the upstream linter — preserved in original order. */
  errors: Finding[];
  warnings: Finding[];
  infos: Finding[];
  /** Atelier-emitted findings (precedence violations, sub-token checks). */
  atelierFindings: Finding[];
  /** All findings concatenated: upstream + atelier (errors/warnings/infos already split above). */
  findings: Finding[];
  /** Pinned version of @google/design.md the wrapper is bound to. */
  conformanceVersion: '0.1.1';
  /** Resolved precedence for this lint. Defaults to 'explicit' for a single-file lint. */
  precedence: Precedence;
  /** Wall-clock duration of the lint in ms. */
  durationMs: number;
}

export interface LintDesignMdOptions {
  /** Pass through upstream rules; defaults to DEFAULT_RULES via @google/design.md. */
  rules?: import('@google/design.md/linter').LintRule[];
  /** Atlas defaults to compare against, if any. Phase 2.4 wiring; 2.2 ignores. */
  atlas?: Record<string, unknown> | undefined;
}
