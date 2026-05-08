/**
 * Audit configuration presets.
 *
 * `prettyflyDefaults()` reproduces the historical defaults from
 * `benchmarks/audit_home_dashboard.py` (the prettyfly-os Mission Control home
 * dashboard) — kept available so the audit's parity oracle continues to pass.
 *
 * `shadcnDefaults()` is the recommended starting point for any project using
 * shadcn-style Radix primitives + a flat `components/` directory.
 *
 * Both functions return a `Partial<AuditConfig>` (no `root`) — callers spread
 * them into `audit({ root, ...shadcnDefaults() })`.
 */

import type { AuditConfig, ContrastSample } from './types';

export type AuditPresetConfig = Omit<AuditConfig, 'root'>;

/** Defaults matching benchmarks/audit_home_dashboard.py — prettyfly-specific. */
export function prettyflyDefaults(): AuditPresetConfig {
  return {
    componentDir: 'components/home/command-center',
    componentExt: '.tsx',
    designKeywords: ['command-palette', 'pulse-card'],
    designComponents: ['CommandCenter', 'CommandSphere', 'TelemetryStream'],
    motionTarget: 'CommandSphere.tsx',
    ariaTargetSphere: 'CommandSphere.tsx',
    ariaTargetTelemetry: 'TelemetryStream.tsx',
    responsiveTarget: 'CommandCenter.tsx',
    darkCardRgb: [24, 24, 27], // hsl(240 6% 10%)
    contrastSamples: [
      { label: 'text-foreground on command-center cards', rgb: [244, 244, 245] },
      { label: 'text-muted-foreground on command-center cards', rgb: [113, 113, 122] },
      { label: 'text-primary on command-center cards', rgb: [244, 116, 31] },
      { label: 'text-[hsl(195,72%,55%)] on command-center cards', rgb: [58, 182, 223] },
      { label: 'text-[hsl(195,72%,38%)] on command-center cards', rgb: [27, 132, 167] },
      { label: 'text-[hsl(24,91%,60%)] on command-center cards', rgb: [246, 134, 60] },
      { label: 'text-emerald-400 on command-center cards', rgb: [52, 211, 153] },
      { label: 'text-red-400 on command-center cards', rgb: [248, 113, 113] },
    ] satisfies ContrastSample[],
  };
}

/**
 * Generic shadcn-style preset — flat `components/` dir, canonical token roles
 * checked in DESIGN.md, no project-specific component name expectations.
 *
 * Adopters should pass an explicit `contrastSamples` for their actual surface
 * colors — the defaults here are conservative shadcn dark-mode samples and
 * may produce false negatives on unusual palettes.
 */
export function shadcnDefaults(): AuditPresetConfig {
  return {
    componentDir: 'components',
    componentExt: '.tsx',
    designKeywords: ['background', 'foreground', 'primary', 'border'],
    designComponents: [],
    motionTarget: '',
    ariaTargetSphere: '',
    ariaTargetTelemetry: '',
    responsiveTarget: '',
    darkCardRgb: [9, 9, 11], // hsl(240 10% 3.9%) — shadcn `--card` dark default
    contrastSamples: [
      { label: 'foreground on card', rgb: [250, 250, 250] },
      { label: 'muted-foreground on card', rgb: [161, 161, 170] },
    ] satisfies ContrastSample[],
  };
}
