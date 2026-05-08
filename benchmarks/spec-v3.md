# Atelier Phase 4 Benchmark Spec — v3 (Generative)

**Version**: 3
**Locked**: 2026-05-08 (committed before any v3 run)
**Methodology**: Generative, three-arm, pre-registered
**Supersedes**: nothing — v3 is a different study (generative) than v1/v2 (observational). All three coexist.

## Why v3 exists

v1 + v2 measured **committed-code conformance** across 24 organic repos. v2-broad cleared the +15pp gate at +16.87pp absolute. The honest framing was that the lift was **correlational** — projects with DESIGN.md may also be projects with better hygiene, and the test couldn't tell those apart.

v3 measures **generative conformance**: when an LLM is asked to write new component code, does the agent (with DESIGN.md + atlas context) produce more tokenized output than vanilla Claude does on the same brief? This is the causal test that v1/v2 explicitly carved out for "Phase 2 generative study" (`spec.md` §What this benchmark does NOT measure).

If v3 passes, the agent + DESIGN.md is the source of the lift, not project-hygiene confounding. That's the receipt that justifies Phase 5 distribution and the public launch.

## Hypothesis

Identical brief, three calling shapes:

- Arm A — **agent + DESIGN.md** — `Agent.run({ brief, cwd: scaffolded-project-with-DESIGN.md })` produces code that scores ≥ +30pp absolute conformance over Arm C.
- Arm B — **agent solo** — `Agent.run({ brief })` (no cwd, no figma) — used to isolate the DESIGN.md contribution from the agent's system prompt.
- Arm C — **raw Claude** — bare Anthropic SDK call, no system prompt, user message = `"Build this React + Tailwind component:\n\n<brief>"`.

If A − C ≥ +30pp **and** A − B ≥ +10pp, the agent + DESIGN.md is the source of the lift, not just the system prompt's token-discipline rules. If A − C is large but A − B is small, the system prompt is doing the work — that's a publishable negative result and forces a v3.x revision.

## Three-arm calling shapes (frozen)

The exact code-level shape of each arm is locked here. Any deviation invalidates the run and requires a v4 spec.

### Arm A — agent + DESIGN.md

```ts
const agent = new Agent({
  apiKey: process.env.ANTHROPIC_API_KEY,
  iterate: 3,
  threshold: 0.95,
});
const result = await agent.run({
  brief: fixture.brief,
  cwd: SCAFFOLDED_PROJECT_DIR,  // a tmpdir with a saas-dashboard DESIGN.md
});
```

The scaffolded project dir is created once at run start. It contains the saas-dashboard `Default DESIGN.md template` (the same canonical 8-role token block that lives in `packages/atlas/shards/saas-dashboard.md` lines 104–219). That makes the DESIGN.md known-good and identical across all Arm A runs.

### Arm B — agent solo

```ts
const agent = new Agent({
  apiKey: process.env.ANTHROPIC_API_KEY,
  iterate: 3,
  threshold: 0.95,
});
const result = await agent.run({
  brief: fixture.brief,
  // no cwd, no figma
});
```

### Arm C — raw Claude (the baseline)

```ts
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 16384,
  // NO system prompt
  // NO temperature / top_p / top_k (CARL [OPUS-4-7] sampling policy)
  messages: [
    {
      role: 'user',
      content: `Build this React + Tailwind component:\n\n${fixture.brief}`,
    },
  ],
});
```

The user-message string `"Build this React + Tailwind component:\n\n"` is the exact, frozen prefix. It is the minimum context any user would type. The brief follows verbatim. Output is parsed for the first ```` ```tsx ```` / ```` ```jsx ```` fenced block; if no fence, the entire content is treated as the code (raw Claude sometimes omits the fence).

## Corpus (frozen)

15 fixtures total: **10 from the existing Phase 0 corpus + 5 fresh authored against this spec**. All fixtures live at `packages/agent/eval/golden-corpus/<id>.json` with shape `{ id, brief, category, difficulty?, trap? }`.

