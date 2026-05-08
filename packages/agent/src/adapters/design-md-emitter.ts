/**
 * DESIGN.md emitter — pure compose logic for the canonical 8-role token
 * shape (saas-dashboard template) with per-build-category overrides and
 * Figma role-mapping overrides applied on top.
 *
 * No fs writes here — `pipeline/scaffold.ts` owns disk I/O.
 *
 * BASELINE: copied verbatim from packages/atlas/shards/saas-dashboard.md
 *           lines 104-219 (the "Default DESIGN.md template" block).
 *           Hex SRGB flat (NOT HSL nesting); canonical key is `rounded`
 *           (NOT `radii`); component sub-tokens limited to the eight
 *           accepted keys.
 *
 * CATEGORY_OVERRIDES: per-category brand-axis overrides only — primary,
 *                     ring, sometimes accent, sometimes background tone.
 *                     Atlas spec defaults remain unchanged for unmapped
 *                     roles.
 *
 * Figma override: when figmaContext is provided, COLOR variables are
 *                 mapped to canonical roles via inferRole(). First match
 *                 per role wins (atlas baseline first, then figma's first
 *                 match per role). The hex from Figma overrides whatever
 *                 the atlas table specified for that role.
 */

import type { BuildCategory } from '@atelier-oss/atlas';
import type { FigmaContext } from './figma';
import type { AtlasContextResult } from './atlas-context';
import { inferRole, type VariableRole } from '../prompts/figma-context';

/** A scaffolded file ready to write to disk. Re-exported from `types.ts`. */
export interface ScaffoldedFile {
  path: string;
  content: string;
}

export interface ComposeDesignMdInput {
  atlasContext?: AtlasContextResult;
  figmaContext?: FigmaContext;
  /** Optional explicit project name. When omitted, derived from figma file
   * name → atlas exemplars[0] → "Untitled Project". */
  projectName?: string;
}

// -------------------------------------------------------------------------
// BASELINE — saas-dashboard "Default DESIGN.md template" verbatim.
// -------------------------------------------------------------------------

/** All canonical color tokens from the saas-dashboard baseline. */
const BASELINE_COLORS: Record<string, string> = {
  background: '#FAFAFA',
  foreground: '#18181B',
  card: '#FFFFFF',
  'card-foreground': '#18181B',
  popover: '#FFFFFF',
  'popover-foreground': '#18181B',
  muted: '#F4F4F5',
  'muted-foreground': '#52525B',
  border: '#E4E4E7',
  input: '#E4E4E7',
  primary: '#4F46E5',
  'primary-foreground': '#FFFFFF',
  secondary: '#F4F4F5',
  'secondary-foreground': '#18181B',
  accent: '#F4F4F5',
  'accent-foreground': '#18181B',
  destructive: '#E11D48',
  'destructive-foreground': '#FFFFFF',
  ring: '#4F46E5',
  'status-success': '#16A34A',
  'status-warning': '#F59E0B',
  'status-error': '#E11D48',
  'status-info': '#0EA5E9',
  'sidebar-background': '#F4F4F5',
  'sidebar-foreground': '#18181B',
  'sidebar-primary': '#4F46E5',
  'sidebar-accent': '#E4E4E7',
};

// -------------------------------------------------------------------------
// CATEGORY_OVERRIDES — only the brand axis; everything else inherits.
// -------------------------------------------------------------------------

const CATEGORY_OVERRIDES: Partial<Record<BuildCategory, Partial<Record<string, string>>>> = {
  'multi-llm-synthesis': {
    primary: '#7C3AED',
    ring: '#7C3AED',
  },
  'marketing-landing': {
    primary: '#0EA5E9',
    accent: '#F59E0B',
  },
  'conversational-agent-ui': {
    primary: '#10B981',
    background: '#FAFAFA',
    foreground: '#18181B',
  },
  'trading-analytics': {
    background: '#09090B',
    foreground: '#FAFAFA',
    card: '#18181B',
    border: '#27272A',
    muted: '#27272A',
    primary: '#22C55E',
    ring: '#22C55E',
  },
  'internal-ops': {
    primary: '#475569',
    accent: '#94A3B8',
  },
  'marketplace-listing': {
    primary: '#F97316',
    accent: '#FACC15',
  },
  'cinematic-hero-catalog': {
    background: '#0A0A0A',
    foreground: '#FAFAFA',
    card: '#18181B',
    border: '#262626',
    primary: '#FAFAFA',
    'primary-foreground': '#0A0A0A',
    ring: '#FAFAFA',
  },
};

// -------------------------------------------------------------------------
// Compose — merge BASELINE + category override + figma override.
// -------------------------------------------------------------------------

