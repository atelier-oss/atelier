import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineCommand } from 'citty';

const SCAFFOLD = `---
version: alpha
name: My Project
description: "Per-project design tokens. Per Atelier convention: this file owns visual identity (colors, typography, spacing). Behavior lives in CLAUDE.md, rationale lives in .interface-design/system.md."
colors:
  c-bg: "#0A0A0A"
  c-surface: "#141414"
  c-border: "#1F1F1F"
  c-text: "#FFFFFF"
  c-text-muted: "#B0B0B0"
  c-primary: "#3B82F6"
  c-primary-hover: "#2563EB"
  c-success: "#4ADE80"
  c-warn: "#F59E0B"
  c-error: "#F97066"
  c-focus: "#3B82F6"
typography:
  heading-lg:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.2
  heading:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
---

# Design System

Authored from the Atelier scaffold (\`atelier init\`).

## Colors

The \`colors\` block above is the source of truth. Replace placeholder hex values with your brand colors. Token names use a \`c-\` prefix so Tailwind classes (\`bg-c-primary\`, \`text-c-text-muted\`) read as semantic tokens, not raw palette refs.

## Typography

Four default scales: \`heading-lg\`, \`heading\`, \`body\`, \`caption\`. Add your own \`label\` / \`mono\` / \`button\` as needed.

## Next steps

- Run \`atelier lint DESIGN.md\` to validate.
- Wire tokens into your Tailwind config (see project README).
- Reference \`.interface-design/system.md\` for prose rationale (motion, voice, a11y).
`;

export interface RunInitOptions {
  cwd: string;
  force?: boolean;
}

export interface RunInitResult {
  written: string;
  alreadyExisted: boolean;
}

export function runInit(options: RunInitOptions): RunInitResult {
  const target = join(options.cwd, 'DESIGN.md');
  const existed = existsSync(target);

  if (existed && !options.force) {
    return { written: target, alreadyExisted: true };
  }

  writeFileSync(target, SCAFFOLD, 'utf-8');
  return { written: target, alreadyExisted: false };
}

export const initCommand = defineCommand({
  meta: {
    name: 'init',
    description: 'Scaffold a starter DESIGN.md in the current directory.',
  },
  args: {
    force: {
      type: 'boolean',
      description: 'Overwrite an existing DESIGN.md.',
      default: false,
    },
  },
  run({ args }) {
    const result = runInit({ cwd: process.cwd(), force: args.force });
    if (result.alreadyExisted) {
      console.error(
        `DESIGN.md already exists at ${result.written}. Pass --force to overwrite.`,
      );
      process.exit(1);
    }
    console.log(`wrote ${result.written}`);
  },
});
