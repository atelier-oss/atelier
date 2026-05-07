import { defineCommand } from 'citty';
import { fingerprint, loadCategories, type BuildCategory } from '@atelier/atlas';
import type { Format } from './lint';

export interface RunAtlasListResult {
  categories: readonly BuildCategory[];
  output: string;
}

/** Single source of truth: read from @atelier/atlas (which reads categories.json). */
function getBuildCategories(): readonly BuildCategory[] {
  return loadCategories().categories.map((c) => c.slug);
}

export function runAtlasList(format: Format = 'stdout'): RunAtlasListResult {
  const categories = getBuildCategories();
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

export interface RunAtlasFingerprintOptions {
  path: string;
  format?: Format;
}

export function runAtlasFingerprint(options: RunAtlasFingerprintOptions): {
  output: string;
  category: BuildCategory | null;
} {
  const r = fingerprint(options.path);
  const format = options.format ?? 'stdout';
  let output: string;
  if (format === 'json') {
    output = JSON.stringify(
      {
        rootPath: r.rootPath,
        category: r.category,
        exemplars: r.exemplars,
        shardPath: r.shardPath,
      },
      null,
      2,
    );
  } else if (format === 'md') {
    output = `# Fingerprint: ${r.rootPath}\n\ncategory: ${r.category ?? 'unknown'}\n`;
  } else {
    output = `${r.rootPath}: category=${r.category ?? 'unknown'}\n`;
  }
  return { output, category: r.category };
}

export const atlasCommand = defineCommand({
  meta: {
    name: 'atlas',
    description: 'Build-category atlas. Subcommands: list, fingerprint.',
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
    fingerprint: defineCommand({
      meta: {
        name: 'fingerprint',
        description: 'Fingerprint a project root and print its category.',
      },
      args: {
        path: {
          type: 'positional',
          description: 'Project root (defaults to cwd).',
          required: false,
        },
        format: { type: 'string', description: 'stdout|json|md', default: 'stdout' },
      },
      run({ args }) {
        const path = (typeof args.path === 'string' && args.path) || process.cwd();
        const { output } = runAtlasFingerprint({ path, format: args.format as Format });
        process.stdout.write(output);
      },
    }),
  },
});
