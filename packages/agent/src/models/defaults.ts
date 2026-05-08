/**
 * Pinned model IDs per CARL [OPUS-4-7] rule 0:
 * - Opus tier:   claude-opus-4-7
 * - Sonnet:      claude-sonnet-4-6
 * - Haiku:       claude-haiku-4-5
 *
 * No aliases in production-critical paths.
 *
 * Phase 0 only uses Sonnet for codegen. Phase 1+ adds Opus for orchestration
 * and Haiku for classify retries.
 */

export const DEFAULT_CODEGEN_MODEL = 'claude-sonnet-4-6' as const;
export const DEFAULT_MAX_OUTPUT_TOKENS = 16384 as const;

/**
 * Per-million-token pricing snapshot (2026-05-08, USD).
 * Used for `RunCost.usd` cost rollups. Not authoritative — refresh from
 * Anthropic's pricing page when materially out of date.
 */
export const PRICING_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-opus-4-7': { input: 15, output: 75 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

export function estimateUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING_USD_PER_MTOK[model];
  if (!p) {
    process.stderr.write(
      `[atelier-agent] warning: no pricing snapshot for model "${model}"; cost will be reported as $0. Add it to PRICING_USD_PER_MTOK in packages/agent/src/models/defaults.ts.\n`,
    );
    return 0;
  }
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}