/**
 * Roles that figma can override. Must match VariableRole minus 'unmapped'.
 * Listed as plain strings so the `Record<string,string>` color map keys
 * line up directly.
 */
const FIGMA_OVERRIDABLE_ROLES: ReadonlyArray<Exclude<VariableRole, 'unmapped'>> = [
  'primary',
  'background',
  'foreground',
  'muted',
  'accent',
  'border',
  'ring',
  'card',
];

/**
 * Apply Figma role-mapping overrides to a colors map. First match per
 * role wins — once a role has been overridden, later variables for the
 * same role are ignored.
 */
function applyFigmaOverrides(
  colors: Record<string, string>,
  figmaContext: FigmaContext,
): Record<string, string> {
  const claimed = new Set<string>();
  const next = { ...colors };
  for (const variable of figmaContext.variables) {
    if (variable.type !== 'COLOR' || !variable.value) continue;
    const role = inferRole(variable.name);
    if (role === 'unmapped') continue;
    if (claimed.has(role)) continue;
    if (!FIGMA_OVERRIDABLE_ROLES.includes(role)) continue;
    next[role] = variable.value;
    claimed.add(role);
  }
  return next;
}

/**
 * Resolve the project name from the available signals.
 * Order: explicit `projectName` arg → figma file name → first atlas
 * exemplar → "Untitled Project".
 */
function resolveName(input: ComposeDesignMdInput): string {
  if (input.projectName?.trim()) return input.projectName.trim();
  if (input.figmaContext?.fileName?.trim()) return input.figmaContext.fileName.trim();
  const exemplar = input.atlasContext?.atlas.exemplars[0];
  if (exemplar) return exemplar;
  return 'Untitled Project';
}

function resolveDescription(name: string, category: BuildCategory | null): string {
  const subject = category ? `${category} tokens` : 'Design tokens';
  return `${subject} for ${name}. Bootstrapped by Atelier Design Agent v0.4.0 (Phase 2.x scaffolder).`;
}

// -------------------------------------------------------------------------
// YAML emitter — fixed-shape string template. No yaml-stringify dep.
// -------------------------------------------------------------------------

/**
 * Quote a YAML scalar value. Hex strings need quoting (because `#` would
 * otherwise be parsed as a comment); plain identifiers can be emitted bare.
 * For consistency with the source template we always quote color hexes.
 */
function quoteHex(hex: string): string {
  return `"${hex}"`;
}

/** Emit the colors block in the canonical order. */
function emitColors(colors: Record<string, string>): string {
  const order = Object.keys(BASELINE_COLORS);
  const lines = order.map((key) => `  ${key}: ${quoteHex(colors[key] ?? BASELINE_COLORS[key]!)}`);
  return `colors:\n${lines.join('\n')}`;
}

const TYPOGRAPHY_BLOCK = `typography:
  display:
    fontFamily: Inter
    fontSize: 1.875rem
    fontWeight: 600
    lineHeight: 2.25rem
  heading-page:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 2rem
  heading-section:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.75rem
  body:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.25rem
  caption:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1rem
  mono-sm:
    fontFamily: Geist Mono
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.25rem`;

const SPACING_BLOCK = `spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  2xl: 3rem`;

const ROUNDED_BLOCK = `rounded:
  sm: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem`;

const COMPONENTS_BLOCK = `components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    typography: "{typography.body-sm}"
    height: "2.25rem"
  data-table-row:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-sm}"
    padding: "{spacing.sm}"`;

/**
 * Compose a full DESIGN.md body (YAML frontmatter only) from atlas + figma.
 *
 * Returns the file contents as a string. Caller is responsible for writing
 * to disk.
 */
export function composeDesignMd(input: ComposeDesignMdInput): string {
  const category = input.atlasContext?.atlas.category ?? null;

  // Step 1: BASELINE colors.
  let colors: Record<string, string> = { ...BASELINE_COLORS };

  // Step 2: apply category override.
  if (category) {
    const overrides = CATEGORY_OVERRIDES[category];
    if (overrides) {
      for (const [key, value] of Object.entries(overrides)) {
        if (typeof value === 'string') {
          colors[key] = value;
        }
      }
    }
  }

  // Step 3: apply figma role overrides (first-match-wins per role).
  if (input.figmaContext) {
    colors = applyFigmaOverrides(colors, input.figmaContext);
  }

  const name = resolveName(input);
  const description = resolveDescription(name, category);

  const body = [
    '---',
    'version: alpha',
    `name: ${name}`,
    `description: ${description}`,
    emitColors(colors),
    TYPOGRAPHY_BLOCK,
    SPACING_BLOCK,
    ROUNDED_BLOCK,
    COMPONENTS_BLOCK,
    '---',
    '',
  ].join('\n');

  return body;
}
