---
category: multi-llm-synthesis
tagline: Streaming side-by-side model panels with badged identity, per-response confidence, and an aggregator/Chairman synthesis surface above the fold.
examples_in_fleet: [advisory-board]
---

# Multi-LLM Synthesis

Surfaces that fan one prompt out to N models in parallel, stream each response with attribution, and roll the results up into a single synthesized answer. The visual system reads more like an editor than a dashboard — long-form prose, side-by-side comparison panels, and trust signals (badges, confidence, citations) the user must read at a glance.

Reference implementation: `~/Projects/advisory-board/` (LIVE at advisory-board-puce.vercel.app). 8 components, Next.js 14 App Router, Vercel AI SDK, Edge Runtime streaming, hand-rolled (no shadcn/ui).

## Archetypal layout patterns

- Single input → multi-pane streaming output: one prompt fans out to 3–7 model panels that begin filling simultaneously
- Stream-as-typed text with cursor caret on the active token (slow models reveal the parallelism)
- Side-by-side or stacked panel toggle — stacked by default on mobile, side-by-side ≥ md breakpoint, user-overridable
- Synthesizer / Chairman summary panel rendered above the fold once the aggregator pass completes; per-model panels fall below as accordions
- Model-badge headers per panel: provider logo or wordmark, model name, latency (`mono-sm tabular-nums`), token count, $cost
- Confidence/disagreement indicators: per-response status (Complete / Failed / Partial) plus a global confidence gauge on the synthesis card
- Citation tracking — when the synthesis references a claim, the inline citation pill links back to the model panel that produced it
- Areas-of-agreement vs Points-of-divergence sections inside the synthesis card with paired iconography (CheckCircle / AlertTriangle)
- Live-dot pulse next to the "Consulting advisors…" header during generation; resolves to a static checkmark on completion
- Source-response accordions below the synthesis (collapsed by default) for users who want to audit the inputs

## Default DNA — token defaults

- **Brand primary distinct from CTA**: indigo-700 `#4338CA` for navigation/selection/focus, amber-600 `#D97706` for commit actions ("Run synthesis"). Never collapse these into one hue — users must distinguish "navigate" from "commit"
- **Background**: low-saturation off-white `#F8FAFC` on light, near-black `#0A0A0F` on dark; `surface-card` lifts to `#FFFFFF` / `#111118`
- **Foreground**: indigo-950 `#1E1B4B` on light, slate-200 `#E2E8F0` on dark — biased toward indigo to harmonize with primary
- **Streaming-text contrast**: body copy targets WCAG AAA (7:1) — long-form reading surface, not a dashboard glance
- **Model badge colors**: assignable per-model from a palette of ≥6 distinguishable hues. Default is provider-agnostic (mono badge), but the system reserves a `provider-*` token block for when 6+ concurrent streams need anchoring
- **Confidence states**: emerald-500 `#22C55E` (high), amber-500 `#F59E0B` (medium), rose-500 `#EF4444` (low) — Tailwind-aligned to avoid perceptual jolt against prose
- **Domain palette**: blue `#3B82F6` (market), violet `#8B5CF6` (tech), red `#EF4444` (risk), green `#22C55E` (finance) — for research-domain agents and topic chips
- **Typography**: serif for display/headings (Libre Bodoni / Playfair / Crimson) + sans for body and UI (Plus Jakarta / Geist / Inter) + mono for technical labels (JetBrains Mono / Geist Mono)
- **Spacing**: line-height 1.6–1.7 on body for long-form readability; cards use `px-5 py-4` header/content, `space-y-4` between response cards
- **Radii**: card 0.5rem (response panels and synthesis), input 0.375rem (buttons, inputs), pill 0.25rem (chips, badges), full for status dots
- **Container width**: `max-w-4xl` for input form, `max-w-6xl` for results panel — narrow line lengths (~75ch) over full-bleed
- **Elevation**: `shadow-sm` only on elevated cards (synthesis result); border + background contrast carries the rest. Glass variant (`bg-surface-card/80 backdrop-blur-sm`) reserved for transient overlays

## Anchor components

- `response-card` — per-model streaming panel: header (model name + status pill), body (streamed Markdown), footer (latency / cost / tokens, all `mono-sm tabular-nums`). Border + background swap to `confidence-low/5` on error
- `model-badge` — provider + model + latency capsule, `rounded-full`, mono caption
- `confidence-badge` — high/medium/low pill, paired with full `ConfidenceGauge` SVG arc on the synthesis card
- `domain-chip` — topic/tag chip using domain-palette tokens (market/tech/risk/finance)
- `synthesizer-panel` — `Card variant="elevated"`, serif heading-card title, inline confidence badge, Markdown body, agreement + divergence sections with lucide icons
- `streaming-cursor` — typing caret with `pulse-subtle` keyframe (1.5s, opacity 1.0 → 0.7 → 1.0); respects `prefers-reduced-motion`
- `disagreement-marker` — inline annotation where models diverge; AlertTriangle icon + `confidence-medium` color
- `citation-pill` — inline reference with model badge color; on hover/focus, scrolls/highlights the source response card

