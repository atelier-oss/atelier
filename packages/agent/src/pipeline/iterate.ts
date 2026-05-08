/**
 * Iterate phase — closed-loop rewrite until conformance >= threshold or N exhausted.
 *
 * Phase 1 contract: after the initial generate + verify produce a score,
 * if score < threshold, prompt the model to rewrite raw palette refs as
 * semantic tokens. Re-classify. Repeat up to maxIterations times.
 *
 * Returns the BEST emission seen (highest conformance), not necessarily
 * the last. If a rewrite makes things worse, we keep the prior best.
 *
 * Iteration cost is summed into the run-level cost roll-up by the caller.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { scoreText, type ScoreResult } from '@atelier-oss/classify';
import { buildRewriteUserMessage } from '../prompts/rewrite';
import { SYSTEM_PROMPT } from '../prompts/system';
import type { CodeFile, IterationRecord } from '../types';

export interface IterateInput {
  brief: string;
  initialCode: CodeFile[];
  initialScore: ScoreResult;
  client: Anthropic;
  model: string;
  maxOutputTokens: number;
  maxIterations: number;
  threshold: number;
}

export interface IterateOutput {
  code: CodeFile[];
  classify: ScoreResult;
  iterations: IterationRecord[];
  rewriteUsage: { input_tokens: number; output_tokens: number };
}

const TSX_BLOCK_RE = /```tsx\s*\n([\s\S]*?)\n?```/;
const COMPONENT_NAME_RE = /export\s+default\s+function\s+([A-Za-z_$][A-Za-z0-9_$]*)/;

function extractCode(rawText: string): { content: string; path: string } | null {
  const match = TSX_BLOCK_RE.exec(rawText);
  if (!match || !match[1]) return null;
  const content = match[1].trim();
  const nameMatch = COMPONENT_NAME_RE.exec(content);
  const componentName = nameMatch?.[1] ?? 'Component';
  return { content, path: `${componentName}.tsx` };
}

function meetsThreshold(score: ScoreResult, threshold: number): boolean {
  if (score.conformance === null) return false;
  return score.conformance >= threshold;
}

function isBetter(candidate: ScoreResult, current: ScoreResult): boolean {
  const c = candidate.conformance ?? -1;
  const r = current.conformance ?? -1;
  if (c !== r) return c > r;
  return candidate.raw < current.raw;
}

export async function iterate(input: IterateInput): Promise<IterateOutput> {
  const history: IterationRecord[] = [];

  history.push({
    n: 0,
    conformance: input.initialScore.conformance,
    raw: input.initialScore.raw,
    tokens: input.initialScore.tokens,
    durationMs: 0,
  });

  let bestCode: CodeFile[] = input.initialCode;
  let bestScore: ScoreResult = input.initialScore;
  const rewriteUsage = { input_tokens: 0, output_tokens: 0 };

  if (input.maxIterations <= 0 || meetsThreshold(input.initialScore, input.threshold)) {
    return { code: bestCode, classify: bestScore, iterations: history, rewriteUsage };
  }

  let priorCode = input.initialCode.map((f) => f.content).join('\n');
  let priorScore = input.initialScore;

  for (let i = 1; i <= input.maxIterations; i++) {
    const start = Date.now();
    const userMessage = buildRewriteUserMessage({
      brief: input.brief,
      priorCode,
      conformance: priorScore.conformance,
      tokens: priorScore.tokens,
      raw: priorScore.raw,
      iteration: i,
    });

    let textBlock: { type: 'text'; text: string } | undefined;
    let usage: { input_tokens: number; output_tokens: number } | undefined;
    try {
      const response = await input.client.messages.create({
        model: input.model,
        max_tokens: input.maxOutputTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      });
      textBlock = response.content.find(
        (block: { type: string }) => block.type === 'text',
      ) as { type: 'text'; text: string } | undefined;
      usage = { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[iterate] iteration ${i} API error: ${message}\n`);
      history.push({
        n: i,
        conformance: priorScore.conformance,
        raw: priorScore.raw,
        tokens: priorScore.tokens,
        durationMs: Date.now() - start,
      });
      break;
    }

    if (usage) {
      rewriteUsage.input_tokens += usage.input_tokens;
      rewriteUsage.output_tokens += usage.output_tokens;
    }

    if (!textBlock) {
      history.push({
        n: i,
        conformance: priorScore.conformance,
        raw: priorScore.raw,
        tokens: priorScore.tokens,
        durationMs: Date.now() - start,
      });
      break;
    }

    const extracted = extractCode(textBlock.text);
    if (!extracted) {
      history.push({
        n: i,
        conformance: priorScore.conformance,
        raw: priorScore.raw,
        tokens: priorScore.tokens,
        durationMs: Date.now() - start,
      });
      break;
    }

    const candidateCode: CodeFile[] = [{ path: extracted.path, content: extracted.content }];
    const candidateScore = scoreText(extracted.content);

    history.push({
      n: i,
      conformance: candidateScore.conformance,
      raw: candidateScore.raw,
      tokens: candidateScore.tokens,
      durationMs: Date.now() - start,
    });

    if (isBetter(candidateScore, bestScore)) {
      bestCode = candidateCode;
      bestScore = candidateScore;
    }

    if (meetsThreshold(candidateScore, input.threshold)) {
      break;
    }

    priorCode = extracted.content;
    priorScore = candidateScore;
  }

  return { code: bestCode, classify: bestScore, iterations: history, rewriteUsage };
}
