# Why the lift compressed: a post-mortem of the +14.95pp result

Date: `2026-05-07` (same-day retrospective on the 24-repo benchmark)

## TL;DR

The MVB reported +105% relative lift (DESIGN.md = 79.9%, control = 39.0%).
The pre-registered three-arm Phase 1 reported +14.95pp absolute (DESIGN.md =
80.0%, shadcn-default = 65.0%, raw-palette = 60.7%) — a near-miss FAIL on
the +15pp gate. The compression has three identifiable causes:

1. **The MVB's "control" was misclassified.** It mixed shadcn-style and raw-palette repos in one bucket. `intent-graph` (96.1% conformance, MVB control) is actually a shadcn project — `@radix-ui/*` is in `package.json`. Re-running with intent-graph in the shadcn arm raises the shadcn baseline and shrinks the apparent DESIGN.md effect.
2. **The shadcn arm has its own strong token vocabulary.** shadcn-style projects use `bg-background` / `text-foreground` / `bg-card` etc. as a de-facto token contract. The classifier counts these as TOKEN. The shadcn arm's 65% conformance is genuinely high because the convention is doing most of the work; DESIGN.md adds ~15pp on top, not the dramatic 105% the MVB suggested.
3. **The raw-palette arm is leakier than the spec assumed.** Several "raw" repos score >80% conformance because they define custom Tailwind classes (`bg-card`, `bg-surface`) via `tailwind.config` extensions or CSS custom properties. The classifier — which counts any non-Tailwind-palette prefix as TOKEN — credits those refs as semantic tokens even though the project never declared a DESIGN.md.

## Per-repo signal that drove the result

### Arm A (DESIGN.md), n = 3 functioning

| Repo | Conformance | Notes |
|---|---|---|
| consult-ops | 75.7% | Production SaaS, mature DESIGN.md (Phase 1 gold-standard exemplar). |
| advisory-board | 77.8% | Live multi-LLM tool, smaller surface, consistent token use. |
| prettyfly-os | 86.3% | Largest signal contributor (1711 token refs). Heavy DESIGN.md + atlas usage. |
| **eight12-run-club-website** | dropped | Hugo/Jekyll site — zero `.tsx`/`.jsx` source files, expected dropout per spec. |

Arm aggregate: 4101 / 5128 = **80.0%**.

### Arm B (shadcn-default), n = 10

| Repo | Conformance | Notes |
|---|---|---|
| medspa-platform | 97.7% | High conformance, small signal (250 toks vs 6 raw). |
| intent-graph | 96.8% | Shadcn defaults plus tight palette discipline. |
| yehovah/landing | 93.9% | Marketing landing, narrow component palette. |
| prettyfly/decision-maker-identifier/code | 89.0% | Internal tool, shadcn idiom. |
| prettyfly-os-coach | 85.1% | Sibling of prettyfly-os; shares token vocabulary. |
| koho/excerpa/web | 76.6% | Active product. |
| agent-hub-dashboard | 67.8% | Mixed shadcn + raw refs. |
| yehovah/app | 64.0% | **Largest single contributor** (13,489 token refs). Production app — drag came from raw refs in legacy charts/tables (7,584 raw). |
| **1g1f-ministries** | 19.7% | Outlier — Bootstrap-on-Radix mix. 1234 raw refs vs 303 token. |
| **prettyfly/audit-engine** | 2.9% | Outlier — early-stage, hard-coded colors throughout. |

Arm aggregate: 18642 / 28670 = **65.0%**. Two outliers (1g1f-ministries, audit-engine) drag the arm down by ~3pp; without them the shadcn arm would be ~68%, narrowing the DESIGN.md gap further.

### Arm C (raw_palette), n = 9

| Repo | Conformance | Notes |
|---|---|---|
| **base-camp-tampa** | 96.8% | "Raw" by classification, but uses extensive `bg-card`, `bg-surface`, `text-foreground` custom Tailwind extensions. Classifier counts these as TOKEN. |
| gravity-stack/site | 87.8% | Same pattern. |
| koho/process-automation/frontend | 86.1% | Same. |
| eight12-run-club-web | 81.9% | Light Tailwind usage, mostly named classes. |
| open-generative-ai | 77.7% | Same. |
| evansville-tonight | 14.2% | Genuine raw-palette (`bg-zinc-900` style). |
| nexus | 5.3% | Tiny surface, mostly inline. |
| mission-control/api-cost-dashboard | 5.0% | Genuine raw. |
| prettyfly-audit-engine | 4.1% | Genuine raw. |
| **gravity-claw/dashboard** | dropped | 0 source files with signal — insufficient_signal dropout. |

