import { defineCommand } from 'citty';
import { scoreRepo, type RepoScoreResult } from '@atelier/classify';
import type { Format } from './lint';

export interface RunClassifyOptions {
  path: string;
  format?: Format;
}

export interface RunClassifyResult {
  result: RepoScoreResult;
  output: string;
}

export async function runClassify(options: RunClassifyOptions): Promise<RunClassifyResult> {
  const result = await scoreRepo(options.path);
  const format = options.format ?? 'stdout';

  let output: string;
  if (format === 'json') {
    output = JSON.stringify(
      {
        rootPath: result.rootPath,
        filesScanned: result.filesScanned,
        filesWithSignal: result.filesWithSignal,
        tokens: result.tokens,
        raw: result.raw,
        conformance: result.conformance,
      },
      null,
      2,
    );
  } else if (format === 'md') {
    const conf = result.conformance != null ? `${(result.conformance * 100).toFixed(1)}%` : 'n/a';
    output = `# Classify: ${result.rootPath}\n\nfiles=${result.filesWithSignal}/${result.filesScanned} tokens=${result.tokens} raw=${result.raw} conformance=${conf}\n`;
  } else {
    const conf = result.conformance != null ? `${(result.conformance * 100).toFixed(1)}%` : 'n/a';
    output = `${result.rootPath}: files=${result.filesWithSignal}/${result.filesScanned} tokens=${result.tokens} raw=${result.raw} conformance=${conf}\n`;
  }

  return { result, output };
}

export const classifyCommand = defineCommand({
  meta: {
    name: 'classify',
    description: 'Score a project for token-vs-raw conformance.',
  },
  args: {
    path: {
      type: 'positional',
      description: 'Project root (defaults to cwd).',
      required: false,
    },
    format: {
      type: 'string',
      description: 'Output format: stdout (default), json, md.',
      default: 'stdout',
    },
  },
  async run({ args }) {
    const path = args.path ?? process.cwd();
    const format = args.format as Format;
    const { output } = await runClassify({ path, format });
    process.stdout.write(output);
  },
});
