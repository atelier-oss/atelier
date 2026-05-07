/**
 * Token-conformance scorer — TS port of benchmarks/score.py.
 *
 * Both implementations agree on every row of benchmarks/fixtures/classify-parity.yaml.
 * If you edit this file, run BOTH gates:
 *   - pnpm --filter @atelier/classify test
 *   - python3 -m benchmarks.parity_check
 */

export type Verdict = 'token' | 'raw';

export const TAILWIND_PALETTES: ReadonlySet<string> = new Set([
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
]);

export const COLOR_PREFIXES: ReadonlySet<string> = new Set([
  'text',
  'bg',
  'border',
  'ring',
  'fill',
  'stroke',
  'outline',
  'divide',
  'placeholder',
  'caret',
  'accent',
  'from',
  'to',
  'via',
  'shadow',
  'decoration',
]);

// Same-prefix utility values that read as a color but bypass the design layer
// in either direction — excluded rather than counted as token or raw.
export const UTILITY_COLOR_VALUES: ReadonlySet<string> = new Set([
  'white',
  'black',
  'transparent',
  'current',
  'inherit',
  'none',
]);

// Same-prefix values that aren't colors (sizes, alignment, weights, stroke styles).
export const NON_COLOR_VALUES: ReadonlySet<string> = new Set([
  'xs',
  'sm',
  'base',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  '8xl',
  '9xl',
  'left',
  'right',
  'center',
  'justify',
  'start',
  'end',
  'thin',
  'extralight',
  'light',
  'normal',
  'medium',
  'semibold',
  'bold',
  'extrabold',
  'tighter',
  'tight',
  'wide',
  'wider',
  'widest',
  'solid',
  'dashed',
  'dotted',
  'double',
  'hidden',
  'auto',
  'visible',
  'inset',
  'inside',
  'outside',
]);

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/;
const RGBA_RE = /rgba?\([^)]+\)/;
const HSLA_RE = /hsla?\([^)]+\)/;
const HEX_RE_G = /#[0-9a-fA-F]{3,8}\b/g;
const RGBA_RE_G = /rgba?\([^)]+\)/g;
const HSLA_RE_G = /hsla?\([^)]+\)/g;
const CLASS_ATTR_RE_G = /(?:className|class)\s*=\s*["'`]([^"'`]+)["'`]/g;
const TEMPLATE_LITERAL_RE_G = /`([^`]+)`/g;
const QUOTED_STRING_RE_G = /["']([^"']+)["']/g;
const ALL_DIGITS_RE = /^\d+$/;

/**
 * Classify a single Tailwind class string. Null when not a color signal.
 *
 * Mirrors benchmarks/score.py :: classify_class.
 */
export function classifyClass(cls: string): Verdict | null {
  if (!cls || !cls.includes('-')) return null;

  const dashIdx = cls.indexOf('-');
  const prefix = cls.slice(0, dashIdx);
  const value = cls.slice(dashIdx + 1);

  if (!COLOR_PREFIXES.has(prefix) || !value) return null;

  // Arbitrary value: prefix-[...]
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1);
    if (inner.includes('var(')) return 'token';
    if (HEX_RE.test(inner) || RGBA_RE.test(inner) || HSLA_RE.test(inner)) return 'raw';
    return null; // arbitrary non-color value (e.g. text-[length:14px])
  }

  // Strip opacity modifier (bg-zinc-800/50 → bg-zinc-800)
  const slashIdx = value.indexOf('/');
  const base = slashIdx === -1 ? value : value.slice(0, slashIdx);

  const dashInBase = base.indexOf('-');
  const first = dashInBase === -1 ? base : base.slice(0, dashInBase);

  if (UTILITY_COLOR_VALUES.has(first) || NON_COLOR_VALUES.has(first)) return null;
  if (TAILWIND_PALETTES.has(first)) return 'raw';
  if (ALL_DIGITS_RE.test(first)) return null; // border-0, ring-2

  return 'token';
}

/** Find inline #hex, rgb(), rgba(), hsl(), hsla() references. */
export function extractInlineColors(text: string): string[] {
  const out: string[] = [];
  const hex = text.match(HEX_RE_G);
  if (hex) out.push(...hex);
  const rgba = text.match(RGBA_RE_G);
  if (rgba) out.push(...rgba);
  const hsla = text.match(HSLA_RE_G);
  if (hsla) out.push(...hsla);
  return out;
}

/**
 * Extract candidate Tailwind classes from className attrs and template literals.
 * Template literals also get quoted-substring extraction so classes nested
 * inside `${cond && "bg-zinc-900"}` interpolations are caught.
 */
export function extractTailwindClasses(text: string): string[] {
  const classes: string[] = [];

  for (const m of text.matchAll(CLASS_ATTR_RE_G)) {
    const body = m[1] ?? '';
    for (const c of body.split(/\s+/)) if (c) classes.push(c);
  }

  for (const m of text.matchAll(TEMPLATE_LITERAL_RE_G)) {
    const body = m[1] ?? '';
    for (const c of body.split(/\s+/)) if (c) classes.push(c);
    for (const inner of body.matchAll(QUOTED_STRING_RE_G)) {
      const innerBody = inner[1] ?? '';
      for (const c of innerBody.split(/\s+/)) if (c) classes.push(c);
    }
  }

  return classes;
}

export interface ScoreResult {
  tokens: number;
  raw: number;
  /** tokens / (tokens + raw); null when neither has signal. */
  conformance: number | null;
}

/** Score a code snippet for token-vs-raw conformance. */
export function scoreText(text: string): ScoreResult {
  let tokens = 0;
  let raw = 0;
  for (const cls of extractTailwindClasses(text)) {
    const v = classifyClass(cls);
    if (v === 'token') tokens++;
    else if (v === 'raw') raw++;
  }
  raw += extractInlineColors(text).length;
  const total = tokens + raw;
  return {
    tokens,
    raw,
    conformance: total > 0 ? tokens / total : null,
  };
}

const REPO_EXTENSIONS: ReadonlySet<string> = new Set(['.tsx', '.jsx', '.ts', '.js']);
const REPO_EXCLUDE_PARTS: ReadonlySet<string> = new Set([
  'node_modules',
  'dist',
  'build',
  '.next',
  '.venv',
  'venv',
  '.git',
  '__pycache__',
  '.turbo',
  '.cache',
  'out',
  'coverage',
  '.vercel',
  '_archive',
]);

export interface RepoScoreOptions {
  /** Override the file-extension allowlist. Defaults to .tsx/.jsx/.ts/.js. */
  extensions?: ReadonlySet<string>;
  /** Override the path-segment exclude set. Merged on top of defaults. */
  exclude?: ReadonlySet<string>;
  /** Skip *.test.* / *.spec.* / *.d.ts. Default true. */
  skipTests?: boolean;
}

export interface RepoScoreEntry {
  path: string;
  tokens: number;
  raw: number;
}

export interface RepoScoreResult extends ScoreResult {
  rootPath: string;
  filesScanned: number;
  filesWithSignal: number;
  perFile: RepoScoreEntry[];
}

async function* walk(
  root: string,
  exclude: ReadonlySet<string>,
): AsyncGenerator<string> {
  const { readdir } = await import('node:fs/promises');
  const { join } = await import('node:path');
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (exclude.has(entry.name)) continue;
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full, exclude);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

/** Walk a project root and score every TS/JS source file. */
export async function scoreRepo(
  rootPath: string,
  options: RepoScoreOptions = {},
): Promise<RepoScoreResult> {
  const { readFile } = await import('node:fs/promises');
  const { extname } = await import('node:path');

  const extensions = options.extensions ?? REPO_EXTENSIONS;
  const exclude = options.exclude
    ? new Set([...REPO_EXCLUDE_PARTS, ...options.exclude])
    : REPO_EXCLUDE_PARTS;
  const skipTests = options.skipTests ?? true;

  const perFile: RepoScoreEntry[] = [];
  let tokens = 0;
  let raw = 0;
  let filesScanned = 0;
  let filesWithSignal = 0;

  for await (const filePath of walk(rootPath, exclude)) {
    if (!extensions.has(extname(filePath))) continue;
    const lower = filePath.toLowerCase();
    if (skipTests && (lower.includes('.test.') || lower.includes('.spec.') || lower.endsWith('.d.ts'))) {
      continue;
    }
    filesScanned++;
    let text: string;
    try {
      text = await readFile(filePath, 'utf-8');
    } catch {
      continue;
    }
    const s = scoreText(text);
    if (s.tokens || s.raw) {
      filesWithSignal++;
      perFile.push({ path: filePath, tokens: s.tokens, raw: s.raw });
    }
    tokens += s.tokens;
    raw += s.raw;
  }

  const total = tokens + raw;
  return {
    rootPath,
    tokens,
    raw,
    conformance: total > 0 ? tokens / total : null,
    filesScanned,
    filesWithSignal,
    perFile,
  };
}
