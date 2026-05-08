/**
 * Atlas context adapter — call @atelier-oss/atlas fingerprint() on the
 * project root and return the normalized data needed to augment the system
 * prompt.
 *
 * Phase 2 contract: when a cwd is provided, fingerprint it, extract
 * category + exemplars, and return a pre-formatted preamble string.
 * If fingerprint resolves no category, returns null (graceful fallback).
 *
 * DOES NOT write DESIGN.md to disk — that is deferred to Phase 2.x.
 */

import { fingerprint } from '@atelier-oss/atlas';
import type { AtlasResult } from '@atelier-oss/atlas';
import { buildProjectContextPreamble } from '../prompts/project-context';

export interface AtlasContextResult {
  /** The resolved atlas result — stored on NormalizedInput for tracing. */
  atlas: AtlasResult;
  /**
   * The formatted preamble to prepend to the system prompt, or null when no
   * category was resolved (graceful fallback: no augmentation).
   */
  preamble: string | null;
}

/**
 * Fingerprint `cwd` and build the project-context preamble.
 *
 * Throws only if the fingerprint() call itself throws (e.g. the path does
 * not exist). A null category is NOT an error — it means the project
 * couldn't be classified and the agent runs without context.
 */
export async function resolveAtlasContext(cwd: string): Promise<AtlasContextResult> {
  // fingerprint() is synchronous in @atelier-oss/atlas.
  const atlas = fingerprint(cwd);
  const preamble = atlas.category
    ? buildProjectContextPreamble({
        category: atlas.category,
        exemplars: atlas.exemplars,
      })
    : null;

  return { atlas, preamble };
}
