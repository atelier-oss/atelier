/**
 * Intake phase — validate and normalize the run input.
 *
 * Phase 0: validates that brief is non-empty.
 * Phase 2: when cwd is set, calls atlas fingerprint and attaches the result
 *          (category + preamble) to the normalized input for use in generate.
 */

import { resolveAtlasContext } from '../adapters/atlas-context';
import type { AtlasContextResult } from '../adapters/atlas-context';
import type { RunInput } from '../types';

export interface NormalizedInput {
  brief: string;
  /** Absolute path to a screenshot file, when provided. */
  screenshot?: string;
  /** The resolved atlas context (category + formatted preamble), when cwd was set. */
  atlasContext?: AtlasContextResult;
}

export async function intake(input: RunInput): Promise<NormalizedInput> {
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

  return normalized;
}
