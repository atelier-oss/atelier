/**
 * Precedence-rule layer: explicit DESIGN.md > atlas defaults > Tailwind palette.
 *
 * Phase 2.2 ships the typed scaffold; the actual rule body is gated on
 * Phase 2.4 (spec/DESIGN.md.spec.md). Until then, this returns no findings —
 * keeping `pnpm --filter @atelier-oss/lint test` 0-diff vs upstream by design.
 */

import type { Finding, LintReport } from '@google/design.md/linter';
import { ATELIER_PRECEDENCE_VIOLATION, type Precedence } from './types';

export interface PrecedenceCheckInput {
  upstream: LintReport;
  atlas: Record<string, unknown> | undefined;
}

export interface PrecedenceCheckResult {
  precedence: Precedence;
  findings: Finding[];
}

/**
 * Inspect the upstream report against atlas defaults; emit findings for any
 * atlas value that shadows an explicit token without justification.
 *
 * @returns precedence='explicit' when DESIGN.md owns the resolution; 'atlas'
 *          when atlas is the only source; 'palette' as last-resort fallback.
 */
export function checkPrecedence(input: PrecedenceCheckInput): PrecedenceCheckResult {
  const findings: Finding[] = [];

  // No atlas supplied → resolution is purely explicit (or palette fallback
  // from upstream rules). Nothing to compare.
  if (!input.atlas) {
    return { precedence: 'explicit', findings };
  }

  // Phase 2.4 will populate this body with the actual shadow check, emitting
  // ATELIER_PRECEDENCE_VIOLATION findings when atlas[k] != designSystem[k].
  // The constant is referenced here so dead-code analyzers don't flag the
  // unused export when the body is empty.
  void ATELIER_PRECEDENCE_VIOLATION;

  return { precedence: 'explicit', findings };
}
