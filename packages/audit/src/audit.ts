/**
 * @atelier/audit — TS port of benchmarks/audit_home_dashboard.py.
 *
 * Six section runners: tokenUsage, contrast, motion, accessibility,
 * designCoverage, responsive. The Python reference lives at
 * design-library/audit_home_dashboard.py (vendored as a parity oracle).
 *
 * Generalized via AuditConfig — defaults reproduce the Python behavior
 * exactly when run against prettyfly-os.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, posix, relative } from 'node:path';
import type {
  AuditConfig,
  AuditFinding,
  AuditResult,
  AuditSection,
  ContrastSample,
  PfosEventPayload,
} from './types';

const HEX_RE = /#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)/g;

const DEFAULTS = {
  componentDir: 'components/home/command-center',
  componentExt: '.tsx',
  designKeywords: ['command-palette', 'pulse-card'],
  designComponents: ['CommandCenter', 'CommandSphere', 'TelemetryStream'],
  motionTarget: 'CommandSphere.tsx',
  ariaTargetSphere: 'CommandSphere.tsx',
  ariaTargetTelemetry: 'TelemetryStream.tsx',
  responsiveTarget: 'CommandCenter.tsx',
  darkCardRgb: [24, 24, 27] as const, // hsl(240 6% 10%)
  contrastSamples: [
    { label: 'text-foreground on command-center cards', rgb: [244, 244, 245] as const },
    { label: 'text-muted-foreground on command-center cards', rgb: [113, 113, 122] as const },
    { label: 'text-primary on command-center cards', rgb: [244, 116, 31] as const },
    { label: 'text-[hsl(195,72%,55%)] on command-center cards', rgb: [58, 182, 223] as const },
    { label: 'text-[hsl(195,72%,38%)] on command-center cards', rgb: [27, 132, 167] as const },
    { label: 'text-[hsl(24,91%,60%)] on command-center cards', rgb: [246, 134, 60] as const },
    { label: 'text-emerald-400 on command-center cards', rgb: [52, 211, 153] as const },
    { label: 'text-red-400 on command-center cards', rgb: [248, 113, 113] as const },
  ] satisfies ContrastSample[],
};

function relLuminance(rgb: readonly [number, number, number]): number {
  const parts = rgb.map((c) => {
    const value = c / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * parts[0]! + 0.7152 * parts[1]! + 0.0722 * parts[2]!;
}

export function contrastRatio(
  foreground: readonly [number, number, number],
  background: readonly [number, number, number],
): number {
  const fg = relLuminance(foreground);
  const bg = relLuminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

function readSafe(path: string): string {
  return readFileSync(path, 'utf-8');
}

function relPosix(path: string, root: string): string {
  return relative(root, path).split(/[/\\]/).join(posix.sep);
}

function inlineColorFindings(root: string, componentDir: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const dir = join(root, componentDir);
  if (!existsSync(dir)) return findings;
  const files = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.tsx'))
    .map((e) => join(dir, e.name))
    .sort();
  for (const filePath of files) {
    const text = readSafe(filePath);
    const lines = text.split(/\r?\n/);
    for (const [idx, line] of lines.entries()) {
      const matches = line.match(HEX_RE);
      if (!matches || matches.length === 0) continue;
      const allowed = line.includes('radial-gradient') || line.includes('shadow-[');
      const lineNo = idx + 1;
      const rel = relPosix(filePath, root);
      const first = matches[0];
      if (allowed) {
        findings.push({
          section: 'tokenUsage',
          path: rel,
          line: lineNo,
          message: `\`${rel}:${lineNo}\` uses custom visual-effect color \`${first}\`; acceptable for the orb effect, but should become a token if reused.`,
        });
      } else {
        findings.push({
          section: 'tokenUsage',
          path: rel,
          line: lineNo,
          message: `\`${rel}:${lineNo}\` uses inline color \`${first}\`; replace with an existing DESIGN.md token.`,
        });
      }
    }
  }
  return findings;
}

function motionFindings(
  root: string,
  componentDir: string,
  target: string,
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const filePath = join(root, componentDir, target);
  if (!existsSync(filePath)) return findings;
  const text = readSafe(filePath);
  if (!text.includes('useReducedMotion')) {
    findings.push({
      section: 'motion',
      message: `\`${target.replace('.tsx', '')}\` does not gate animation with \`useReducedMotion()\`.`,
    });
  }
  if (!text.includes('motion-reduce:animate-none')) {
    findings.push({
      section: 'motion',
      message: `\`${target.replace('.tsx', '')}\` lacks a Tailwind \`motion-reduce\` fallback.`,
    });
  }
  return findings;
}

function contrastFindings(
  root: string,
  componentDir: string,
  ariaTargetTelemetry: string,
  samples: readonly ContrastSample[],
  darkCardRgb: readonly [number, number, number],
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  for (const { label, rgb } of samples) {
    const ratio = contrastRatio(rgb, darkCardRgb);
    if (ratio < 4.5) {
      findings.push({
        section: 'contrast',
        message: `\`${label}\` is ${ratio.toFixed(2)}:1 against the dark card surface; raise it to AA for t-caption/text-xs copy.`,
      });
    }
  }
  // Telemetry follow-up note (Python reference — only fires when telemetry has muted-foreground)
  const telemetryPath = join(root, componentDir, ariaTargetTelemetry);
  if (existsSync(telemetryPath)) {
    const tt = readSafe(telemetryPath);
    if (tt.includes('text-muted-foreground')) {
      const sample = samples.find((s) => s.label.includes('text-muted-foreground'));
      if (sample) {
        const ratio = contrastRatio(sample.rgb, darkCardRgb);
        if (ratio < 4.5) {
          findings.push({
            section: 'contrast',
            message:
              'Telemetry timestamps and empty state use `text-muted-foreground` at caption scale; pair the token fix with the telemetry row pass.',
          });
        }
      }
    }
  }
  return findings;
}

function accessibilityFindings(
  root: string,
  componentDir: string,
  sphere: string,
  telemetry: string,
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const spherePath = join(root, componentDir, sphere);
  if (existsSync(spherePath)) {
    const t = readSafe(spherePath);
    if (!t.includes('aria-label={`Open agents')) {
      findings.push({
        section: 'accessibility',
        message: 'Command sphere link needs an explicit agent-count aria label.',
      });
    }
  }
  const telemetryPath = join(root, componentDir, telemetry);
  if (existsSync(telemetryPath)) {
    const t = readSafe(telemetryPath);
    if (t.includes('Awaiting incoming signal') && !t.includes('aria-live')) {
      findings.push({
        section: 'accessibility',
        message:
          'Telemetry stream empty/live state is not announced; add `aria-live="polite"` if it becomes real-time.',
      });
    }
  }
  return findings;
}

function designCoverageFindings(
  root: string,
  designKeywords: readonly string[],
  designComponents: readonly string[],
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const designPath = join(root, 'DESIGN.md');
  if (!existsSync(designPath)) return findings;
  const t = readSafe(designPath);
  for (const token of designKeywords) {
    if (!t.includes(token)) {
      findings.push({
        section: 'designCoverage',
        message: `DESIGN.md does not mention \`${token}\`.`,
      });
    }
  }
  for (const component of designComponents) {
    if (!t.includes(component)) {
      findings.push({
        section: 'designCoverage',
        message: `DESIGN.md does not cover \`${component}\` yet.`,
      });
    }
  }
  return findings;
}

function responsiveFindings(
  root: string,
  componentDir: string,
  target: string,
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const path = join(root, componentDir, target);
  if (!existsSync(path)) return findings;
  const t = readSafe(path);
  if (!t.includes('lg:grid-cols-[260px_1fr_260px]')) {
    findings.push({
      section: 'responsive',
      message: `${target.replace('.tsx', '')} no longer has a fixed side-column desktop grid; re-check wide layout.`,
    });
  }
  if (!t.includes('grid-cols-1')) {
    findings.push({
      section: 'responsive',
      message: `${target.replace('.tsx', '')} is missing a single-column mobile fallback.`,
    });
  }
  return findings;
}

/** Run all six section runners with a config (defaults match the Python reference). */
export function audit(config: AuditConfig): AuditResult {
  const componentDir = config.componentDir ?? DEFAULTS.componentDir;
  const designKeywords = config.designKeywords ?? DEFAULTS.designKeywords;
  const designComponents = config.designComponents ?? DEFAULTS.designComponents;
  const motionTarget = config.motionTarget ?? DEFAULTS.motionTarget;
  const ariaTargetSphere = config.ariaTargetSphere ?? DEFAULTS.ariaTargetSphere;
  const ariaTargetTelemetry = config.ariaTargetTelemetry ?? DEFAULTS.ariaTargetTelemetry;
  const responsiveTarget = config.responsiveTarget ?? DEFAULTS.responsiveTarget;
  const contrastSamples = config.contrastSamples ?? DEFAULTS.contrastSamples;
  const darkCardRgb = config.darkCardRgb ?? DEFAULTS.darkCardRgb;

  const sections: Record<AuditSection, AuditFinding[]> = {
    tokenUsage: inlineColorFindings(config.root, componentDir),
    contrast: contrastFindings(
      config.root,
      componentDir,
      ariaTargetTelemetry,
      contrastSamples,
      darkCardRgb,
    ),
    motion: motionFindings(config.root, componentDir, motionTarget),
    accessibility: accessibilityFindings(
      config.root,
      componentDir,
      ariaTargetSphere,
      ariaTargetTelemetry,
    ),
    designCoverage: designCoverageFindings(config.root, designKeywords, designComponents),
    responsive: responsiveFindings(config.root, componentDir, responsiveTarget),
  };

  const findingCount = Object.values(sections).reduce((sum, arr) => sum + arr.length, 0);
  return {
    rootPath: config.root,
    sections,
    findingCount,
  };
}

export interface BuildPfosPayloadInput {
  cwdProject: string;
  reportPath: string;
  findingCount: number;
}

export function buildPfosPayload(input: BuildPfosPayloadInput): PfosEventPayload {
  return {
    type: 'SKILL_COMPLETED',
    agent_slug: 'atelier',
    skill_slug: 'design-audit',
    surface: 'pf_runtime',
    cwd_project: input.cwdProject,
    data: {
      target: 'home-dashboard',
      report_path: input.reportPath,
      finding_count: input.findingCount,
    },
  };
}
