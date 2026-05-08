/**
 * User-message template for the codegen phase.
 *
 * Phase 0 keeps it simple: a single user message containing the brief.
 * Phase 1+ will layer on DESIGN.md context, atlas defaults, screenshot
 * descriptions, and reference URLs.
 */

export function buildCodegenUserMessage(brief: string): string {
  const trimmed = brief.trim();
  return `Brief: ${trimmed}

Emit one React + Tailwind component that satisfies the brief. Follow the output contract and token discipline rules from the system prompt. One \`\`\`tsx code block, default export, no prose before or after.`;
}
