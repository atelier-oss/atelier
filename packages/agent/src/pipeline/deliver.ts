/**
 * Deliver phase — assemble the result without trace. The orchestrator
 * (index.ts) owns the trace and attaches it after this function returns,
 * so deliver doesn't depend on a shared mutable trace reference.
 *
 * Phase 1+ adds persistence to <project>/.atelier-agent/runs/{ts}/ with diffs.
 */

import { estimateUsd } from '../models/defaults';
import type { CodeFile, RunCost } from '../types';
import type { ScoreResult } from '@atelier-oss/classify';

export interface DeliverInput {
  code: CodeFile[];
  classify: ScoreResult;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface DeliverOutput {
  code: CodeFile[];
  scores: { classify: ScoreResult };
  cost: RunCost;
}

export function deliver(input: DeliverInput): DeliverOutput {
  const cost: RunCost = {
    input_tokens: input.inputTokens,
    output_tokens: input.outputTokens,
    usd: estimateUsd(input.model, input.inputTokens, input.outputTokens),
  };
  return {
    code: input.code,
    scores: { classify: input.classify },
    cost,
  };
}