Arm aggregate: 2731 / 4499 = **60.7%**. The "leaky" repos (base-camp-tampa et al.) inflate the arm by ~25pp. If they were correctly reclassified as a fourth "custom-tokens-no-DESIGN.md" arm, the genuine raw-palette baseline would drop to ~25–30% — closer to MVB territory and reopening the lift gap.

## What the data actually supports

- **DESIGN.md correlates with higher token conformance.** +14.95pp over shadcn-default, +19.3pp over raw-palette. Real, measurable, modest.
- **The shadcn convention does most of the heavy lifting.** Once a project adopts shadcn-style tokens, the *additional* gain from DESIGN.md is real but small (~15pp).
- **The MVB's +105% claim was an artifact of arm conflation.** It cannot be reproduced with honest classification.

## What the data does NOT support

- "DESIGN.md is a 105% revolution." The number was inflated.
- "DESIGN.md beats shadcn defaults at +15% absolute." Pre-registered gate. Not cleared.
- Any causal claim — observational design can't separate "DESIGN.md adoption signals project hygiene" from "DESIGN.md causes hygiene."

## What would tighten the test

### Option 3a — Spec-v2 with stricter classifier (~2 hr, falsifiable, low commitment)

Replace the current "any non-palette prefix → TOKEN" rule with **explicit registry membership**: a token reference counts as TOKEN only if the prefix segment appears in either (a) the project's `DESIGN.md` token list, (b) `tailwind.config.{js,ts}` `theme.extend.colors` keys, or (c) a CSS custom property (`--*`) declared in a project stylesheet.

Effect on the data:
- Arm A: largely unchanged (DESIGN.md repos already declare their tokens).
- Arm B: shadcn projects with tailwind-config extensions stay high; ad-hoc usage drops.
- Arm C: leaky repos (base-camp-tampa et al.) drop sharply — their custom tokens are still custom, but they don't have a DESIGN.md or even a tailwind-config registry.

If the gate clears under spec-v2 AND spec-v2 is committed before the re-run, it is not goalpost-moving — it's a methodologically tighter pre-registration. If the gate still fails, the calibrated claim is the truth and the next move is option 1 or 2.

### Option 1 — Generative arm-vs-arm (~3–5 days, the methodologically clean test)

For each of the 24 repos, run an LLM coding agent (Claude Sonnet, GPT-5.1) twice on the same task: once with DESIGN.md available in context, once without. Score the generated diff for token vs raw. Per-project paired comparison eliminates the project-quality confound.

This is the test the upstream PR maintainers would actually want. It produces a causal claim. It's expensive in time and tokens but cheap in code.

### Option 2 — Recalibrate and ship at +14.95pp / +31.7%

Open the upstream PR with the calibrated numbers as-is. Frame it honestly: "DESIGN.md adds ~15pp of conformance over shadcn-default projects in observational data; this is the corrected number after the MVB's two-arm conflation was discovered." Lower-confidence story, but legitimately defensible.

## Recommendation

**Option 3a** (spec-v2 with stricter classifier) is the safest next step:

- Smallest commitment (~2 hr).
- Pre-registration is preserved if the v2 spec is locked before re-running.
- Produces information that disambiguates options 1 and 2 — if v2 clears the gate, ship; if not, the case for option 1 is stronger.
- Costs nothing if abandoned.

The current data is consistent with both "DESIGN.md is a small but real effect" (option 2 calibration) and "DESIGN.md is a real effect being masked by classifier leakage" (option 3a thesis). Option 3a is the lowest-cost test that distinguishes them.

Open question for the option-3a re-run: should the v2 classifier require a *named token registry* (DESIGN.md or `tailwind.config` `theme.extend.colors`), or accept any project-declared CSS custom property? The strict interpretation favors DESIGN.md; the broad interpretation tests the more honest "any explicit token contract" hypothesis. The upstream PR audience cares about the strict version. The honest claim test wants the broad version. Pre-register one before the re-run.
