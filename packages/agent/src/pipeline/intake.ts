/**
 * Intake phase -- validate and normalize the run input.
 *
 * Phase 0: validates that brief is non-empty.
 * Phase 2: when cwd is set, calls atlas fingerprint and attaches the result
 *          (category + preamble) to the normalized input for use in generate.
 * Phase 3a: when figma is set, calls loadFigmaContext and attaches the result
 *           to the normalized input for use in generate.
 */

import { resolveAtlasContext } from '../adapters/atlas-context';
import type { AtlasContextResult } from '../adapters/atlas-context';
import { loadFigmaContext } from '../adapters/figma';
import type { FigmaContext } from '../adapters/figma';
import type { RunInput } from '../types';

export interface NormalizedInput {
  brief: string;
  /** Absolute path to a screenshot file, when provided. */
  screenshot?: string;
  /** The resolved atlas context (category + formatted preamble), when cwd was set. */
  atlasContext?: AtlasContextResult;
  /** The resolved Figma context (variables + styles), when figma was set. */
  figmaContext?: FigmaContext;
}

export async function intake(
  input: RunInput,
  figmaToken?: string,
): Promise<NormalizedInput> {
  const brief = input.brief?.trim() ?? '';
  if (brief.length === 0) {
    throw new Error('Agent.run: brief must be a non-empty string');
  }

  const normalized: NormalizedInput = { brief };

  if (input.screenshot) {
    normalized.screenshot = input.screenshot;
  }

  if (input.cwd) {
    try {
      normalized.atlasContext = await resolveAtlasContext(input.cwd);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Agent.run: atlas fingerprint failed for cwd "${input.cwd}": ${msg}`,
      );
    }
  }

  if (input.figma) {
    const token = figmaToken ?? process.env.FIGMA_TOKEN;
    if (!token) {
      throw new Error(
        'Agent.run: input.figma is set but no Figma token was found. ' +
          'Pass opts.figmaToken or set the FIGMA_TOKEN environment variable.',
      );
    }
    try {
      normalized.figmaContext = await loadFigmaContext(input.figma, token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Agent.run: Figma context load failed: ${msg}`);
    }
  }

  return normalized;
}