Supporting components: `model-selector` (tier picker: Budget / Balanced / Premium), `bundle-selector` (preset model bundles), `agent-activity-bar` (pipeline stage tracker for autonomous mode), `cache-indicator` + `rate-limit-banner` (operational status surfaces).

## Exemplars

- **Together AI playground** — canonical Mixture-of-Agents UI; layered proposer→aggregator visualization
- **Anthropic Console** (multi-model comparison view) — side-by-side prompt evaluation across Claude variants
- **Poe by Quora** — multi-bot threads with `@mention` parallel querying, model badge per response bubble
- **LMArena (formerly Chatbot Arena)** — pairwise comparison UI, blind A/B then reveal
- **LangSmith trace UI** — per-call telemetry overlays, latency/cost/tokens as first-class data
- **OpenRouter playground** — provider-agnostic model picker with live latency stats
- **ChatHub / ChatALL** — Chrome extension and Electron app, 6-column parallel panel layout (no synthesis)
- **2026-era Mixture-of-Agents UIs**: Self-MoA reference implementations and the Together AI MoA demo are the closest production-grade analogs; most are still research code

## Anti-patterns

- **Hidden model attribution** — never strip the badge. Users must always know which model produced which words; without attribution, multi-model synthesis collapses into "AI said something"
- **Single panel scroll** — collapsing all model outputs into one scrollable feed kills the parallelism that is the entire value prop
- **Disabling streaming for "cleaner" UI** — the staggered fill is how users perceive multi-model fan-out; flat reveals make this feel like a slow single-model app
- **Confidence as a single 0-100 number without semantic bands** — humans read "78%" as noise; map to high/medium/low with paired color and copy
- **Auto-scrolling to the "winner"** — assumes consensus exists. The user, not the UI, decides which response wins
- **Provider-color anchoring before you need it** — eight concurrent streams are rare; until then, model identity = name string + mono badge. Adding `provider-anthropic-orange` etc. early creates a maintenance tax with no payoff
- **Hardcoded hex in components** — only legitimate uses are SVG strokes (gauge) and code-block prose. Every other color goes through tokens
- **Heavy shadows on every card** — elevation lives in border + background contrast; reserve `shadow-sm` for the synthesis card

## Default DESIGN.md template

```yaml
---
version: alpha
name: Multi-LLM Synthesis
description: Streaming side-by-side model panels with badged identity, per-response confidence, and an aggregator/Chairman synthesis surface above the fold.
colors:
  background: "#F8FAFC"
  foreground: "#1E1B4B"
  surface-card: "#FFFFFF"
  surface-elevated: "#F8FAFC"
  border: "#E2E8F0"
  muted: "#475569"
  primary: "#4338CA"
  primary-foreground: "#FFFFFF"
  primary-hover: "#3730A3"
  accent: "#4338CA"
  cta: "#D97706"
  cta-foreground: "#1E1B4B"
  cta-hover: "#B45309"
  ring: "#4338CA"
  confidence-high: "#22C55E"
  confidence-medium: "#F59E0B"
  confidence-low: "#EF4444"
  domain-market: "#3B82F6"
  domain-tech: "#8B5CF6"
  domain-risk: "#EF4444"
  domain-finance: "#22C55E"
  dark-background: "#0A0A0F"
  dark-foreground: "#E2E8F0"
  dark-surface-card: "#111118"
  dark-border: "#2A2A3A"
  dark-primary: "#818CF8"
  dark-cta: "#F59E0B"
typography:
  display:
    {
      fontFamily: "Libre Bodoni, Georgia, serif",
      fontSize: 1.875rem,
      fontWeight: 600,
      lineHeight: 2.25rem,
    }
  heading-page:
    {
      fontFamily: "Libre Bodoni, Georgia, serif",
      fontSize: 1.5rem,
      fontWeight: 600,
      lineHeight: 2rem,
    }
  heading-card:
    {
      fontFamily: "Libre Bodoni, Georgia, serif",
      fontSize: 1.25rem,
      fontWeight: 600,
      lineHeight: 1.75rem,
    }
  heading-section:
    {
      fontFamily: "Plus Jakarta Sans, system-ui, sans-serif",
      fontSize: 1.125rem,
      fontWeight: 600,
      lineHeight: 1.75rem,
    }
  body:
    {
      fontFamily: "Plus Jakarta Sans, system-ui, sans-serif",
      fontSize: 1rem,
      fontWeight: 400,
      lineHeight: 1.6rem,
    }
  body-sm:
    {
      fontFamily: "Plus Jakarta Sans, system-ui, sans-serif",
      fontSize: 0.875rem,
      fontWeight: 400,
      lineHeight: 1.25rem,
    }
  caption:
    {
      fontFamily: "Plus Jakarta Sans, system-ui, sans-serif",
      fontSize: 0.75rem,
      fontWeight: 400,
      lineHeight: 1rem,
    }
  mono-sm:
    {
      fontFamily: "JetBrains Mono, Menlo, monospace",
      fontSize: 0.875rem,
      fontWeight: 400,
      lineHeight: 1.25rem,
    }
spacing: { xs: 0.25rem, sm: 0.5rem, md: 1rem, lg: 1.5rem, xl: 2rem, 2xl: 3rem }
rounded: { pill: 0.25rem, input: 0.375rem, card: 0.5rem, full: 9999px }
components:
  button-primary:
    {
      backgroundColor: "{colors.primary}",
      textColor: "{colors.primary-foreground}",
      typography: "{typography.body-sm}",
      rounded: "{rounded.input}",
    }
  button-cta:
    {
      backgroundColor: "{colors.cta}",
      textColor: "{colors.cta-foreground}",
      typography: "{typography.body-sm}",
      rounded: "{rounded.input}",
    }
  input:
    {
      backgroundColor: "{colors.surface-card}",
      textColor: "{colors.foreground}",
      typography: "{typography.body-sm}",
      rounded: "{rounded.input}",
    }
  response-card:
    {
      backgroundColor: "{colors.surface-card}",
      textColor: "{colors.foreground}",
      typography: "{typography.body-sm}",
      rounded: "{rounded.card}",
    }
  model-badge:
    {
      backgroundColor: "{colors.surface-card}",
      textColor: "{colors.muted}",
      typography: "{typography.caption}",
      rounded: "{rounded.full}",
    }
  confidence-badge:
    {
      backgroundColor: "{colors.surface-card}",
      textColor: "{colors.foreground}",
      typography: "{typography.caption}",
      rounded: "{rounded.full}",
    }
  domain-chip:
    {
      backgroundColor: "{colors.surface-card}",
      textColor: "{colors.foreground}",
      typography: "{typography.caption}",
      rounded: "{rounded.full}",
    }
---
```

