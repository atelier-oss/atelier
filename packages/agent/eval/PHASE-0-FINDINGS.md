# Phase 0 Gate Findings — 2026-05-08

## What ran

- **Easy corpus (fixtures 01-05)** — full 5-fixture pass against the live Anthropic API.
- **Hard corpus (fixtures 06-15)** — partial pass. Fixture 06 completed; fixtures 07-15 hit `invalid_request_error: Your credit balance is too low` before reaching the API.

Total spend before block: ~$0.13 USD.

## Result

| Bucket | Fixtures | Avg conformance | Verdict |
|---|---|---|---|
| Easy (01-05) | 5/5 ran | **100%** | All PASS — corpus saturated |
| Hard #06 | 1/1 ran | **0%** | FAIL with **28 raw palette refs** |
| Hard #07-15 | 0/9 ran | n/a | API credit exhausted before reaching them |

## What this tells us — Phase 1's real target

The easy corpus was too easy. The very first hard fixture broke the system completely. This is exactly the data the Karpathy ladder asks for — failure modes of the throwaway shape the next phase's design.

### The smoking gun: fixture 06 (warm-coral-pricing)

**Brief**: "pricing card with a warm coral primary CTA on a soft cream canvas, dusty teal secondary actions. Show three tiers with the middle tier highlighted in coral..."

**Result**: 0/28. Zero tokens. Twenty-eight raw palette references. The model emitted code with classes like `bg-orange-400` / `bg-amber-300` / `bg-teal-500` / `bg-rose-200` / `bg-stone-100` directly — exactly the failure mode the system prompt explicitly forbids.

The system prompt has a clear "never reach for raw palette names" rule. When the brief uses specific color language (warm coral, dusty teal, soft cream), the model treats the language as a CSS instruction and reaches for the closest Tailwind palette match instead of an abstract semantic token.

This is the reason Phase 1's iteration loop exists. The prompt alone cannot beat brief-encoded color specificity.

## Implications for Phase 1 design

The cached plan defines Phase 1's loop as: "if score < threshold, agent rewrites raw refs to declared tokens. Cap at N=3." Based on this finding, the Phase 1 rewrite-prompt needs three additions:

1. **Map color language to roles, not palettes.** "Warm coral" → `primary`, "dusty teal" → `accent`, "soft cream" → `background`. The rewrite pass instructs the model to translate color-language to role-tokens, not to find the nearest palette match.
2. **Reject `bg-{palette}-{shade}` and `text-{palette}-{shade}` patterns explicitly.** The rewrite prompt enumerates the failed classes and rewrites each in a single pass.
3. **Optionally scaffold a starter `DESIGN.md`** that names the colors. If the project has no DESIGN.md and the brief specifies brand colors, the agent emits a DESIGN.md alongside the component so the colors live in tokens, not in classes.

Even without DESIGN.md scaffolding, items #1 and #2 alone should clear the gap on fixtures 06-09, 12, 14, 15. Fixtures 10-11 (multi-state, dual-mode) and 13 (data-viz) test orthogonal failure modes — Phase 1 may not close all of them; that's data for Phase 2.

## What's still pending

The 9 unrun hard fixtures (07-15) test additional failure modes:

- **#07 dusty-teal-hero** — same trap as #06 with editorial typography pressure
- **#08 cinematic-orb-hero** — cinematic-vibe references (anchor names from `cinematic-hero-catalog.md`)
- **#09 full-landing-page** — multi-section composition; raw refs slip in via volume
- **#10 multi-state-button** — state variants tempt shade refs (`hover:bg-zinc-200`)
- **#11 dual-mode-card** — dark: variants tempt zinc/slate refs
- **#12 explicit-hex-brand** — `#F47B20` in the brief tempts inline `style={{ color: '#F47B20' }}` or `bg-[#F47B20]`
- **#13 data-viz** — bar-chart shade progressions (`bg-blue-200` / `bg-blue-300` / `bg-blue-400`)
- **#14 explicit-palette-brand** — most direct trap: brief literally says "amber-500"
- **#15 photo-overlay-hero** — gradient overlays tempt arbitrary `rgba()` and `bg-gradient` with stop shades

Re-run after credit top-up to confirm the failure modes fixture 06 already strongly suggests:

```bash
ANTHROPIC_API_KEY=... pnpm --filter @atelier-oss/agent eval
```

## The Phase 1 gate (re-scoped)

Original plan gate: "75% avg conformance after iteration on the original 5-fixture corpus." That gate is meaningless — the corpus already hits 100% pre-iteration.

Re-scoped gate (post-Phase-0-findings):

> **Phase 1 gate: 75% avg conformance after iteration on the 15-fixture extended corpus, where the easy 01-05 stay at 100% and the hard 06-15 average ≥ 60%.**

That gate forces Phase 1's rewrite loop to do real work on the hard cases without breaking the easy cases. If Phase 1 lands and the gate clears, we have empirical proof that the iteration loop earns its existence.

If the gate fails, the answer is data (look at which traps still defeat the loop) and Phase 2 (DESIGN.md auto-bootstrap) becomes the necessary lift.