### Phase 0 carryover (10)

| ID | Why included |
|---|---|
| `01-pricing-tiers` | Easy baseline — clean unambiguous brief |
| `02-saas-hero` | Easy baseline |
| `05-data-table` | Easy baseline (different surface) |
| `06-warm-coral-pricing` | Hard — poetic-color failure vector (Phase 0 Arm B failed at 0%) |
| `07-dusty-teal-hero` | Hard — softer poetic-color trap (Phase 0 Arm B passed at 92.9%) |
| `08-cinematic-orb-hero` | Hard — "amber and teal glow accents" failure vector |
| `09-full-landing-page` | Volume control — does volume tempt regression? |
| `12-explicit-hex-brand` | Hard — `#F47B20` direct hex in brief |
| `14-explicit-palette-brand` | Hard — `amber-500` direct palette in brief |
| `15-photo-overlay-hero` | Photographic overlay control |

The selection mixes 5 easy + 5 hard from Phase 0 to characterize the lift across difficulty bands.

### Fresh fixtures (5) — authored against this spec

Per the methodology requirements (2 poetic / 2 direct-spec / 1 clean control), no vocabulary overlap with `01–15`:

| ID | Type | Brief vocabulary |
|---|---|---|
| `16-aubergine-music-card` | Poetic | "deep aubergine", "sunbeam yellow", "fog grey" |
| `17-champagne-watch-detail` | Poetic | "champagne gold", "charcoal velvet", "ivory", "ember orange" |
| `18-fintech-portfolio-tile` | Direct hex | `#2E7D32`, `#C62828` (gain/loss colors) |
| `19-medical-records-table` | Direct palette | `sky-500` ring, `emerald-600` status |
| `20-onboarding-modal` | Clean control | Two CTAs, one title, two-line description, close X |

The fresh-fixture subset gets reported separately in the result file so readers can see whether the lift is corpus-specific.

## Classifier (inherited from spec-v2)

Conformance scoring uses **v2-broad** registry rules, frozen from `spec-v2.md` §v2-broad registry. For Arm A and B, the registry includes the scaffolded DESIGN.md's `colors:` keys. For Arm C, the registry is empty (raw Claude doesn't write a DESIGN.md), so the v1 semantic-prefix rule applies — `bg-foreground`, `text-card`, etc. count as TOKEN even without a registry. This is the most generous classifier toward Arm C, on purpose.

The TS port (`@atelier-oss/classify`) is the primary scorer for v3. `benchmarks/score.py` runs as a parity oracle on the same emitted code; any per-fixture disagreement > 0pp is flagged before the result file is written.

## Sample size + aggregation

- **n = 3 runs per fixture × 15 fixtures × 3 arms = 135 generations.**
- Per-fixture conformance = mean of the 3 runs.
- Per-arm conformance = mean across the 15 per-fixture means (the **primary** aggregate).
- Per-arm sum-of-tokens-and-raw conformance = secondary aggregate (matches v2 reporting).
- If any per-fixture std-dev > 10pp on the n=3 runs, that fixture is flagged "high-variance" in the report and a v3.1 with n=5 is recommended (not blocking).

## Iterate-loop reporting

Arm A and Arm B include the agent's 3-pass rewrite loop (`iterate: 3, threshold: 0.95`). Arm C does not. To keep the comparison apples-to-apples, the result file reports two numbers per agent arm:

- **`initial`** — conformance after iteration 0 (single generate, no rewrite). Used in the **primary gate** vs Arm C.
- **`final`** — conformance after the iterate loop converges or hits max iterations. Reported alongside as "what users actually ship."

The primary gate compares `A.initial.mean` to `C.mean` to keep the calling-shape contributions honest. The secondary "what-users-ship" comparison reports `A.final.mean` vs C.

## Gate

