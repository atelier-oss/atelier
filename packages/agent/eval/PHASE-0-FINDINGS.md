# Phase 0 Gate Findings — 2026-05-08

## What ran

Three gate runs on 2026-05-08:

1. **First run** — partial. 5/5 easy + 1/10 hard before credit exhaustion. ~$0.13 spent.
2. **Second run** — credit-blocked, 0 fixtures completed.
3. **Third run** — full 15-fixture pass after credit top-up. ~$0.33 spent.

Numbers below are from the third (complete) run.

## Result — full 15-fixture corpus

| Fixture | Conformance | tokens/raw | Verdict | Notes |
|---|---|---|---|---|
| 01-pricing-tiers | 100.0% | 31/0 | PASS | easy |
| 02-saas-hero | 100.0% | 14/0 | PASS | easy |
| 03-chat-bubble | 100.0% | 6/0 | PASS | easy |
| 04-stat-band | 100.0% | 3/0 | PASS | easy |
| 05-data-table | 100.0% | 20/0 | PASS | easy |
| **06-warm-coral-pricing** | **0.0%** | **0/26** | **FAIL** | **soft color language → palette refs** |
| 07-dusty-teal-hero | 92.9% | 13/1 | PASS | softer trap, edge clears |
| **08-cinematic-orb-hero** | **38.5%** | **15/24** | **FAIL** | **"amber and teal glow accents" → palette refs** |
| 09-full-landing-page | 100.0% | 61/0 | PASS | volume alone is fine |
| 10-multi-state-button | 100.0% | 23/0 | PASS | states tokenize cleanly |
| 11-dual-mode-card | 100.0% | 12/0 | PASS | dark: variants OK |
| 12-explicit-hex-brand | 81.8% | 9/2 | PASS | `#F47B20` in brief, model resists |
| 13-data-viz | 100.0% | 8/0 | PASS | bar chart clean |
| 14-explicit-palette-brand | 75.0% | 9/3 | PASS | `amber-500` in brief, model resists |
| 15-photo-overlay-hero | 100.0% | 2/0 | PASS | gradient overlay clean |
| **Average** | **85.88%** | 226/56 | **GATE PASS** | (against 50% threshold) |

## What this tells us — Phase 1's real target

The easy corpus was too easy. The hard corpus revealed a precise failure pattern, narrower than expected.

### The pattern: poetic descriptive color language is the failure vector

**Smoking gun #1 — fixture 06 (warm-coral-pricing)**

Brief: "pricing card with a warm coral primary CTA on a soft cream canvas, dusty teal secondary actions..." Result: 0/26. Zero tokens, twenty-six raw palette references.

**Smoking gun #2 — fixture 08 (cinematic-orb-hero)**

Brief: "AI product hero in the Sentinel AI / Synapse Dark register — dark cosmic canvas, abstract glowing sphere, **amber and teal glow accents**..." Result: 15/24. Token discipline holds for canvas + foreground but fully collapses on the "amber and teal glow" specification — the model emits classes like `bg-amber-400` / `from-amber-500` / `to-teal-400` directly.

**The surprising non-failures**

Three traps that *should* have worked actually didn't:

- **#12 explicit-hex-brand** — brief literally says "use #F47B20". Conformance: 81.8%. The model treats explicit hex as a *spec* requiring tokens, not a license to inline the hex.
- **#14 explicit-palette-brand** — brief literally says "use amber-500". Conformance: 75%. Same — direct palette names register as bait, not instructions.
- **#09 full-landing-page** — 61 tokens emitted, 0 raw. Volume doesn't tempt regression on its own.

### The pattern, sharpened

The system prompt's "never reach for raw palette names" rule beats:
- Direct hex specs in the brief (`#F47B20`)
- Direct palette names in the brief (`amber-500`)
- High-volume multi-section briefs
- State-variant proliferation
- Dark-mode variants

The rule loses to:
- Soft poetic color language (`warm coral`, `dusty teal`, `soft cream`)
- Atmospheric/glow descriptors (`amber and teal glow accents`)

The model resists *literal palette mentions* but capitulates to *descriptive color metaphors*. Phase 1's rewrite-prompt has a precise target: detect raw `bg-{palette}-{shade}` / `text-{palette}-{shade}` / `from-{palette}-{shade}` / `to-{palette}-{shade}` patterns in the emission and translate them to role tokens, with the rewrite-prompt explicitly naming the descriptive trigger words from the original brief.

## Implications for Phase 1 design

The cached plan defines Phase 1's loop as: "if score < threshold, agent rewrites raw refs to declared tokens. Cap at N=3." Based on this finding, the Phase 1 rewrite-prompt needs three additions:

1. **Map color language to roles, not palettes.** "Warm coral" → `primary`, "dusty teal" → `accent`, "soft cream" → `background`. The rewrite pass instructs the model to translate color-language to role-tokens, not to find the nearest palette match.
2. **Reject `bg-{palette}-{shade}` and `text-{palette}-{shade}` patterns explicitly.** The rewrite prompt enumerates the failed classes and rewrites each in a single pass.
3. **Optionally scaffold a starter `DESIGN.md`** that names the colors. If the project has no DESIGN.md and the brief specifies brand colors, the agent emits a DESIGN.md alongside the component so the colors live in tokens, not in classes.

Even without DESIGN.md scaffolding, items #1 and #2 alone should clear the gap on fixtures 06-09, 12, 14, 15. Fixtures 10-11 (multi-state, dual-mode) and 13 (data-viz) test orthogonal failure modes — Phase 1 may not close all of them; that's data for Phase 2.

## Re-run anytime

```bash
ANTHROPIC_API_KEY=... pnpm --filter @atelier-oss/agent eval
```

Cost ~$0.30 per run, ~3 minutes wall-clock.

## The Phase 1 gate (re-scoped post-empirical-data)

Original plan gate: "75% avg conformance after iteration on the original 5-fixture corpus." That gate is meaningless — the corpus already hits 100% pre-iteration.

**Re-scoped gate (post-Phase-0-findings, with hard data):**

> **Phase 1 gate: 95% avg conformance after iteration on the full 15-fixture corpus, with no individual fixture below 75%.**

Rationale: pre-iteration the average is 85.88% with two outliers (#06 at 0%, #08 at 38.5%). If Phase 1's loop closes those two outliers to 75%+ each (a generous bar — the goal is to lift them above the 50% pass threshold and into "decent" territory), the new average lands around 95%. That's the empirical bar Phase 1's rewrite loop should clear.

If Phase 1 lands and the gate clears, the iteration loop has empirically earned its existence. If the gate misses on #06 or #08 specifically, Phase 2's DESIGN.md auto-bootstrap is the necessary lift — the model needs explicit role tokens declared in a project-local spec to translate `warm coral` into `var(--primary)` instead of `bg-amber-300`.
