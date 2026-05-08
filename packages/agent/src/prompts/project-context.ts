/**
 * Project context preamble — injected into the system prompt when atlas
 * resolves a build category for the given project root (Phase 2).
 *
 * The preamble biases token choices toward the category's defaults while
 * reinforcing that explicit DESIGN.md tokens always take precedence.
 */

import type { BuildCategory } from '@atelier-oss/atlas';

const CATEGORY_HINTS: Record<
  BuildCategory,
  { palette: string; tips: string[] }
> = {
  'saas-dashboard': {
    palette: 'zinc + indigo + cmdk vibes',
    tips: [
      'Prefer indigo-tinted primary (the project likely uses bg-primary mapped to indigo)',
      'Use foreground/background neutrals (zinc-equivalent in tokens)',
      'Status color discipline matters (success/warn/error/info as semantic tokens, not raw)',
    ],
  },
  'multi-llm-synthesis': {
    palette: 'slate + violet + prose-focused',
    tips: [
      'Prefer violet-tinted accent tokens for AI-generated content surfaces',
      'Use bg-muted / text-muted-foreground for secondary context panels',
      'Emphasis on readability — generous text-foreground, minimal decoration',
    ],
  },
  'marketing-landing': {
    palette: 'high-contrast hero + brand primary',
    tips: [
      'Hero sections lean on bg-background + text-foreground with a strong primary CTA',
      'Gradient accents belong in bg-gradient-* utility classes, not raw color stops',
      'bg-accent / text-accent-foreground for highlight chips and badges',
    ],
  },
  'conversational-agent-ui': {
    palette: 'neutral + subtle brand accent',
    tips: [
      'Chat bubbles: bg-muted (assistant), bg-primary / text-primary-foreground (user)',
      'Input area: bg-background border-border',
      'Status indicators: use ring / ring-ring for active focus states',
    ],
  },
  'trading-analytics': {
    palette: 'dark-first + data-dense tokens',
    tips: [
      'Prefer bg-card for data panels with border-border dividers',
      'Status semantic tokens for gain/loss (bg-destructive, custom success token)',
      'Dense typography: text-muted-foreground for secondary labels, text-foreground for values',
    ],
  },
  'internal-ops': {
    palette: 'neutral utilitarian',
    tips: [
      'Functional over decorative — bg-background, bg-card, bg-muted as the three surfaces',
      'Action hierarchy: bg-primary CTA, bg-secondary secondary, bg-muted tertiary',
      'table rows: bg-card with hover:bg-muted transition',
    ],
  },
  'marketplace-listing': {
    palette: 'card-grid + commerce CTA',
    tips: [
      'Product cards: bg-card border-border with rounded-lg',
      'Primary CTA: bg-primary text-primary-foreground — high contrast required',
      'Price/badge: bg-accent text-accent-foreground or bg-muted text-muted-foreground',
    ],
  },
  'cinematic-hero-catalog': {
    palette: 'dark overlay + minimal text-foreground',
    tips: [
      'Full-bleed imagery — overlay via bg-background/80 or bg-foreground/20 translucent tokens',
      'text-foreground on dark overlays; avoid raw white for copy',
      'CTA buttons: bg-primary text-primary-foreground with generous padding',
    ],
  },
};

export interface ProjectContextPreambleInput {
  category: BuildCategory;
  exemplars: string[];
}

/**
 * Build the "## Project context" preamble to prepend to the system prompt.
 *
 * Format: markdown h2 block that names the category, lists the vibes, and
 * enumerates 2-3 token-preference tips. Always ends with the over-ride reminder.
 */
export function buildProjectContextPreamble(
  input: ProjectContextPreambleInput,
): string {
  const { category, exemplars } = input;
  const hint = CATEGORY_HINTS[category] ?? {
    palette: 'project-specific defaults',
    tips: ['Use semantic tokens as the contract; avoid raw palette refs'],
  };

  const exemplarList =
    exemplars.length > 0
      ? exemplars.slice(0, 3).join(', ')
      : 'project fleet';

  const tipsBlock = hint.tips
    .map((tip) => `- ${tip}`)
    .join('\n');

  return `## Project context

This project's atlas fingerprint matches: **${category}** (${hint.palette}; exemplars: ${exemplarList}).

Bias your token choices toward this category's defaults. Specifically:
${tipsBlock}

Tokens are the contract regardless. Project context informs which TOKEN names you favor when the brief is ambiguous.`;
}
