/**
 * @atelier-oss/agent — text-brief-to-token-conformant React/Tailwind code
 * via Sonnet 4.6 + @atelier-oss/classify. Phase 0 skeleton.
 *
 * Public API:
 *   const agent = new Agent({ apiKey?, models?, maxOutputTokens? });
 *   const result = await agent.run({ brief });
 *
 * The full plan lives at:
 *   ~/Projects/memory-vault/planning/2026-05-08-atelier-design-agent.md
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  DEFAULT_CODEGEN_MODEL,
  DEFAULT_MAX_OUTPUT_TOKENS,
} from './models/defaults';
import { deliver } from './pipeline/deliver';
import { generate } from './pipeline/generate';
import { intake } from './pipeline/intake';
import { iterate } from './pipeline/iterate';
import { verify } from './pipeline/verify';
import type {
  AgentOptions,
  IterationRecord,
  RunInput,
  RunResult,
  RunTraceEntry,
} from './types';

export type {
  AgentOptions,
  CodeFile,
  IterationRecord,
  ModelOpts,
  RunCost,
  RunInput,
  RunResult,
  RunTraceEntry,
} from './types';

export { DEFAULT_CODEGEN_MODEL, DEFAULT_MAX_OUTPUT_TOKENS } from './models/defaults';

export const VERSION = '0.1.0' as const;

export const DEFAULT_ITERATE_MAX = 3 as const;
export const DEFAULT_THRESHOLD = 0.95 as const;

export class Agent {
  private readonly client: Anthropic;
  private readonly codegenModel: string;
  private readonly maxOutputTokens: number;
  private readonly maxIterations: number;
  private readonly threshold: number;

  constructor(options: AgentOptions = {}) {
    const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Agent: ANTHROPIC_API_KEY is required. Pass it as opts.apiKey or set the environment variable.',
      );
    }
    this.client = new Anthropic({ apiKey });
    this.codegenModel = options.models?.codegen ?? DEFAULT_CODEGEN_MODEL;
    this.maxOutputTokens = options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
    this.maxIterations = options.iterate ?? DEFAULT_ITERATE_MAX;
    this.threshold = options.threshold ?? DEFAULT_THRESHOLD;
  }

  async run(input: RunInput): Promise<RunResult> {
    const trace: RunTraceEntry[] = [];

    const intakeStart = Date.now();
    const intakeAt = new Date(intakeStart).toISOString();
    const normalized = intake(input);
    trace.push({
      phase: 'intake',
      startedAt: intakeAt,
      durationMs: Date.now() - intakeStart,
      notes: { briefLength: normalized.brief.length },
    });

    const genStart = Date.now();
    const genAt = new Date(genStart).toISOString();
    const generated = await generate({
      brief: normalized.brief,
      client: this.client,
      model: this.codegenModel,
      maxOutputTokens: this.maxOutputTokens,
    });
    trace.push({
      phase: 'generate',
      startedAt: genAt,
      durationMs: Date.now() - genStart,
      notes: {
        model: generated.model,
        input_tokens: generated.usage.input_tokens,
        output_tokens: generated.usage.output_tokens,
      },
    });

    const verifyStart = Date.now();
    const verifyAt = new Date(verifyStart).toISOString();
    const verified = verify(generated.code);
    trace.push({
      phase: 'verify',
      startedAt: verifyAt,
      durationMs: Date.now() - verifyStart,
      notes: {
        tokens: verified.classify.tokens,
        raw: verified.classify.raw,
        conformance: verified.classify.conformance,
      },
    });

    const iterateStart = Date.now();
    const iterateAt = new Date(iterateStart).toISOString();
    const iterated = await iterate({
      brief: normalized.brief,
      initialCode: generated.code,
      initialScore: verified.classify,
      client: this.client,
      model: this.codegenModel,
      maxOutputTokens: this.maxOutputTokens,
      maxIterations: this.maxIterations,
      threshold: this.threshold,
    });
    trace.push({
      phase: 'iterate',
      startedAt: iterateAt,
      durationMs: Date.now() - iterateStart,
      notes: {
        iterations: iterated.iterations.length - 1, // excludes initial
        finalConformance: iterated.classify.conformance,
        rewrite_input_tokens: iterated.rewriteUsage.input_tokens,
        rewrite_output_tokens: iterated.rewriteUsage.output_tokens,
        scoreAt: iterated.iterations.map((r: IterationRecord) => r.conformance),
      },
    });

    const deliverStart = Date.now();
    const deliverAt = new Date(deliverStart).toISOString();
    const totalInput = generated.usage.input_tokens + iterated.rewriteUsage.input_tokens;
    const totalOutput = generated.usage.output_tokens + iterated.rewriteUsage.output_tokens;
    const partial = deliver({
      code: iterated.code,
      classify: iterated.classify,
      model: generated.model,
      inputTokens: totalInput,
      outputTokens: totalOutput,
    });
    trace.push({
      phase: 'deliver',
      startedAt: deliverAt,
      durationMs: Date.now() - deliverStart,
    });

    return { ...partial, trace, iterations: iterated.iterations };
  }
}
