/**
 * @atelier/atlas — build-category fingerprinter + shards.
 *
 * Given a project root, infer one of 7 build categories using a hybrid of
 * file-path signatures and package.json deps. Heuristic; per-project
 * DESIGN.md overrides per the precedence rule (spec/DESIGN.md.spec.md §2).
 */

export {
  fingerprint,
  getShard,
  loadCategories,
} from './fingerprint';

export type {
  AtlasResult,
  BuildCategory,
  CategoriesFile,
  CategoryDef,
  CategoryFingerprint,
  FingerprintSignal,
} from './types';

export const VERSION = '0.0.0';
