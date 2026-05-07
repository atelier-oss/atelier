/**
 * Project fingerprinter — given a directory, infer its build category
 * from file signatures + package.json deps + observed routes.
 *
 * Driven by `categories.json` shipped alongside this package. Heuristic,
 * not exhaustive — the precedence rule (spec/DESIGN.md.spec.md §2) means
 * an explicit per-project DESIGN.md always wins over an atlas inference.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join, resolve } from 'node:path';
import type {
  AtlasResult,
  BuildCategory,
  CategoriesFile,
  CategoryDef,
  FingerprintSignal,
} from './types';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Resolve packages/atlas/categories.json from either dist/ or src/ build. */
function resolveCategoriesPath(): string {
  const candidates = [
    resolve(HERE, '..', 'categories.json'),
    resolve(HERE, '..', '..', 'categories.json'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error(`categories.json not found near ${HERE}`);
}

let _categories: CategoriesFile | null = null;

/** Load categories.json from disk (cached). */
export function loadCategories(): CategoriesFile {
  if (_categories) return _categories;
  const p = resolveCategoriesPath();
  _categories = JSON.parse(readFileSync(p, 'utf-8')) as CategoriesFile;
  return _categories;
}

interface ProjectSnapshot {
  /** Discovered app root — may be a subdirectory of the input path. */
  rootPath: string;
  packageJsonDeps: Set<string>;
  topLevelEntries: Set<string>; // e.g. "components", "app", "src"
  /** Cached existsSync hits relative to rootPath, normalized with trailing slash for dirs. */
  pathHits: Map<string, boolean>;
  /** Routes from app/ or pages/ (limited scan). */
  routes: Set<string>;
}

const APP_ROOT_SKIP = new Set([
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  '.venv',
  'venv',
  '__pycache__',
  '.turbo',
  'coverage',
  '_archive',
]);

/**
 * Find the shallowest directory containing a package.json, starting at
 * `inputPath` and walking up to `maxDepth` levels deep. Falls back to
 * `inputPath` if no package.json is found anywhere.
 */
function discoverAppRoot(inputPath: string, maxDepth = 3): string {
  if (existsSync(join(inputPath, 'package.json'))) return inputPath;

  const queue: Array<{ path: string; depth: number }> = [{ path: inputPath, depth: 0 }];
  while (queue.length > 0) {
    const { path, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;
    let entries;
    try {
      entries = readdirSync(path, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || APP_ROOT_SKIP.has(entry.name)) continue;
      const sub = join(path, entry.name);
      if (existsSync(join(sub, 'package.json'))) return sub;
      queue.push({ path: sub, depth: depth + 1 });
    }
  }
  return inputPath;
}

function snapshot(inputPath: string): ProjectSnapshot {
  const rootPath = discoverAppRoot(inputPath);
  const pkgPath = join(rootPath, 'package.json');
  const deps = new Set<string>();
  if (existsSync(pkgPath)) {
    try {
      const raw = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
      for (const k of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
        const block = raw[k];
        if (block && typeof block === 'object') {
          for (const dep of Object.keys(block as Record<string, unknown>)) {
            deps.add(dep);
          }
        }
      }
    } catch {
      /* unreadable package.json — leave deps empty */
    }
  }

  const topLevel = new Set<string>();
  try {
    for (const entry of readdirSync(rootPath, { withFileTypes: true })) {
      topLevel.add(entry.name);
    }
  } catch {
    /* unreadable root — leave empty */
  }

  const routes = new Set<string>();
  for (const dir of ['app', 'pages']) {
    const dirPath = join(rootPath, dir);
    if (!existsSync(dirPath)) continue;
    try {
      for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          // (dashboard)/ groups → strip parens
          const cleaned = entry.name.replace(/^\(/, '').replace(/\)$/, '');
          routes.add(`/${cleaned}`);
        }
      }
    } catch {
      /* skip */
    }
  }

  return {
    rootPath,
    packageJsonDeps: deps,
    topLevelEntries: topLevel,
    pathHits: new Map(),
    routes,
  };
}

function pathExists(snap: ProjectSnapshot, signal: string): boolean {
  const cached = snap.pathHits.get(signal);
  if (cached !== undefined) return cached;
  const full = join(snap.rootPath, signal.replace(/\/$/, ''));
  const result = existsSync(full);
  snap.pathHits.set(signal, result);
  return result;
}

function scoreCategory(
  cat: CategoryDef,
  snap: ProjectSnapshot,
): { score: number; signals: FingerprintSignal[] } {
  const signals: FingerprintSignal[] = [];

  for (const f of cat.fingerprints.files ?? []) {
    if (pathExists(snap, f)) signals.push({ source: 'file', match: f });
  }
  for (const dep of cat.fingerprints.deps ?? []) {
    if (snap.packageJsonDeps.has(dep)) signals.push({ source: 'dep', match: dep });
  }
  for (const grp of cat.fingerprints.deps_groups ?? []) {
    let count = 0;
    if (grp.any_of) {
      for (const d of grp.any_of) if (snap.packageJsonDeps.has(d)) count++;
    }
    if (grp.match_prefix) {
      for (const d of snap.packageJsonDeps) {
        if (d.startsWith(grp.match_prefix) && !grp.any_of?.includes(d)) count++;
      }
    }
    const min = grp.min_count ?? 1;
    if (count >= min) {
      signals.push({
        source: 'dep-group',
        match: `${grp.match_prefix ?? grp.any_of?.[0] ?? ''} x${count}`,
      });
    }
  }
  for (const route of cat.fingerprints.routes ?? []) {
    if (snap.routes.has(route)) signals.push({ source: 'route', match: route });
  }

  return { score: signals.length, signals };
}

/**
 * Fingerprint a project root, returning best-fit build category + signals.
 *
 * Two-channel classification:
 *   1. Canonical-name override — if the project's basename (or input
 *      basename) appears in any category's `examples_in_fleet`, that
 *      category wins. The JSON author already labeled it; we honor the
 *      label even if file/dep heuristics disagree.
 *   2. Auto heuristic — falls back to file/dep/route signal counting.
 *      Requires `min_signals_for_classification` hits to claim a category.
 *
 * If the input path has no package.json, recurses up to 3 levels looking
 * for one (skipping node_modules / .next / etc).
 */
export function fingerprint(inputPath: string): AtlasResult {
  const cats = loadCategories();
  const snap = snapshot(inputPath);

  const scored = cats.categories
    .map((c) => ({ category: c.slug, ...scoreCategory(c, snap) }))
    .sort((a, b) => b.score - a.score);

  // Channel 1: canonical-name override.
  const candidates = [basename(snap.rootPath), basename(inputPath)];
  let canonicalHit: BuildCategory | null = null;
  for (const cat of cats.categories) {
    if (cat.examples_in_fleet?.some((n) => candidates.includes(n))) {
      canonicalHit = cat.slug;
      break;
    }
  }

  // Channel 2: auto heuristic (sufficient signals).
  const top = scored[0];
  const min = cats.min_signals_for_classification;
  const autoCategory: BuildCategory | null =
    top && top.score >= min ? top.category : null;

  const category: BuildCategory | null = canonicalHit ?? autoCategory;

  let exemplars: string[] = [];
  let shardPath: string | null = null;
  if (category) {
    const def = cats.categories.find((c) => c.slug === category);
    exemplars = def?.examples_in_fleet ?? [];
    shardPath = def?.shard_path ?? null;
  }

  return {
    rootPath: snap.rootPath,
    category,
    ranking: scored,
    exemplars,
    shardPath,
  };
}

/** Read the markdown shard for a given category. */
export function getShard(category: BuildCategory): string {
  const cats = loadCategories();
  const def = cats.categories.find((c) => c.slug === category);
  if (!def) throw new Error(`unknown category: ${category}`);
  const shardName = def.shard_path.replace(/^.*\//, '');
  const shardPath = join(HERE, '..', 'shards', shardName);
  return readFileSync(shardPath, 'utf-8');
}
