/**
 * Generate phase — single non-streaming Anthropic call to produce
 * a React+Tailwind component from a brief.
 *
 * Phase 0 contract: one claude-sonnet-4-6 call with the system prompt + a
 * codegen user message. Returns the parsed code + token usage. No retries
 * beyond what the SDK provides; no streaming; no tools.
 *
 * Phase 2 additions:
 *   - When screenshot is provided, the user message becomes a content array
 *     with an image block (base64) followed by the text brief block.
 *   - When projectContextPreamble is provided, it is prepended to the system
 *     prompt before the token-discipline rules.
 *
 * CARL [OPUS-4-7] sampling policy: do NOT pass temperature / top_p / top_k.
 * Adaptive thinking only (Sonnet 4.6 uses its default thinking behavior;
 * we do not pass a `thinking` param).
 */

import type Anthropic from '@anthropic-ai/sdk';
import { loadScreenshot } from '../adapters/screenshot';
import type { ImageContentBlock } from '../adapters/screenshot';
import { buildCodegenUserMessage } from '../prompts/codegen';
import { SYSTEM_PROMPT } from '../prompts/system';
import type { CodeFile } from '../types';

export interface GenerateInput {
  brief: string;
  client: Anthropic;
  model: string;
  maxOutputTokens: number;
  /** Absolute path to a reference screenshot to include as a vision input. */
  screenshot?: string;
  /** Formatted project-context preamble to prepend to the system prompt. */
  projectContextPreamble?: string;
}

export interface GenerateOutput {
  code: CodeFile[];
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  model: string;
}

// Tolerant of compact closing fences — Sonnet 4.6 routinely emits the closing
// ``` without a preceding newline when the system prompt forbids surrounding prose.
const TSX_BLOCK_RE = /```tsx\s*\n([\s\S]*?)\n?```/;
const COMPONENT_NAME_RE = /export\s+default\s+function\s+([A-Za-z_$][A-Za-z0-9_$]*)/;

function extractCode(rawText: string): { content: string; path: string } {
  const match = TSX_BLOCK_RE.exec(rawText);
  if (!match || !match[1]) {
    throw new Error(
      'Agent.generate: no tsx code block found in model response. The model violated the output contract.',
    );
  }
  const content = match[1].trim();
  const nameMatch = COMPONENT_NAME_RE.exec(content);
  const componentName = nameMatch?.[1] ?? 'Component';
  return { content, path: `${componentName}.tsx` };
}

/** Build the user message content: either a plain string or an image+text array. */
async function buildUserMessageContent(
  brief: string,
  screenshot: string | undefined,
): Promise<string | Array<ImageContentBlock | { type: 'text'; text: string }>> {
  const textBlock = buildCodegenUserMessage(brief, screenshot !== undefined);

  if (!screenshot) {
    return textBlock;
  }

  const imageBlock = await loadScreenshot(screenshot);
  return [imageBlock, { type: 'text', text: textBlock }];
}

/** Build the effective system prompt, optionally prepending project context. */
function buildSystemPrompt(projectContextPreamble: string | undefined): string {
  if (!projectContextPreamble) return SYSTEM_PROMPT;
  return `${projectContextPreamble}\n\n${SYSTEM_PROMPT}`;
}

export async function generate(input: GenerateInput): Promise<GenerateOutput> {
  const userContent = await buildUserMessageContent(input.brief, input.screenshot);
  const systemPrompt = buildSystemPrompt(input.projectContextPreamble);

  const response = await input.client.messages.create({
    model: input.model,
    max_tokens: input.maxOutputTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent as Parameters<typeof input.client.messages.create>[0]['messages'][0]['content'] }],
  });

  const textBlock = response.content.find(
    (block: { type: string }) => block.type === 'text',
  ) as { type: 'text'; text: string } | undefined;
  if (!textBlock) {
    throw new Error('Agent.generate: model response had no text block');
  }

  const { content, path } = extractCode(textBlock.text);

  return {
    code: [{ path, content }],
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
    model: response.model,
  };
}
