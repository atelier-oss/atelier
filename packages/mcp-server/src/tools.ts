/**
 * Atelier MCP tool handlers.
 *
 * Each tool is a pure async function over a typed input → result envelope.
 * The MCP server (`server.ts`) wires these to the SDK's request handlers;
 * tests call them directly without spawning a transport.
 */

import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { lintDesignMd } from '@atelier/lint';
import { scoreRepo } from '@atelier/classify';
import { audit as runAudit } from '@atelier/audit';
import { fingerprint } from '@atelier/atlas';

export type ToolEnvelope<T> = { ok: true; data: T } | { ok: false; error: string };

export const lintInput = z.object({
  path: z.string().min(1).describe('Absolute path to a DESIGN.md file.'),
});

export const classifyInput = z.object({
  path: z.string().min(1).describe('Project root to walk.'),
});

export const auditInput = z.object({
  root: z.string().min(1).describe('Project root containing DESIGN.md and components.'),
  componentDir: z.string().optional(),
});

export const atlasInput = z.object({
  path: z.string().min(1).describe('Project root to fingerprint.'),
});

export type LintInput = z.infer<typeof lintInput>;
export type ClassifyInput = z.infer<typeof classifyInput>;
export type AuditInput = z.infer<typeof auditInput>;
export type AtlasInput = z.infer<typeof atlasInput>;

export async function lintTool(input: LintInput): Promise<ToolEnvelope<{
  path: string;
  precedence: string;
  conformanceVersion: string;
  errors: number;
  warnings: number;
  infos: number;
  findings: Array<{ severity: string; path?: string; message: string }>;
}>> {
  if (!existsSync(input.path)) {
    return { ok: false, error: `DESIGN.md not found at ${input.path}` };
  }
  const content = readFileSync(input.path, 'utf-8');
  const r = lintDesignMd(content, input.path);
  return {
    ok: true,
    data: {
      path: r.path,
      precedence: r.precedence,
      conformanceVersion: r.conformanceVersion,
      errors: r.errors.length,
      warnings: r.warnings.length,
      infos: r.infos.length,
      findings: r.findings.map((f) => ({
        severity: f.severity,
        path: f.path,
        message: f.message,
      })),
    },
  };
}

export async function classifyTool(input: ClassifyInput): Promise<ToolEnvelope<{
  rootPath: string;
  filesScanned: number;
  filesWithSignal: number;
  tokens: number;
  raw: number;
  conformance: number | null;
}>> {
  const r = await scoreRepo(input.path);
  return {
    ok: true,
    data: {
      rootPath: r.rootPath,
      filesScanned: r.filesScanned,
      filesWithSignal: r.filesWithSignal,
      tokens: r.tokens,
      raw: r.raw,
      conformance: r.conformance,
    },
  };
}

export async function auditTool(input: AuditInput): Promise<ToolEnvelope<{
  rootPath: string;
  findingCount: number;
  bySection: Record<string, number>;
}>> {
  const r = runAudit({ root: input.root, componentDir: input.componentDir });
  const bySection: Record<string, number> = {};
  for (const [k, v] of Object.entries(r.sections)) {
    bySection[k] = v.length;
  }
  return {
    ok: true,
    data: {
      rootPath: r.rootPath,
      findingCount: r.findingCount,
      bySection,
    },
  };
}

export async function atlasTool(input: AtlasInput): Promise<ToolEnvelope<{
  rootPath: string;
  category: string | null;
  exemplars: string[];
  shardPath: string | null;
}>> {
  const r = fingerprint(input.path);
  return {
    ok: true,
    data: {
      rootPath: r.rootPath,
      category: r.category,
      exemplars: r.exemplars,
      shardPath: r.shardPath,
    },
  };
}
