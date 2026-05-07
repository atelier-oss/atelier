import { defineCommand } from 'citty';
import type { Format } from './lint';

/**
 * Phase 2.3 stub. Real fingerprint() lands in Phase 2.5 from @atelier/atlas.
 * For 2.3, `atelier atlas list` prints the 7 build categories so the
 * golden-path script has a deterministic output to assert against.
 */

export const BUILD_CATEGORIES = [
  'saas-dashboard',
  'multi-llm-synthesis',
  'marketing-landing',
  'conversational-agent-ui',
  'internal-ops',
  'trading-analytics',
  'marketplace-listing',
] as const;

export interface RunAtlasListResult {
  categories: typeof BUILD_CATEGORIES;
  output: string;
}

export function runAtlasList(format: Format = 'stdout'): RunAtlasListResult {
  const categories = BUILD_CATEGORIES;
  let output: string;
  if (format === 'json') {
    output = JSON.stringify({ categories }, null, 2);
  } else if (format === 'md') {
    output = '# Atlas categories\n\n' + categories.map((c) => `- ${c}`).join('\n') + '\n';
  } else {
    output = categories.join('\n') + '\n';
  }
  return { categories, output };
}

export const atlasCommand = defineCommand({
  meta: {
    name: 'atlas',
    description: 'Build-category atlas. Subcommands: list (Phase 2.5 will add fingerprint).',
  },
  subCommands: {
    list: defineCommand({
      meta: { name: 'list', description: 'Print known build categories.' },
      args: {
        format: { type: 'string', description: 'stdout|json|md', default: 'stdout' },
      },
      run({ args }) {
        const { output } = runAtlasList(args.format as Format);
        process.stdout.write(output);
      },
    }),
  },
});
