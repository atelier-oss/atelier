---
version: alpha
name: Atelier DESIGN.md spec extension
description: "Extension layer over @google/design.md@0.1.1 (Apache-2.0). Adds the precedence rule (explicit > atlas > palette) and a canonical 8-role sub-token vocabulary derived from observed naming patterns across 4 production DESIGN.md files. Lints clean against itself: this document doubles as the reference exemplar."
colors:
  background: "#FAF9F6"
  foreground: "#1A1A2E"
  primary: "#F47B20"
  primary-foreground: "#171717"
  accent: "#4338CA"
  muted: "#475569"
  border: "#CAD6E8"
  ring: "#0095FF"
typography:
  heading:
    fontFamily: ui-sans-serif
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 2rem
  body:
    fontFamily: ui-sans-serif
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5rem
  body-sm:
    fontFamily: ui-sans-serif
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.25rem
  caption:
    fontFamily: ui-sans-serif
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1rem
spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
rounded:
  sm: 0.25rem
  md: 0.375rem
  lg: 0.5rem
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    typography: "{typography.body-sm}"
---

# Atelier DESIGN.md spec extension

> **Status**: alpha. Subject to refinement during Phase 3 (30-repo benchmark expansion).
> **Basis**: `@google/design.md@0.1.1` (Apache-2.0).
> **License of this extension**: MIT.

## 1. Fork notice

`@atelier/lint` wraps `@google/design.md@0.1.1` as a runtime dependency and re-exports its lint pipeline verbatim. Everything below is **additive** — no upstream behavior is removed or modified. If the additions land upstream via PR, this layer becomes a no-op compatibility shim and is collapsed into the dependency.

The Apache-2.0 NOTICE for `@google/design.md` is preserved at the repo root.

## 2. Precedence rule

When a token is resolvable from multiple sources, the **higher-precedence source wins**, in this order:

1. **Explicit** — values authored in the project's local `DESIGN.md`.
2. **Atlas** — defaults supplied by the build-category atlas (`@atelier/atlas`) when no local DESIGN.md value exists for the token.
3. **Palette** — last-resort fallback to the framework's default palette (e.g. raw Tailwind palette values).

Reverse precedence is forbidden: the atlas MUST NOT silently overwrite an explicit DESIGN.md value. `@atelier/lint` emits `ATELIER_PRECEDENCE_VIOLATION` (warning) when an atlas-supplied default shadows an explicit token without a documented override marker.

This rule encodes the early-return semantics required by the design-stack pipeline (`Step 0.5`) so that per-project intent always survives a re-generation pass.

## 3. Canonical 8-role sub-token vocabulary

A DESIGN.md may use any naming convention internally (`bg`/`c-bg`/`background` are all valid). The lint rule cares about **roles**, not exact names. The 8 canonical roles below were chosen empirically — every one appears in at least 3 of the 4 production DESIGN.md files surveyed (consult-ops, eight12-run-club-website, advisory-board, prettyfly-os).

| Role | Purpose | Common names observed |
|---|---|---|
| `background` | The default page surface color | `background`, `c-bg`, `bg`, `surface` |
| `foreground` | Default text color on `background` | `foreground`, `c-text`, `text`, `dark-foreground` |
| `primary` | Brand action color (CTA, links, focus targets) | `primary`, `c-accent`, `c-primary` |
| `primary-foreground` | Legible text on `primary` | `primary-foreground`, `c-text`, `cta-foreground` |
| `accent` | Secondary emphasis color (badges, highlights) | `accent`, `c-secondary`, `secondary` |
| `muted` | Low-contrast supporting tone (timestamps, captions, separators) | `muted`, `muted-foreground`, `c-text-muted` |
| `border` | Surface separator color | `border`, `c-border`, `input` |
| `ring` | Focus indicator color | `ring`, `c-focus`, `focus` |

A DESIGN.md is **role-complete** when each of the 8 roles is satisfied by some token. The lint rule emits `info`-level findings for any unsatisfied role (named `ATELIER_MISSING_ROLE`). It does NOT emit errors — partial coverage is valid; full coverage is recommended.

When a DESIGN.md defines a token whose name exactly matches a canonical role (case-insensitive, hyphens optional), the role is auto-satisfied. To satisfy a role under a different name, declare the alias explicitly in the (non-standard, Atelier-specific) `aliases` block:

```yaml
aliases:
  background: c-bg
  foreground: c-text
  primary: c-accent
  # remaining roles map similarly to project-specific token names
```

The `aliases` block is **opt-in** — DESIGN.md files that omit it pass the lint rule based on direct name matching only.

## 4. Lint contract additions

`@atelier/lint` adds two finding codes on top of `@google/design.md`:

- **`ATELIER_PRECEDENCE_VIOLATION`** (warning) — atlas default shadows explicit DESIGN.md token. See §2.
- **`ATELIER_MISSING_ROLE`** (info) — a canonical role from §3 has no satisfying token. Non-blocking.

The `lintDesignMd` adapter splits findings into `errors` / `warnings` / `infos` arrays and exposes the Atelier extensions as a separate `atelierFindings` array so consumers can inspect or suppress them independently.

## 5. Migration path

For projects using the upstream `@google/design.md` directly:

1. `pnpm install @atelier/lint`
2. Replace `import { lint } from '@google/design.md/linter'` with `import { lintDesignMd } from '@atelier/lint'`.
3. Pass an atlas default (optional) to enable precedence checking; omit for parity with upstream behavior.
4. Run `pnpm exec atelier lint DESIGN.md` — output is identical to upstream when no atlas is supplied.

The wrapper's pinned upstream version is exposed as `UPSTREAM_PIN` (currently `0.1.1`). When upstream releases a new version, the wrapper updates explicitly — no caret-range auto-bumps.

## 6. Compatibility & reciprocity

If `@google/design.md` adopts the precedence rule and/or the canonical role vocabulary upstream, the wrapper drops the corresponding layer in the next release and continues to behave identically. There is no value in maintaining a permanent fork once these semantics live upstream.

If the upstream package is abandoned or relicensed incompatibly, `@atelier/lint` ships a minimal compatibility implementation under `internal/design-md-0.1.1-compat` to keep downstream consumers unbroken; switching is a single dependency swap.