| Comparison | Metric | Threshold | Blocking | Notes |
|---|---|---|---|---|
| **Primary** — A.initial vs C | absolute delta in mean conformance | **≥ +30pp** | yes | The headline claim |
| Secondary — A.initial vs B | absolute delta | ≥ +10pp | no — informational | Isolates the DESIGN.md contribution |
| Honesty check — B vs C | absolute delta | (any sign) | no — characterizes the system prompt's standalone contribution |
| User-experience — A.final vs C | absolute delta | (report only) | no | What users actually ship |

If A.initial − C ≥ +30pp and A.initial − B ≥ +10pp, the verdict is PASS. If A.initial − C ≥ +20pp but < +30pp, the verdict is PARTIAL — published as a near-miss with full numbers, no goalpost-moving. If A.initial − C < +20pp, the verdict is FAIL.

## Budget

| Item | Value |
|---|---|
| Hard cap | **$30 cumulative spend** — harness aborts on reach |
| Expected | $10–15 |
| Phase 4.3 dry-run cap | $1 |
| Tokens per run, expected | ~5K input + ~3K output |

The harness tracks cumulative cost via the SDK's per-response usage and aborts cleanly between runs once cumulative ≥ $30. If the abort fires mid-corpus, partial results are still emitted (with `partial: true` in the JSON) and the budget overrun is the headline of the writeup.

## Run config

| Setting | Value | Notes |
|---|---|---|
| Model (all arms) | `claude-sonnet-4-6` | CARL [OPUS-4-7] rule 0 — pinned ID |
| max_tokens (all arms) | 16384 | Agent default; matches Arm C |
| temperature / top_p / top_k | NOT passed | CARL [OPUS-4-7] sampling policy |
| Thinking | not passed | Sonnet 4.6 uses default behavior |
| Parallelism | sequential | Avoids rate-limiting; cost cap easier to enforce |
| Resume | per-fixture checkpoint to JSON | If the harness dies mid-run, resume from the last completed fixture |

## Reporting

Result file: `benchmarks/results/<date>-phase-4-v3.{md,json}`. Both files commit even if the gate fails — negative results are publishable.

The markdown writeup includes:

1. Three per-arm tables (per-fixture conformance for n=3, with mean and std-dev).
2. Gate evaluation table (primary, secondary, honesty-check, user-experience).
3. Fresh-fixture-only sub-table (the 5 authored against this spec, scored separately).
4. High-variance fixture call-out (any std-dev > 10pp).
5. Cost snapshot (per-arm spend, total, % of budget).
6. Per-fixture parity-check (TS classify vs Python score.py).
7. Caveats section — same as v1/v2 plus v3-specific.
8. What this means for Phase 5.

## Caveats (v3-specific)

- All three arms use the same model (Sonnet 4.6). Whether the lift holds on Opus 4.7 or Haiku 4.5 is out of scope for v3 — that's a v3.1 sensitivity.
- The DESIGN.md handed to Arm A is the saas-dashboard canonical template. Whether the lift holds on the other 7 build-category templates is out of scope for v3 — a v3.2 study could vary the template.
- Briefs are written for the saas-dashboard / marketing-landing surfaces (the categories the agent's system prompt was tuned around). Cross-domain lift is not measured here.
- All fixtures are still authored by one developer (Alex). External validation requires fork-and-rerun by an independent maintainer — same caveat as v1/v2.
- The iterate loop in Arm A and B may converge at different rates per fixture; we report `iterations_used` to surface this.

## Honest framing

This spec is committed before the first v3 run. Both pass and fail outcomes get a dated, public report. No retroactive methodology revisions — only a dated `spec-v4.md` can change the rules.

If a defect is found in the harness mid-run (e.g., the parity check fails on emitted code), the spec is not the lever. Either the harness is fixed and re-run from the last checkpoint, OR the run is voided and the cause documented. Voiding a run does not erase the spec or the v1/v2 record.

## Lock

This file is the v3 pre-registration. Once committed, the corpus, calling shapes, classifier, sample size, and gate thresholds are frozen. Any subsequent re-run reuses this spec or supersedes it with a dated `spec-v4.md`.
