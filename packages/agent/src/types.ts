/** Public types for @atelier-oss/agent (Phase 0). */

import type { ScoreResult } from '@atelier-oss/classify';

/** Input to Agent.run(). Brief is the only required field in Phase 0. */
export interface RunInput {
  brief: string;
}

/** A single emitted file from the codegen phase. */
export interface CodeFile {
  /** Suggested relative path, e.g. "PricingTiers.tsx". */
  path: string;
  /** TSX/JSX/TS source emitted by the model. */
  content: string;
}

/** One entry in the run trace — ordered by execution. */
export interface RunTraceEntry {
  phase: 'intake' | 'generate' | 'verify' | 'iterate' | 'deliver';
  /** ISO-8601 timestamp at phase start. */
  startedAt: string;
  /** Wall-clock duration of the phase in ms. */
  durationMs: number;
  /** Phase-specific notes — model used, score, etc. Stable enough to log. */
  notes?: Record<string, unknown>;
}

/** Per-iteration record from the rewrite loop. */
export interface IterationRecord {
  /** 0-indexed iteration number; 0 = initial generate, ≥1 = rewrite passes. */
  n: number;
  /** Conformance score after this iteration; null when no signal. */
  conformance: number | null;
  /** Raw palette refs counted; informs whether to keep iterating. */
  raw: number;
  /** Tokens counted. */
  tokens: number;
  /**
   * Wall-clock for the rewrite API call + classify pass. Always 0 for n=0
   * (the initial generate's duration is recorded separately on the
   * trace entry with phase='generate').
   */
  durationMs: number;
}

/** Token + USD cost roll-up for a single Agent.run(). */
export interface RunCost {
  input_tokens: number;
  output_tokens: number;
  /** Best-effort USD estimate from the SDK's input/output token pricing. */
  usd: number;
}

/** Result of Agent.run(). */
export interface RunResult {
  code: CodeFile[];
  scores: {
    classify: ScoreResult;
  };
  trace: RunTraceEntry[];
  cost: RunCost;
  /** Iteration history — empty when iterate=0 (Phase 0 mode). */
  iterations: IterationRecord[];
}

/** Per-run model overrides. Phase 0 only uses `codegen`. */
export interface ModelOpts {
  /** The codegen model. Defaults to 'claude-sonnet-4-6' per CARL [OPUS-4-7] rule 0. */
  codegen?: string;
}

/** Agent constructor options. */
export interface AgentOptions {
  /** API key. Falls back to ANTHROPIC_API_KEY env var. */
  apiKey?: string;
  /** Model overrides. */
  models?: ModelOpts;
  /** max_tokens for codegen calls. Default 16384. */
  maxOutputTokens?: number;
  /**
   * Max number of rewrite iterations after the initial generate.
   * 0 disables the loop (Phase 0 behavior). Default: 3.
   */
  iterate?: number;
  /**
   * Conformance threshold (0..1). Iteration stops when classify
   * conformance ≥ threshold. Default: 0.95.
   */
  threshold?: number;
}
