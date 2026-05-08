/**
 * @atelier-oss/agent -- text-brief-to-token-conformant React/Tailwind code
 * via Sonnet 4.6 + @atelier-oss/classify. Phase 3a: Figma REST integration
 * with role-mapping preamble.
 *
 * Public API:
 *   const agent = new Agent({ apiKey?, models?, maxOutputTokens?, figmaToken? });
 *   const result = await agent.run({ brief, screenshot?, cwd?, figma? });
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
import { scaffoldDesignMd } from './pipeline/scaffold';
import { verify } from './pipeline/verify';
import { buildFigmaContextPreamble, inferRole } from './prompts/figma-context';
import type {
  AgentOptions,
  IterationRecord,
  RunInput,
  RunResult,
  RunTraceEntry,
  ScaffoldedFile,
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
  ScaffoldedFile,
} from './types';

export { composeDesignMd } from './adapters/design-md-emitter';

export { DEFAULT_CODEGEN_MODEL, DEFAULT_MAX_OUTPUT_TOKENS } from './models/defaults';

export const VERSION = '0.4.0' as const;

export const DEFAULT_ITERATE_MAX = 3 as const;
export const DEFAULT_THRESHOLD = 0.95 as const;

export class Agent {
  private readonly client: Anthropic;
  private readonly codegenModel: string;
  private readonly maxOutputTokens: number;
  private readonly maxIterations: number;
  private readonly threshold: number;
  private readonly figmaToken: string | undefined;

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
    this.figmaToken = options.figmaToken ?? process.env.FIGMA_TOKEN;
  }

  async run(input: RunInput): Promise<RunResult> {
    const trace: RunTraceEntry[] = [];

    // --- Intake ---
    const intakeStart = Date.now();
    const intakeAt = new Date(intakeStart).toISOString();
    const normalized = await intake(input, this.figmaToken);
    const atlasCategory = normalized.atlasContext?.atlas.category ?? null;
    const figmaFileKey = normalized.figmaContext?.fileKey ?? null;
    const figmaVariableCount = normalized.figmaContext?.variables.length ?? 0;
    trace.push({
      phase: 'intake',
      startedAt: intakeAt,
      durationMs: Date.now() - intakeStart,
      notes: {
        briefLength: normalized.brief.length,
        ...(input.screenshot ? { screenshot: input.screenshot } : {}),
        ...(atlasCategory ? { atlasCategory } : {}),
        ...(figmaFileKey ? { figmaFileKey, figmaVariableCount } : {}),
      },
    });

    // --- Scaffold (Phase 2.x; opt-in via input.scaffoldDesignMd) ---
    let scaffoldedFiles: ScaffoldedFile[] | undefined;
    if (input.scaffoldDesignMd === true && input.cwd) {
      const scaffoldStart = Date.now();
      const scaffoldAt = new Date(scaffoldStart).toISOString();
      const scaffoldOutput = await scaffoldDesignMd({
        cwd: input.cwd,
        atlasContext: normalized.atlasContext,
        figmaContext: normalized.figmaContext,
      });
      trace.push({
        phase: 'scaffold',
        startedAt: scaffoldAt,
        durationMs: Date.now() - scaffoldStart,
        notes: {
          scaffoldedCount: scaffoldOutput.scaffoldedFiles.length,
          ...(scaffoldOutput.skipReason ? { skipReason: scaffoldOutput.skipReason } : {}),
        },
      });
      if (scaffoldOutput.scaffoldedFiles.length > 0) {
        scaffoldedFiles = scaffoldOutput.scaffoldedFiles;
      }
    }

    // --- Generate ---
    const genStart = Date.now();
    const genAt = new Date(genStart).toISOString();

    // Build Figma context preamble when available.
    const figmaContextPreamble = normalized.figmaContext
      ? buildFigmaContextPreamble(normalized.figmaContext)
      : undefined;

    // Count role-mapped COLOR variables for the trace note.
    const figmaMappedRoleCount = normalized.figmaContext
      ? normalized.figmaContext.variables.filter(
          (v) => v.type === 'COLOR' && inferRole(v.name) !== 'unmapped',
        ).length
      : 0;

    const generated = await generate({
      brief: normalized.brief,
      client: this.client,
      model: this.codegenModel,
      maxOutputTokens: this.maxOutputTokens,
      screenshot: normalized.screenshot,
      projectContextPreamble: normalized.atlasContext?.preamble ?? undefined,
      figmaContextPreamble,
    });
    trace.push({
      phase: 'generate',
      startedAt: genAt,
      durationMs: Date.now() - genStart,
      notes: {
        model: generated.model,
        input_tokens: generated.usage.input_tokens,
        output_tokens: generated.usage.output_tokens,
        ...(normalized.screenshot ? { screenshotUsed: true } : {}),
        ...(atlasCategory ? { atlasCategory } : {}),
        ...(figmaFileKey
          ? { figmaFileKey, figmaVariableCount, figmaMappedRoleCount }
          : {}),
      },
    });

    // --- Verify ---
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

    // --- Iterate ---
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

    // --- Deliver ---
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

    return {
      ...partial,
      trace,
      iterations: iterated.iterations,
      ...(scaffoldedFiles ? { scaffoldedFiles } : {}),
    };
  }
}
