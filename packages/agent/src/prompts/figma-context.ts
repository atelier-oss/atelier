/**
 * Figma context preamble -- injected into the system prompt when a FigmaContext
 * is attached to the run (Phase 3a).
 *
 * The preamble:
 *   1. Names the Figma file and its key.
 *   2. Lists COLOR variables grouped into inferred role mappings.
 *   3. Instructs the model to use role tokens rather than inlined hex values.
 *
 * Non-COLOR variables (FLOAT, STRING, BOOLEAN) are skipped -- they carry
 * spacing/radius/boolean values that are not yet mapped to Tailwind tokens.
 *
 * Role heuristics: match substrings in the lowercased variable name.
 */

import type { FigmaContext, FigmaVariable } from '../adapters/figma';

// Each entry: [role label, [...substrings to match in the variable name]]
// Earlier entries win (first match wins when multiple keywords apply).
//
// Order matters because keyword sets overlap. Specific roles come BEFORE
// generic ones so a name like `color/text-muted` resolves to `muted` (not
// `foreground`) — the muted-ness is the more meaningful classification.
//
// `text` is intentionally NOT a foreground keyword: it's too broad and
// would false-fire on every `text-{anything}` name. `color/text` (the bare
// case) falls through to `unmapped` — the LLM still sees it in the
// preamble's unmapped section and can use the hex with judgement.
const ROLE_HEURISTICS: Array<[string, string[]]> = [
  ['muted',      ['muted', 'secondary-text', 'subdued']],
  ['accent',     ['accent', 'secondary-action', 'highlight']],
  ['border',     ['border', 'divider', 'hairline']],
  ['ring',       ['ring', 'focus']],
  ['card',       ['card', 'elevated']],
  ['primary',    ['primary', 'brand', 'cta']],
  ['background', ['background', 'bg', 'canvas', 'surface-page', 'surface']],
  ['foreground', ['foreground', 'ink']],
];

export type VariableRole =
  | 'primary'
  | 'background'
  | 'foreground'
  | 'muted'
  | 'accent'
  | 'border'
  | 'ring'
  | 'card'
  | 'unmapped';

/** Infer a design-system role from a variable name. */
export function inferRole(name: string): VariableRole {
  const lower = name.toLowerCase();
  for (const [role, keywords] of ROLE_HEURISTICS) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return role as VariableRole;
    }
  }
  return 'unmapped';
}

interface MappedVariable {
  name: string;
  hex: string;
  role: VariableRole;
}

function buildVariableTable(variables: FigmaVariable[]): {
  table: string;
  mappedCount: number;
} {
  const colorVars = variables.filter((v) => v.type === 'COLOR' && v.value);
  if (colorVars.length === 0) {
    return { table: '_No COLOR variables found in this file._', mappedCount: 0 };
  }

  const mapped: MappedVariable[] = colorVars.map((v) => ({
    name: v.name,
    hex: v.value,
    role: inferRole(v.name),
  }));

  const mappedCount = mapped.filter((m) => m.role !== 'unmapped').length;

  const header = '| Figma variable | Hex | Role |';
  const divider = '|---|---|---|';
  const rows = mapped.map((m) => `| ${m.name} | ${m.hex} | ${m.role} |`);

  return {
    table: [header, divider, ...rows].join('\n'),
    mappedCount,
  };
}

/**
 * Build the "## Figma file context" preamble from a resolved FigmaContext.
 *
 * Prepended to the system prompt after the atlas-context preamble (when
 * both are present). The figma-context preamble is more specific and
 * overrides category defaults for any color named in the file.
 */
export function buildFigmaContextPreamble(ctx: FigmaContext): string {
  const { table, mappedCount: _ } = buildVariableTable(ctx.variables);

  return `## Figma file context

Source: "${ctx.fileName}" (file key ${ctx.fileKey})

Variable -> role mapping (canonical role on the right):

${table}

When the brief references any color that this file declares -- by brand name,
role name, or description (e.g. "the brand orange", "primary CTA color",
"the muted text") -- use the corresponding role token from the "Role" column
above. Do NOT inline the hex value; do NOT invent palette refs. Emit the
semantic role as a Tailwind token prefix (e.g. \`bg-primary\`, \`text-foreground\`,
\`border-border\`). The hex values above are documentation only.`;
}
