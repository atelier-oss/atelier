/**
 * Intake phase — validate and normalize the run input.
 *
 * Phase 0 only validates that brief is non-empty. Phase 1+ adds mode
 * inference, screenshot/figma input parsing, and atlas fingerprint kickoff.
 */

import type { RunInput } from '../types';

export interface NormalizedInput {
  brief: string;
}

export function intake(input: RunInput): NormalizedInput {
  const brief = input.brief?.trim() ?? '';
  if (brief.length === 0) {
    throw new Error('Agent.run: brief must be a non-empty string');
  }
  return { brief };
}
