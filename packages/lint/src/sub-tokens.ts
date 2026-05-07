/**
 * 8-role sub-token vocabulary check. See spec/DESIGN.md.spec.md §3.
 *
 * Emits info-level findings for unsatisfied canonical roles. Non-blocking;
 * partial role coverage is valid. The check looks at:
 *   1. Direct color-token name match (case-insensitive).
 *   2. The optional `aliases` block in the DESIGN.md frontmatter.
 *
 * The check is deliberately lenient: it inspects the resolved
 * DesignSystemState.tokens (color group) and reports roles that have no
 * matching token under any standard alias.
 */

import type { Finding, LintReport } from '@google/design.md/linter';
import {
  ATELIER_MISSING_ROLE,
  CANONICAL_SUBTOKEN_ROLES,
  type CanonicalSubtokenRole,
} from './types';

export interface SubTokenCheckResult {
  satisfied: ReadonlySet<CanonicalSubtokenRole>;
  missing: readonly CanonicalSubtokenRole[];
  findings: Finding[];
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[\s_]+/g, '-');
}

/**
 * Inspect a DESIGN.md report and a list of resolved color token names; emit
 * info findings for any canonical role that has no satisfying token.
 *
 * @param colorTokenNames Names of color tokens declared in the DESIGN.md.
 *                        Caller extracts these from upstream's resolved model.
 * @param aliases         Optional `aliases` block from the DESIGN.md (Atelier
 *                        extension), mapping role → token name.
 */
export function checkSubTokens(
  colorTokenNames: readonly string[],
  aliases?: Partial<Record<CanonicalSubtokenRole, string>>,
): SubTokenCheckResult {
  const normalizedTokens = new Set(colorTokenNames.map(normalize));
  const satisfied = new Set<CanonicalSubtokenRole>();
  const missing: CanonicalSubtokenRole[] = [];
  const findings: Finding[] = [];

  for (const role of CANONICAL_SUBTOKEN_ROLES) {
    if (normalizedTokens.has(role)) {
      satisfied.add(role);
      continue;
    }
    const aliased = aliases?.[role];
    if (aliased && normalizedTokens.has(normalize(aliased))) {
      satisfied.add(role);
      continue;
    }
    missing.push(role);
    findings.push({
      severity: 'info',
      message: `${ATELIER_MISSING_ROLE}: canonical role "${role}" has no satisfying token. See spec/DESIGN.md.spec.md §3 — declare it directly or via the \`aliases\` block.`,
    });
  }

  return { satisfied, missing, findings };
}

/** Extract color token names from an upstream LintReport. */
export function extractColorTokenNames(report: LintReport): string[] {
  const names: string[] = [];
  // Upstream model stores color tokens under designSystem with role-typed
  // resolved values. We walk the documentSections for the canonical 'colors'
  // section and extract token names from the YAML structure when present.
  const ds = report.designSystem as unknown as Record<string, unknown>;
  const candidates = ['tokens', 'colors', 'color'];
  for (const key of candidates) {
    const block = ds[key];
    if (block && typeof block === 'object' && !Array.isArray(block)) {
      for (const k of Object.keys(block as Record<string, unknown>)) {
        names.push(k);
      }
    }
  }
  return names;
}
