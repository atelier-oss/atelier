/**
 * Deliver phase — assemble the RunResult.
 *
 * Phase 0 just collates intermediate phase outputs. Phase 1+ adds
 * persistence to <project>/.atelier-agent/runs/{ts}/ with diffs.
 */

import { estimateUsd } from '../models/defaults';
import type { CodeFile, RunCost, RunResult, RunTraceEntry } from '../types';
import type { ScoreResult } from '@atelier-oss/classify';

export interface DeliverInput {
  code: CodeFile[];
  classify: ScoreResult;
  trace: RunTraceEntry[];
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export function deliver(input: DeliverInput): RunResult {
  const cost: RunCost = {
    input_tokens: input.inputTokens,
    output_tokens: input.outputTokens,
    usd: estimateUsd(input.model, input.inputTokens, input.outputTokens),
  };
  return {
    code: input.code,
    scores: { classify: input.classify },
    trace: input.trace,
    cost,
  };
}
