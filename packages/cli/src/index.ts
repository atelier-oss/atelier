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
export {
  runAtlasList,
  runAtlasFingerprint,
  type RunAtlasListResult,
  type RunAtlasFingerprintOptions,
} from './commands/atlas';
export { runAudit, type RunAuditOptions, type RunAuditResult } from './commands/audit';

export const VERSION = '0.0.0';
