# Draft upstream PR — google-labs-code/design.md

**Status: BLOCKED.** The 24-repo three-arm benchmark on 2026-05-07 returned
DESIGN.md = 80.0% conformance, shadcn-default = 65.0%, raw-palette = 60.7%.
The pre-registered primary gate (DESIGN.md ≥ shadcn-default + 15pp absolute)
failed by 0.05pp — +14.95pp computed. The MVB's "+105% relative lift" was
an artifact of conflating shadcn-style and raw-palette repos in the control.

This PR is **not** opening at current numbers. Two paths forward, either of
which would unblock:

1. **Pivot to Phase 2 (generative)** — run AI generation against the same
   corpus with and without DESIGN.md available in context, measure
   generation-time conformance directly. This is the methodologically
   superior test the MVB sidestepped.
2. **Recalibrate the claim** — open the PR with the calibrated number
   (DESIGN.md adds ~15pp over shadcn-default, ~31% relative over
   raw-palette) and let maintainers decide if that's enough signal.

The draft below is preserved as the v0 of the proposed extension. Numbers
will be updated once a path forward is chosen and re-run.

---

## PR title

`spec: precedence rule + canonical 8-role sub-token vocabulary`

## Body

### Summary

This PR proposes two additive extensions to the DESIGN.md spec, derived
from observed naming patterns across 4 production DESIGN.md files in
independent codebases. Both extensions are also implemented downstream in
[`@atelier/lint`](https://www.npmjs.com/package/@atelier/lint) (wraps this
package); upstreaming collapses the wrap.

### 1. Precedence rule

When a token is resolvable from multiple sources, the higher-precedence
source wins:

1. **Explicit** — values from the project's local `DESIGN.md`
2. **Atlas** — defaults from a build-category atlas (e.g. SaaS dashboard / marketing landing)
3. **Palette** — last-resort fallback to raw framework palette (e.g. Tailwind `zinc-900`)

The rule encodes early-return semantics needed by codegen pipelines:
per-project intent must survive a re-generation pass.

Reverse precedence is forbidden: an atlas-supplied default MUST NOT silently
shadow an explicit DESIGN.md value. Proposed new finding code
`PRECEDENCE_VIOLATION` (warning).

### 2. Canonical 8-role sub-token vocabulary

A DESIGN.md may use any naming convention internally (`bg`/`c-bg`/`background`
are all valid). The lint rule cares about *roles*, not exact names. The
eight canonical roles below were chosen empirically — every one appears in
at least 3 of 4 surveyed DESIGN.md files.

| Role | Purpose |
|---|---|
| `background` | Default page surface |
| `foreground` | Default text on `background` |
| `primary` | Brand action (CTA, links) |
| `primary-foreground` | Legible text on `primary` |
| `accent` | Secondary emphasis |
| `muted` | Low-contrast supporting tone |
| `border` | Surface separators |
| `ring` | Focus indicator |

Proposed new finding code `MISSING_ROLE` (info, non-blocking). Optional
`aliases` block in DESIGN.md frontmatter maps a role → project-specific
token name when names differ.

### Empirical evidence (calibrated, 24-repo three-arm, 2026-05-07)

Observational corpus walk (committed code), pre-registered three-arm split:

| Arm | n (kept / total) | Conformance |
|---|---|---|
| `with_design_md` | 3 / 4 | 80.0% |
| `shadcn_default` (Radix UI + shadcn token vocab, no DESIGN.md) | 10 / 10 | 65.0% |
| `raw_palette` (Tailwind palette refs only) | 9 / 10 | 60.7% |

- DESIGN.md vs shadcn-default: **+14.95pp absolute, +23.0% relative**
- DESIGN.md vs raw-palette: +19.3pp absolute, **+31.7% relative**

Pre-registration: `benchmarks/spec.md` (committed before runner expanded).
Caveats: observational only, not causal. All repos are owned by one developer.
External validation requires fork-and-rerun by independent maintainers.

The earlier two-arm MVB (4 + 4 repos, 2026-05-07 morning) reported a +105%
relative lift but conflated shadcn-style and raw-palette projects in the
control. The three-arm split above is the corrected number.

### Compatibility

Both extensions are additive:

- New finding codes don't break existing consumers (info / warning, not error).
- The `aliases` block is opt-in.
- The precedence rule activates only when an atlas is supplied; without one, behavior is identical to today.

### Reference implementation

Atelier ships a wrapper that adds these checks on top of the upstream linter
pinned at exact `0.1.1`. Source:

- [`@atelier/lint` precedence layer](../packages/lint/src/precedence.ts)
- [`@atelier/lint` sub-token check](../packages/lint/src/sub-tokens.ts)
- [Spec doc](../spec/DESIGN.md.spec.md)

### Questions for maintainers

1. Is there appetite for an in-spec atlas concept, or should atlas remain downstream?
2. Would you prefer the role vocabulary as part of the core schema, or as an opt-in extension flag?
3. Naming: `aliases` or `roles` for the optional mapping block?
4. Tailwind v4 (`@theme` blocks, `oklch()` palette) — should the spec carve out a v4 chapter, or stay v3-shaped and treat v4 as a separate proposal?

---

*Drafted by the Atelier project (2026-05-07). License: MIT for the extension layer; upstream Apache-2.0 preserved.*
