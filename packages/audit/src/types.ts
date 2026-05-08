/** Public types for @atelier-oss/audit. */

export type AuditSection =
  | 'tokenUsage'
  | 'contrast'
  | 'motion'
  | 'accessibility'
  | 'designCoverage'
  | 'responsive';

export interface AuditFinding {
  section: AuditSection;
  message: string;
  path?: string;
  line?: number;
}

export interface AuditConfig {
  /** Project root (must contain DESIGN.md and the component dir). */
  root: string;
  /** Component directory relative to root. Defaults to 'components/home/command-center'. */
  componentDir?: string;
  /** Filename glob for component files in componentDir. Default: *.tsx */
  componentExt?: string;
  /** Tokens that DESIGN.md must mention. Defaults match audit_home_dashboard.py. */
  designKeywords?: string[];
  /** Component names that DESIGN.md must mention. Defaults match audit_home_dashboard.py. */
  designComponents?: string[];
  /** Component file (relative to componentDir) to check for useReducedMotion. */
  motionTarget?: string;
  /** Component file to check for aria-label. */
  ariaTargetSphere?: string;
  /** Component file to check for aria-live announcement. */
  ariaTargetTelemetry?: string;
  /** Component file containing layout grid (responsive check). */
  responsiveTarget?: string;
  /** Optional contrast samples — RGB tuples to test against the dark card surface. */
  contrastSamples?: ContrastSample[];
  /** Override the dark card surface RGB used as contrast background. */
  darkCardRgb?: readonly [number, number, number];
}

export interface ContrastSample {
  label: string;
  rgb: readonly [number, number, number];
}

export interface AuditResult {
  rootPath: string;
  sections: Record<AuditSection, AuditFinding[]>;
  /** Total finding count (sum across all sections). */
  findingCount: number;
}

export interface PfosEventPayload {
  type: 'SKILL_COMPLETED';
  agent_slug: string;
  skill_slug: string;
  surface: string;
  cwd_project: string;
  data: {
    target: string;
    report_path: string;
    finding_count: number;
  };
}