## Fingerprint signals

Observable repo cues that route a project to this category:

- **Files**:
  - `lib/llm-clients/`, `lib/providers/`, `lib/synthesis/`, `lib/evaluation/`
  - `app/api/synthesize/`, `app/api/generate/`, `app/api/evaluate/`, `app/api/models/`
  - `src/components/streaming/ResponseStream.tsx` or equivalent multi-pane streamer
  - `src/components/synthesis/` directory
  - `supabase/migrations/` with `sessions`, `responses`, `syntheses`, `prompt_embeddings` tables
  - Multi-provider env vars in `.env.example`: `OPENAI_API_KEY` + `ANTHROPIC_API_KEY` + `GOOGLE_API_KEY` + `DEEPSEEK_API_KEY` + `GROQ_API_KEY` + `XAI_API_KEY` + `PERPLEXITY_API_KEY` + `MISTRAL_API_KEY` + `OPENROUTER_API_KEY`
- **Dependencies** (package.json): three or more LLM SDKs side by side — `openai`, `@anthropic-ai/sdk`, `@google/generative-ai`, `groq-sdk`, `@mistralai/mistralai`, `cohere-ai`, plus `ai` (Vercel AI SDK) or `@openrouter/ai-sdk-provider`
- **Streaming**: SSE / `fetch`-stream / `EventSource` / `createStreamableValue` / `streamText` / `ReadableStream`. Edge Runtime exports (`export const runtime = "edge"`)
- **Patterns**: parallel `Promise.all` or `Promise.allSettled` over a model array; per-model timeout wrapping; circuit-breaker state in DB; pgvector or similar semantic-cache table; LLM-as-judge prompt template; "aggregator" or "synthesizer" model role string
- **Component vocabulary**: `ResponseCard`, `ResponseStream`, `SynthesisResult`, `ModelSelector`, `BundleSelector`, `ConfidenceGauge`, `ConfidenceBadge`, `AgentActivityBar`, `ModelBadge`
- **Typography wiring**: three font families via `next/font` — serif (display) + sans (body) + mono (technical labels with `tabular-nums`)
- **Color tokens**: `confidence-high/medium/low` triad, optional `domain-*` palette, `primary` + `cta` distinct hues

## See also

- Reference implementation: `~/Projects/advisory-board/DESIGN.md` (canonical), `~/Projects/advisory-board/CLAUDE.md` (project context), `~/Projects/advisory-board/Multi-LLM Advisory Board Research.md` (technical playbook)
- Atlas index: `~/.claude/references/build-category-atlas.md`
- Plan: `~/.claude/plans/snug-crafting-fox.md` Phase 5 (lines 138-156)
- Validation: `npx -y @google/design.md@0.1.1 lint DESIGN.md` (design-stack Step 7)
