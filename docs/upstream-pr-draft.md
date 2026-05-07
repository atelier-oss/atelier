# Draft upstream PR — google-labs-code/design.md

**Status: DRAFT.** Not opened. Phase 3 gate: 30-repo benchmark must clear +40% lift, then async-confirm with maintainers before opening.

---

## PR title

`spec: precedence rule + canonical 8-role sub-token vocabulary`

## Body

### Summary

This PR proposes two additive extensions to the DESIGN.md spec, derived from observed naming patterns across 4 production DESIGN.md files in independent codebases. Both extensions are also implemented downstream in [`@atelier/lint`](https://www.npmjs.com/package/@atelier/lint) (wraps this package); upstreaming collapses the wrap.

### 1. Precedence rule

When a token is resolvable from multiple sources, the higher-precedence source wins:

1. **Explicit** — values from the project's local `DESIGN.md`
2. **Atlas** — defaults from a build-category atlas (e.g. SaaS dashboard / marketing landing)
3. **Palette** — last-resort fallback to raw framework palette (e.g. Tailwind `zinc-900`)

The rule encodes early-return semantics needed by codegen pipelines: per-project intent must survive a re-generation pass.

Reverse precedence is forbidden: an atlas-supplied default MUST NOT silently shadow an explicit DESIGN.md value. Proposed new finding code `PRECEDENCE_VIOLATION` (warning).

### 2. Canonical 8-role sub-token vocabulary

A DESIGN.md may use any naming convention internally (`bg`/`c-bg`/`background` are all valid). The lint rule cares about *roles*, not exact names. The eight canonical roles below were chosen empirically — every one appears in at least 3 of 4 surveyed DESIGN.md files.

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

Proposed new finding code `MISSING_ROLE` (info, non-blocking). Optional `aliases` block in DESIGN.md frontmatter maps a role → project-specific token name when names differ.

### Empirical evidence

Observational corpus walk (committed code, 4 DESIGN.md repos vs 4 control repos):

- DESIGN.md group: **79.9%** semantic-token conformance
- Control group: **39.0%**
- Relative lift: **+105.1%**

Source: [`benchmarks/results/2026-05-07-mvb.md`](https://github.com/<TODO-org>/atelier/blob/main/benchmarks/results/2026-05-07-mvb.md). Full Phase 1 expansion to 30 repos pending; this PR will be re-validated against that result.

### Compatibility

Both extensions are additive:

- New finding codes don't break existing consumers (info / warning, not error).
- The `aliases` block is opt-in.
- The precedence rule activates only when an atlas is supplied; without one, behavior is identical to today.

### Reference implementation

Atelier ships a wrapper that adds these checks on top of the upstream linter pinned at exact `0.1.1`. Source:

- [`@atelier/lint` precedence layer](../packages/lint/src/precedence.ts)
- [`@atelier/lint` sub-token check](../packages/lint/src/sub-tokens.ts)
- [Spec doc](../spec/DESIGN.md.spec.md)

### Questions for maintainers

1. Is there appetite for an in-spec atlas concept, or should atlas remain downstream?
2. Would you prefer the role vocabulary as part of the core schema, or as an opt-in extension flag?
3. Naming: `aliases` or `roles` for the optional mapping block?

---

*Drafted by the Atelier project (2026-05-07). License: MIT for the extension layer; upstream Apache-2.0 preserved.*
