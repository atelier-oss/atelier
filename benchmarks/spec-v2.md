# Atelier Phase 1 Benchmark Spec — v2

**Version**: 2
**Locked**: 2026-05-07 (committed before any v2 run)
**Methodology**: Observational, three-arm, **registry-strict classification**
**Supersedes**: spec-v1 (`benchmarks/spec.md`) for classifier rule only; corpus + gate threshold preserved.

## Why v2 exists

The 2026-05-07 v1 run failed the primary gate by 0.05pp (DESIGN.md = 80.0%,
shadcn-default = 65.0%, raw-palette = 60.7%). The post-mortem
(`results/2026-05-07-why-the-lift-compressed.md`) identified arm leakage as
a major confound: the v1 classifier treats *any* non-Tailwind-palette prefix
as TOKEN, so raw-palette repos using ad-hoc semantic naming
(`bg-card`, `text-surface`, etc.) score as if they had a token contract.

v2 closes the leak by requiring **explicit registry membership**: a class
is TOKEN only if its prefix segment appears in the project's declared token
registry. The corpus, dropouts policy, and gate thresholds (≥+15pp absolute
primary, ≥+40% relative secondary) are unchanged from v1 and remain
pre-registered.

## Classifier rule

For class `bg-foo` (or any color-prefix class):

| Condition | v1 verdict | v2-strict verdict | v2-broad verdict |
|---|---|---|---|
| `foo` is a Tailwind palette name (`zinc`, `red`, …) | RAW | RAW | RAW |
| `foo` is a v1-utility-color value (`white`, `transparent`, `none`, sizes, alignment) | ignored | ignored | ignored |
| `foo` is an arbitrary CSS-var ref (`bg-[var(--x)]`) | TOKEN | TOKEN if `x` ∈ registry, else RAW | TOKEN |
| `foo` is an arbitrary value with hex/rgb/hsl literal | RAW | RAW | RAW |
| `foo` is anything else (e.g. `card`, `surface`, `pf-primary`) | **TOKEN** | **TOKEN if `foo` ∈ registry, else RAW** | **TOKEN if `foo` ∈ registry, else RAW** |

The two v2 rules differ only in **what counts as the registry**:

### v2-strict registry

The registry is the union of:

1. **DESIGN.md frontmatter `colors:` keys** (parsed YAML). DESIGN.md is searched at the repo root and at depth-1 subdirectories.

That's it. Strict says: a project has a token contract if and only if it declares one in a DESIGN.md.

### v2-broad registry (primary)

The registry is the union of:

1. **DESIGN.md frontmatter `colors:` keys** (as above).
2. **`tailwind.config.{js,ts,cjs,mjs}` `theme.colors` and `theme.extend.colors` top-level keys** that are NOT Tailwind palette names. (`zinc`, `red`, etc. are excluded; `card`, `surface`, `pf-primary` are included.)
3. **CSS custom properties (`--*`) declared anywhere in the repo's stylesheets** (`.css` / `.scss` / `.postcss`), excluding `node_modules/`. This catches both classic `:root { --bg: ...; }` and Tailwind v4 `@theme` blocks.

Broad says: a project has a token contract if it declares one anywhere — DESIGN.md, tailwind.config, or CSS variables.

## Gate

| Comparison | Metric | Threshold | Blocking? | Strictness |
|---|---|---|---|---|
| **Primary** — DESIGN.md vs shadcn-default | absolute delta | ≥ +15pp | Yes | **v2-broad** (primary) |
| Secondary — DESIGN.md vs raw-palette | relative lift | ≥ +40% | No | v2-broad |
| Sensitivity — same comparisons | both | (informational) | No | v2-strict |

Both v2-broad and v2-strict are reported in the result file. The
**v2-broad primary gate** controls the public-launch decision. v2-strict is
a sensitivity check — if the two strictness levels disagree, the result is
ambiguous and a Phase 2 generative study is the next test.

## Honest framing of the methodology change

This is a **classifier change**, not a corpus change or threshold change.
It is goalpost-moving only if (a) it were authored after seeing the v2
result, and (b) the rule were chosen post-hoc to make the gate clear. To
guard against that:

- This file is committed *before* the v2 implementation runs.
- Both v1 and v2 results will be reported in the same document; v1's FAIL is preserved.
- v2-strict and v2-broad are pre-declared as a sensitivity pair; whichever passes (if any) is not "the" answer — the agreement between them is.

If the upstream PR opens at v2 numbers, the body must include v1 numbers,
the post-mortem, and the sensitivity check. Selective reporting of the
strictness level that passes is forbidden.

## What v2 does NOT change

- Corpus: the same 24 repos as v1 (spec.md §Three-arm corpus).
- Dropouts policy: same (no source files / signal < 10).
- Aggregation: same (sum tokens and raw across kept repos in the arm; conformance = tokens / (tokens + raw)).
- Inline color refs (`#hex`, `rgb()`, `hsl()`) are still RAW unconditionally.
- TS classifier (`@atelier-oss/classify`): unchanged. v2 is Python-side analysis only. The published TS API surface stays at v1; if v2 produces a publishable result, the TS port is updated in a follow-up release.

## Lock

This spec is the v2 pre-registration. Once committed, the registry rules
and the strictness pair are frozen. Any subsequent re-run reuses this spec
or supersedes it with a dated `spec-v3.md`.
