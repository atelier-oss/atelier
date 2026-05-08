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
import { verify } from './pipeline/verify';
import type {
  AgentOptions,
  RunInput,
  RunResult,
  RunTraceEntry,
} from './types';

export type {
  AgentOptions,
  CodeFile,
  ModelOpts,
  RunCost,
  RunInput,
  RunResult,
  RunTraceEntry,
} from './types';

export { DEFAULT_CODEGEN_MODEL, DEFAULT_MAX_OUTPUT_TOKENS } from './models/defaults';

export class Agent {
  private readonly client: Anthropic;
  private readonly codegenModel: string;
  private readonly maxOutputTokens: number;

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

    const deliverStart = Date.now();
    const deliverAt = new Date(deliverStart).toISOString();
    const result = deliver({
      code: generated.code,
      classify: verified.classify,
      trace,
      model: generated.model,
      inputTokens: generated.usage.input_tokens,
      outputTokens: generated.usage.output_tokens,
    });
    trace.push({
      phase: 'deliver',
      startedAt: deliverAt,
      durationMs: Date.now() - deliverStart,
    });

    return result;
  }
}
