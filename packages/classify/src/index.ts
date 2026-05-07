/**
 * @atelier/classify — token-vs-raw classifier.
 *
 * TS port of benchmarks/score.py. Both implementations are validated against
 * benchmarks/fixtures/classify-parity.yaml; never let them drift.
 */

export {
  classifyClass,
  extractInlineColors,
  extractTailwindClasses,
  scoreRepo,
  scoreText,
  TAILWIND_PALETTES,
  COLOR_PREFIXES,
  UTILITY_COLOR_VALUES,
  NON_COLOR_VALUES,
  type RepoScoreEntry,
  type RepoScoreOptions,
  type RepoScoreResult,
  type ScoreResult,
  type Verdict,
} from './score';

export const VERSION = '0.0.0';
