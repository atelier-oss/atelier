/**
 * Verify phase — score the emitted code via @atelier-oss/classify.
 *
 * Phase 0 uses scoreText on a single concatenated string of all emitted
 * files. No temp-directory walk needed; classify exposes a synchronous
 * text scorer that's identical to scoreRepo's per-file mechanic.
 *
 * Phase 1+ will replace this with a closed-loop iteration: if conformance
 * < threshold, prompt the model to rewrite raw refs and re-score.
 */

import { scoreText, type ScoreResult } from '@atelier-oss/classify';
import type { CodeFile } from '../types';

export function verify(code: CodeFile[]): { classify: ScoreResult } {
  const concat = code.map((f) => f.content).join('\n');
  const classify = scoreText(concat);
  return { classify };
}
