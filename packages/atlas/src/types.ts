/** Public types for @atelier/atlas. */

export type BuildCategory =
  | 'saas-dashboard'
  | 'multi-llm-synthesis'
  | 'marketing-landing'
  | 'conversational-agent-ui'
  | 'trading-analytics'
  | 'internal-ops'
  | 'marketplace-listing';

export interface CategoryFingerprint {
  files?: string[];
  deps?: string[];
  deps_groups?: Array<{
    any_of?: string[];
    min_count?: number;
    match_prefix?: string;
  }>;
  routes?: string[];
}

export interface CategoryDef {
  slug: BuildCategory;
  tagline: string;
  examples_in_fleet: string[];
  shard_path: string;
  fingerprints: CategoryFingerprint;
}

export interface CategoriesFile {
  $schema?: string;
  version: number;
  last_updated: string;
  precedence_rule: string;
  min_signals_for_classification: number;
  categories: CategoryDef[];
}

export interface FingerprintSignal {
  /** Where the hit came from. */
  source: 'file' | 'dep' | 'dep-group' | 'route';
  /** The matched signal string. */
  match: string;
}

export interface AtlasResult {
  rootPath: string;
  /** Best-fit category, or null if no category clears min_signals_for_classification. */
  category: BuildCategory | null;
  /** Per-category signal counts, sorted descending. */
  ranking: Array<{
    category: BuildCategory;
    score: number;
    signals: FingerprintSignal[];
  }>;
  /** Examples (other repos) for the chosen category. */
  exemplars: string[];
  /** Path to the markdown shard for the chosen category. */
  shardPath: string | null;
}
