# Atelier Phase 1 Benchmark Spec

**Version**: 1
**Locked**: 2026-05-07 (pre-registered before runner expansion)
**Methodology**: Observational, three-arm

## Hypothesis

Repos that adopt a `DESIGN.md` token contract show higher semantic-token
conformance in committed code than repos that rely on shadcn defaults alone,
which in turn outscore repos that use raw Tailwind palette values.

The MVB (4 + 4) measured a **+105.1% relative lift** of `DESIGN.md` over a
mixed control. That control conflated two populations — projects using
shadcn's default token vocabulary (`bg-background`, `text-foreground`) and
projects using raw Tailwind palette values (`bg-zinc-900`). This spec
splits the control into two arms so the test of "DESIGN.md adds value
*on top of* the prevailing shadcn convention" is unambiguous.

## Three-arm corpus

Each arm is enumerated by absolute path. The list is **frozen** when this
file is committed; later additions or removals must be a new spec version
(`spec-v2.md`) accompanied by a dated note.

### Arm A — `with_design_md` (n = 4)

Repos with a `DESIGN.md` file at the project root or one level deep,
authored organically (not backfilled for this benchmark).

| Repo | Path |
|---|---|
| consult-ops | `/Users/alexhale/Projects/koho/consult-ops` |
| eight12-run-club-website | `/Users/alexhale/Projects/eight12-run-club-website` |
| advisory-board | `/Users/alexhale/Projects/advisory-board` |
| prettyfly-os | `/Users/alexhale/Projects/prettyfly-os` |

### Arm B — `shadcn_default` (n = 10)

Repos using shadcn-style Radix UI primitives + the shadcn token vocabulary
(`bg-background`, `text-foreground`, …) but **no `DESIGN.md`**. Detected by
`@radix-ui/*` in `package.json` dependencies.

| Repo | Path |
|---|---|
| agent-hub-dashboard | `/Users/alexhale/Projects/agent-hub-dashboard` |
| intent-graph | `/Users/alexhale/Projects/intent-graph` |
| medspa-platform | `/Users/alexhale/Projects/medspa-platform` |
| prettyfly-os-coach | `/Users/alexhale/Projects/prettyfly-os-coach` |
| koho/excerpa/web | `/Users/alexhale/Projects/koho/excerpa/web` |
| prettyfly/audit-engine | `/Users/alexhale/Projects/prettyfly/audit-engine` |
| prettyfly/decision-maker-identifier | `/Users/alexhale/Projects/prettyfly/decision-maker-identifier/code` |
| yehovah/app | `/Users/alexhale/Projects/yehovah/app` |
| yehovah/landing | `/Users/alexhale/Projects/yehovah/landing` |
| 1g1f-ministries | `/Users/alexhale/Projects/1g1f/code/1g1f-ministries` |

### Arm C — `raw_palette` (n = 10)

Repos using Tailwind without the shadcn token contract — colors come from
the raw palette (`bg-zinc-900`, `text-blue-500`, etc.), no `DESIGN.md`,
no `@radix-ui/*` deps.

| Repo | Path |
|---|---|
| base-camp-tampa | `/Users/alexhale/Projects/base-camp-tampa` |
| eight12-run-club-web | `/Users/alexhale/Projects/eight12-run-club-web` |
| evansville-tonight | `/Users/alexhale/Projects/evansville-tonight` |
| gravity-claw/dashboard | `/Users/alexhale/Projects/gravity-claw/dashboard` |
| gravity-stack/site | `/Users/alexhale/Projects/gravity-stack/site` |
| koho/process-automation/frontend | `/Users/alexhale/Projects/koho/process-automation/frontend` |
| mission-control/api-cost-dashboard | `/Users/alexhale/Projects/mission-control/api-cost-dashboard` |
| nexus | `/Users/alexhale/Projects/nexus` |
| open-generative-ai | `/Users/alexhale/Projects/open-generative-ai` |
| prettyfly-audit-engine | `/Users/alexhale/Projects/prettyfly-audit-engine` |

**Total corpus:** 24 repos. Naming the milestone "Phase 1 expansion" rather
than "30-repo benchmark" — the universe of organic `DESIGN.md` projects
is the binding constraint, and inflating by hand-rolling DESIGN.md backfills
would defeat the observational design.

## Scoring

Per-file scoring uses `benchmarks/score.py` (`score_text(text)` →
`(tokens, raw)`) with these rules unchanged from the MVB:

- A `bg-`/`text-`/`border-`/`ring-` class with a Tailwind-palette first segment (`zinc`, `blue`, etc.) → `RAW`.
- A `bg-`/`text-`/… class with any other first segment (e.g. `bg-foreground`, `text-pf`) → `TOKEN`.
- Arbitrary value `bg-[var(--x)]` → `TOKEN`. Arbitrary value containing hex/rgb/hsl literal → `RAW`. Arbitrary non-color value (e.g. `text-[length:14px]`) → ignored.
- Inline `#hex`, `rgb()`, `rgba()`, `hsl()`, `hsla()` references → `RAW`.
- White / black / transparent / inherit / current / none / size keywords → ignored.

Per-repo conformance is `tokens / (tokens + raw)`. Per-arm conformance
aggregates the tokens and raw counts across the arm's repos before
computing the ratio (so a single very large repo doesn't get equal weight
to a tiny one — this matches the MVB).

## Gate

Two arm-pair comparisons are computed:

| Comparison | Metric | Threshold |
|---|---|---|
| **Primary** — DESIGN.md vs shadcn-default | `arm_A_conformance - arm_B_conformance` (absolute) | ≥ +15% |
| Secondary — DESIGN.md vs raw-palette | `(arm_A - arm_C) / arm_C` (relative) | ≥ +40% (matches MVB) |

The **primary gate** is what controls the public-launch decision. The
secondary gate is reported for continuity with the MVB but does not block.

## Dropouts policy

A repo is dropped from its arm's aggregate (with attribution recorded) if:

1. `find_source_files()` returns zero files (no .tsx/.jsx/.ts/.js source). Pre-declared expected dropout: `eight12-run-club-website` (Hugo/Jekyll style, no JS sources).
2. Total `tokens + raw` signal is < 10 (insufficient color signal — the repo doesn't exercise design tokens at all).

Dropouts are listed in the result file but do **not** trigger arm-rebalancing — the gate is computed on whatever signal the corpus produces.

## What this benchmark does NOT measure

- **Causality.** A DESIGN.md doesn't *cause* better tokens; the same project hygiene that motivates writing one also motivates following its rules. The honest framing is correlational.
- **AI-generation conformance.** This is a committed-code snapshot — a Phase 2 study would run AI generation against the same corpus with and without `DESIGN.md` available in context.
- **Cross-team variance.** Every repo is owned by one developer (Alex). External validation requires forks of the methodology by independent maintainers.

These caveats are reproduced verbatim in the result file and the upstream PR.

## Lock

This file is the pre-registration. Once committed, the corpus is frozen.
The gate threshold (+15% absolute primary) is locked. Any subsequent
re-run reuses this spec or supersedes it with a dated `spec-v2.md`.
