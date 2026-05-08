/**
 * Scaffold phase — one-shot DESIGN.md emitter.
 *
 * Phase 2.x: when the agent has resolved either an atlas category or a
 * Figma context (or both), and `<cwd>/DESIGN.md` does not exist, and the
 * user opted in via `RunInput.scaffoldDesignMd: true`, write a canonical
 * `DESIGN.md` to disk.
 *
 * Skip semantics:
 *   - 'no-context'      → neither atlas category nor figma is present.
 *   - 'already-exists'  → `<cwd>/DESIGN.md` is already on disk; never
 *                          clobber a user file.
 *
 * Pure orchestration: the compose logic lives in
 * `adapters/design-md-emitter.ts`. This module only owns disk I/O.
 */

import { access, writeFile, constants } from 'node:fs/promises';
import * as path from 'node:path';

import type { AtlasContextResult } from '../adapters/atlas-context';
import type { FigmaContext } from '../adapters/figma';
import { composeDesignMd, type ScaffoldedFile } from '../adapters/design-md-emitter';

export interface ScaffoldInput {
  cwd: string;
  atlasContext?: AtlasContextResult;
  figmaContext?: FigmaContext;
}

export interface ScaffoldOutput {
  scaffoldedFiles: ScaffoldedFile[];
  /** Reason the scaffold was skipped (when scaffoldedFiles is empty). */
  skipReason?: 'no-context' | 'already-exists';
}

async function fileExists(target: string): Promise<boolean> {
  try {
    await access(target, constants.F_OK);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') return false;
    // Any other error (EACCES, EBUSY, etc.) is treated as "exists" so we
    // do NOT clobber a file we cannot stat.
    return true;
  }
}

export async function scaffoldDesignMd(input: ScaffoldInput): Promise<ScaffoldOutput> {
  const hasAtlas = Boolean(input.atlasContext?.atlas.category);
  const hasFigma = Boolean(input.figmaContext);

  if (!hasAtlas && !hasFigma) {
    return { scaffoldedFiles: [], skipReason: 'no-context' };
  }

  const target = path.join(input.cwd, 'DESIGN.md');

  if (await fileExists(target)) {
    return { scaffoldedFiles: [], skipReason: 'already-exists' };
  }

  const content = composeDesignMd({
    atlasContext: input.atlasContext,
    figmaContext: input.figmaContext,
  });

  await writeFile(target, content, 'utf8');

  return {
    scaffoldedFiles: [{ path: target, content }],
  };
}
