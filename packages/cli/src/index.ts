/**
 * @atelier/cli — programmatic surface.
 *
 * The bin entry lives in `cli.ts`. This module re-exports each command's
 * runner so other packages (e.g. @atelier/mcp-server) can call them
 * without spawning a subprocess.
 */

export { runInit, type RunInitOptions, type RunInitResult } from './commands/init';
export { runLint, type RunLintOptions, type RunLintResult, type Format } from './commands/lint';
export {
  runClassify,
  type RunClassifyOptions,
  type RunClassifyResult,
} from './commands/classify';
export { runAtlasList, BUILD_CATEGORIES, type RunAtlasListResult } from './commands/atlas';

export const VERSION = '0.0.0';
