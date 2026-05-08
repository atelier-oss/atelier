/**
 * @atelier/audit — TS port of benchmarks/audit_home_dashboard.py.
 *
 * Six-section project audit (tokenUsage, contrast, motion, accessibility,
 * designCoverage, responsive). PFOS event emit is opt-in.
 */

export { audit, buildPfosPayload, contrastRatio } from './audit';
export { prettyflyDefaults, shadcnDefaults } from './presets';
export type { AuditPresetConfig } from './presets';
export type {
  AuditConfig,
  AuditFinding,
  AuditResult,
  AuditSection,
  ContrastSample,
  PfosEventPayload,
} from './types';

export const VERSION = '0.0.0';
