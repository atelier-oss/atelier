/**
 * @atelier-oss/mcp-server — programmatic surface.
 *
 * The MCP stdio entry lives in `server.ts`. This module re-exports the
 * pure tool handlers so callers can invoke them directly without spawning
 * a transport.
 */

export {
  lintTool,
  classifyTool,
  auditTool,
  atlasTool,
  lintInput,
  classifyInput,
  auditInput,
  atlasInput,
  type ToolEnvelope,
  type LintInput,
  type ClassifyInput,
  type AuditInput,
  type AtlasInput,
} from './tools';

export const VERSION = '0.0.0';
