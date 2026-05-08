/**
 * User-message template for the codegen phase.
 *
 * Phase 0: a single user message containing the brief.
 * Phase 2: when a screenshot is present, adds an instruction to reference it.
 *          The caller (generate.ts) prepends the image block to the content
 *          array before this text.
 */

export function buildCodegenUserMessage(
  brief: string,
  hasScreenshot = false,
): string {
  const trimmed = brief.trim();

  const screenshotLine = hasScreenshot
    ? '\nA reference screenshot is attached above. Use it to inform the layout, structure, and visual hierarchy of the component — but always resolve colors and spacing through semantic Tailwind tokens, not raw values from the image.\n'
    : '';

  return `Brief: ${trimmed}
${screenshotLine}
Emit one React + Tailwind component that satisfies the brief. Follow the output contract and token discipline rules from the system prompt. One \`\`\`tsx code block, default export, no prose before or after.`;
}
