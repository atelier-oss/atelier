/**
 * Rewrite-phase user-message template.
 *
 * Phase 1 contract: the rewrite is the model's second chance to satisfy
 * the brief without using raw palette refs. The prompt is intentionally
 * direct — the empirical findings from the Phase 0 v2 gate showed that
 * the model resists literal palette names in briefs (#F47B20, amber-500
 * cleared at 75%+) but capitulates to descriptive color metaphors
 * ("warm coral", "dusty teal" → 0% conformance).
 *
 * The rewrite tells the model exactly what failed in classify terms,
 * then enumerates the role-mapping it should apply for color language.
 */

export interface RewriteInput {
  brief: string;
  priorCode: string;
  conformance: number | null;
  tokens: number;
  raw: number;
  iteration: number;
}

const PALETTE_LIST = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime',
  'green', 'emerald', 'teal', 'cyan', 'sky',
  'blue', 'indigo', 'violet', 'purple', 'fuchsia',
  'pink', 'rose',
].join(', ');

export function buildRewriteUserMessage(input: RewriteInput): string {
  const conformanceLine =
    input.conformance === null
      ? 'Your previous emission produced no scoreable color/spacing tokens.'
      : `Your previous emission scored ${(input.conformance * 100).toFixed(1)}% on token-vs-raw conformance — ${input.tokens} valid tokens, ${input.raw} raw palette references.`;

  return `Rewrite pass ${input.iteration} for this brief:

${input.brief.trim()}

${conformanceLine}

Below is the full prior emission:

\`\`\`tsx
${input.priorCode}
\`\`\`

A class is a CONFORMANCE FAILURE when it matches any of these prefix-patterns for any palette in {${PALETTE_LIST}}: \`bg-{palette}-{shade}\`, \`text-{palette}-{shade}\`, \`border-{palette}-{shade}\`, \`ring-{palette}-{shade}\`, \`fill-{palette}-{shade}\`, \`stroke-{palette}-{shade}\`, \`outline-{palette}-{shade}\`, \`divide-{palette}-{shade}\`, \`placeholder-{palette}-{shade}\`, \`caret-{palette}-{shade}\`, \`accent-{palette}-{shade}\`, \`from-{palette}-{shade}\`, \`to-{palette}-{shade}\`, \`via-{palette}-{shade}\`, \`shadow-{palette}-{shade}\`, \`decoration-{palette}-{shade}\`. The classifier scores all 16 of these prefixes — every match is a raw ref.

Rewrite the component using ONLY semantic Tailwind tokens. No palette shade references. Map the brief's color language to canonical roles, not to palette shades:

- "warm coral" / "primary" / "brand color" / "CTA fill" → \`bg-primary\` / \`text-primary-foreground\` / \`border-primary\` / \`ring-primary\`
- "dusty teal" / "accent" / "secondary action" / "highlight" → \`bg-accent\` / \`text-accent-foreground\`
- "soft cream" / "canvas" / "background" / "page surface" → \`bg-background\`
- "muted" / "secondary text" / "low-contrast" / "caption" → \`bg-muted\` / \`text-muted-foreground\`
- "border" / "hairline" / "separator" → \`border-border\`
- "card" / "surface" / "elevated panel" → \`bg-card\` / \`text-card-foreground\`
- "destructive" / "error" / "danger" → \`bg-destructive\` / \`text-destructive-foreground\`
- "ring" / "focus indicator" → \`ring-ring\`

Color language in the brief — descriptive metaphors like "warm coral", "dusty teal", "amber and teal glow" — names the project's tokens, NOT a Tailwind palette. Treat every such phrase as a role-token instruction, never as a palette instruction.

Utility colors that bypass the design layer are still acceptable: \`white\`, \`black\`, \`transparent\`, \`current\`, \`inherit\`. State variants like \`hover:bg-primary/90\`, \`focus-visible:ring-2\`, \`disabled:opacity-50\` are correct uses of tokens.

Output one tsx code block, default-exported function. Same shape, fewer raw refs, ideally zero. No prose, no explanation, no second block.`;
}
