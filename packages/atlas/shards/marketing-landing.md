---
category: marketing-landing
tagline: Hero-led, photo-driven, single-CTA-per-section pages whose job is to convert one scroll into one tap.
examples_in_fleet: [eight12-run-club-website, 1g1f]
---

# Marketing / Landing

Top-of-funnel pages whose entire job is to move a visitor from "I clicked a link" to "I tapped the one CTA on this section." Content density is low; image weight is high; everything else exists to frame the headline and the button.

## Archetypal layout patterns

- **Hero section** — full-bleed photo or muted-autoplay video background, headline + subhead + ONE primary CTA above the fold. Mobile fits in one viewport.
- **Alternating photo/text strips** — left-photo + right-text, then mirrored. Single column on mobile, photo-first.
- **Stat / impact band** — 3 numbers in tabular figures, optional accent color on the digits.
- **Social proof band** — 5–7 logos in a row (B&W at rest, color on hover) OR a 3-up testimonial grid (never an autoplay carousel).
- **Pricing or signup CTA section** — a single decisive offer; comparison tables only when the buyer is choosing between tiers, not deciding to buy.
- **Footer** — multi-column nav, secondary links, optional newsletter signup (email input + button inline), legal + 501(c)(3) line where applicable.
- **Mobile-first responsive** — desktop is a variant, not the source. Every breakpoint is `min-width`, never `max-width`.
- **Single CTA per section** — no competing actions. If a section needs two buttons, it's two sections.

## Default DNA — token defaults

- **Brand color expressive** — saturated, photo-friendly: a real brand primary (coral, teal, amber, deep blue) NOT zinc/slate. The accent must survive overlapping a photo.
- **Typography** — display-scale serif or expressive sans for hero (Playfair Display, GT Super, Space Grotesk, Bebas Neue) + clean sans for body (DM Sans, Inter as last resort, system stack).
- **Type scale** — large display sizes: H1 96px desktop / 64px mobile; H2 72px / 52px; H3 48px / 38px. Body 16–18px, never below 16px on mobile.
- **Generous spacing** — 80–120px section padding desktop, 48–64px mobile. Container max-width 1100–1200px; reading column 640–720px.
- **Radii** — pick one mode and hold it: small radii (2–4px) for editorial feel, OR generous radii (16–24px) for soft consumer feel. Never mix the two on the same page.
- **Photo treatment** — full-bleed hero with a bottom-gradient overlay for text legibility (`linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85) 100%)`). Inline cards may use rounded-card photo crop. No duotones unless the brand explicitly demands it.
- **Motion** — subtle scroll-reveal (opacity 0→1 + translateY 16→0 over ~400ms), 40ms list stagger, parallax minimal or none. Honor `prefers-reduced-motion`. Animation NEVER blocks reading or tapping.

## Anchor components

- `hero-section` — full-bleed media + headline + subhead + 1 primary CTA
- `cta-button` — large (≥48px tap height), single per section, brand-color fill
- `feature-card` — photo + headline + 2–3 lines of body + optional inline CTA
- `testimonial-card` — avatar + quote + name + role
- `logo-grid` — 5–7 logos, B&W at rest, color on hover, equal optical weight
- `pricing-card` — tier name + price + 3–6 bullets + single CTA
- `newsletter-signup` — email input + submit, inline on desktop, stacked on mobile
- `footer-nav` — 3–5 columns: product, company, resources, legal, social

## Exemplars

- **stripe.com** (marketing pages) — gold standard for typography rhythm and white-space discipline
- **vercel.com** — dense product narrative compressed into hero + alternating strips, dark mode default
- **apple.com** product pages — long-form scroll, full-bleed photography, single CTA per section
- **notion.so/product** — soft radii, illustrated hero, alternating photo/text
- **linear.app** — opinionated typography, dark default, motion subtle and reactive
- **posthog.com** — playful brand, dense feature density managed by clear sectioning
- **resend.com** — minimal typography, hero + 3 product moments + signup, exemplary brevity

## Anti-patterns

- Multiple competing CTAs in the same section (a "secondary" CTA dilutes the primary).
- Auto-playing video with audio.
- Carousels with autoplay — accessibility-hostile and rarely read past slide 1.
- Tiny base font on mobile (< 16px) — forces zoom, breaks input focus.
- Decorative animations that block content render or delay LCP.
- Hidden essential info inside a closed-by-default accordion on mobile (price, hours, address).
- Mystery-meat navigation — icon-only without labels, especially on the primary nav.
- Pop-up modals on first visit (newsletter, discount, cookie+marketing combo bombs).
- Stock photos when the brand has a real audience to photograph instead.
- Shadow stacks on near-black backgrounds (read as JPEG smudge — use borders + value contrast).

## Cinematic scroll-pin variant (Mendes pattern)

A premium-feeling scroll-driven hero that simulates 3D depth without any actual 3D rendering. Production-extracted from Jo Mendes's Virtual Fridge preview at `site-checkout.preview.emergentagent.com`. Reach for this when the brief calls for "cinematic hero," "feels expensive," or "fly-through depth" and the budget allows for one short AI-generated loop video (Sora-2 / Veo-3 / Higgsfield, ~$2-5 per generation).

The technique is plain React + plain CSS — no GSAP, no ScrollMagic, no `<canvas>`, no react-three-fiber. A single scroll handler reads `getBoundingClientRect()` on the outer wrap and writes CSS variables that drive opacity, transform, and scale on stacked elements.

### Core scroll-pin contract

- Outer container at `height: 600vh` (six viewports tall) defines the scroll timeline.
- Inner stage uses `position: sticky; top: 0; height: 100vh` — pins to the viewport as the outer container scrolls past.
- One scroll handler computes a `0..1` progress value from the wrap's bounding rect and writes CSS variables on the root: `--vf-hero-sequence-anchor-y`, `--vf-feature-mobile-x`, `--vf-feature-phone-group-scale`, `--vf-hero-phone-object-x`, `--vf-hero-phone-scale`. CSS reacts; React state stays out.
- Beats are time-windowed scroll quantiles (e.g., `0.0–0.2`, `0.2–0.4`) — each named copy block has an entry/exit window that drives `opacity` + `translateY`.

```html
<section id="top" class="vf-hero-wrap" style="height: 600vh;">
  <div class="vf-hero-sticky">
    <video class="vf-hero-video" src="/hero/A.mp4" autoplay playsinline preload="auto" muted style="opacity: 1;" />
    <video class="vf-hero-video" src="/hero/B.mp4" autoplay playsinline preload="auto" muted style="opacity: 0;" />
    <div class="vf-hero-sequence-layer">
      <div class="vf-hero-sequence" style="opacity: 0; transform: translate(14px, calc(var(--vf-hero-sequence-anchor-y, -50%) + 18px));">
        <p class="vf-display">Still tracking meals the hard way?</p>
      </div>
      <!-- repeat for each beat -->
    </div>
  </div>
</section>
```

### Component vocabulary

- **Multi-video crossfade hero** — two `<video>` elements stacked, opacity-toggled by scroll quantile. Cleaner than `<source>` swap mid-playback; handles AI-generated loops natively. Safari mobile autoplay requires both `playsinline` AND `muted` (Mendes shows `playsinline` only — set `muted` explicitly).
- **Sequence-beat layer** — N text blocks stacked, each with windowed scroll quantiles determining `opacity` + `translateY`. Three to five beats is the sweet spot; more and the brief gets lost in interpolation.
- **Sticky feature panel with sprite reveal** — second sticky stage further down (`<section class="vf-feature-sequence" style="height: 600vh;">`); a foreground product image stays centered while ingredient/feature sprites animate in from off-screen via scroll-driven `transform`. Pair with invisible `<div class="vf-anchor" style="top: 90vh;">` anchors so header `#meals` links land at the right beat.
- **Marquee carousel** — `vf-marquee-track` with cards duplicated in DOM, `@keyframes` translateX from `0` to `-50%` infinite linear. Seamless because the duplicates fill the gap.
- **Wave button** — high-emphasis CTA with an embedded `<video autoplay loop playsinline muted>` masked by border-radius. Loop video gives motion without reading as "ad." Use sparingly (one per page); promotional, not navigational.
- **Feature-card pricing grid with video bg** — two-card pricing/access pattern (`vf-plan--connected`); the highlighted card carries a `<video>` background under the copy. Standard card on left, video card on right.
- **Anchor-driven sticky-scroll nav** — invisible `<div class="vf-anchor" style="top: 90vh;">` markers inside the long-scroll section give the header nav real targets without breaking the sticky composition.
- **Grain overlay** — SVG fractal-noise filter at low opacity on a root pseudo-element (`.vf-grain` or `.jarvis-glass::after`). Adds physicality on dark canvases. Already shipping in PrettyFly OS as `lib/coach/visual.ts:74` — cross-confirms the technique is converged across multiple cinematic surfaces.

### Editorial typography pairing

The Mendes site loads Figtree, Inter, Inter Tight, JetBrains Mono, and Nanum Pen Script — sans display + serif accent + handwritten flourish. Editorial without committing to one tone.

| Class | Style |
|---|---|
| `.vf-display` | Large display headline (Inter Tight or similar tight-tracked sans) |
| `.vf-feature-label` | Uppercase, letter-spaced eyebrow (~12-14px) |
| `.vf-serif` | Serif accent for product-feature headlines |
| `.vf-hero-sub-copy` | Body copy at comfortable reading line-length |

### Build recipe (4 steps)

1. **Generate the loop video** — Sora-2 or Veo-3 (or Higgsfield for camera fly-throughs). 8-12s loop, ~$2-5. Camera fly-through is the depth illusion; the AI does the work the WebGL would otherwise.
2. **Pick a layout reference** — clean modern site for structure; the AI mimics structure, not aesthetic. Aesthetic comes from the loop video + token discipline.
3. **Brief the agent with the technique above** — `/design-stack "marketing landing using the Mendes scroll-pin pattern, anchored to <Sentinel AI> visual feel"` — the cinematic-hero-catalog gives the visual anchor; this section gives the technical pattern.
4. **Expect 50-80% on first generation, polish the last 20-50%** — the scroll math is mechanical; the copy timing and visual anchors take iteration. Lock the scroll-pin contract first, fine-tune beats second.

### When NOT to reach for it

- **Authenticated dashboards** — operators don't want a 600vh scroll hero on `/login` or `/dashboard`. Use `internal-ops.md` or `saas-dashboard.md` defaults.
- **Pages without a budget for a generated video** — the technique without the loop falls flat. A static photo + sticky stage is just a long page.
- **Mobile-only contexts** — sticky + 600vh scrolls work on mobile, but autoplay-muted-video battery cost on cellular is real. Pair with `prefers-reduced-motion` to fall back to a single static frame.

## Default DESIGN.md template

```yaml
---
version: alpha
name: <Project Name>
description: "Marketing/landing default. Per-project DESIGN.md overrides this. Hero-led, single-CTA-per-section, photo-driven."
colors:
  c-bg: "#0A0A0A" # dark default; flip to "#FFFFFF" for light variant
  c-surface: "#141414"
  c-border: "#1F1F1F"
  c-border-strong: "#2E2E2E"
  c-text: "#FFFFFF"
  c-text-muted: "#B0B0B0"
  c-text-dim: "#7A7A7A"
  c-accent: "#EF2B2D" # brand primary — replace per project (coral/teal/amber/deep-blue OK; never zinc)
  c-accent-hover: "#D11D1F"
  c-secondary: "#E8A628" # earned-value accent (stat numbers, ribbons) — single per section
  c-success: "#4ADE80"
  c-error: "#F97066"
  c-focus: "#EF2B2D"
typography:
  display-xl:
    fontFamily: "'Space Grotesk', 'GT Super', Georgia, serif"
    fontSize: 96px
    fontWeight: 600
    lineHeight: 0.95
  display-lg:
    fontFamily: "'Space Grotesk', 'GT Super', Georgia, serif"
    fontSize: 72px
    fontWeight: 600
    lineHeight: 0.98
  display-md:
    fontFamily: "'Space Grotesk', 'GT Super', Georgia, serif"
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.0
  body-lg:
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  button:
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: 0.08em
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 16px
  pill: 999px
spacing:
  space-2: 8px
  space-4: 16px
  space-6: 24px
  space-8: 32px
  space-12: 48px
  space-16: 64px
  space-24: 96px
  space-32: 128px
components:
  button-primary:
    backgroundColor: "{colors.c-accent}"
    textColor: "{colors.c-bg}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "{spacing.space-6}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.c-text}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "{spacing.space-6}"
    border: "1px solid {colors.c-border-strong}"
  hero-cta:
    backgroundColor: "{colors.c-accent}"
    textColor: "{colors.c-bg}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "{spacing.space-8}"
  feature-card:
    backgroundColor: "{colors.c-bg}"
    textColor: "{colors.c-text}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    padding: "{spacing.space-6}"
    border: "1px solid {colors.c-border}"
  testimonial-card:
    backgroundColor: "{colors.c-surface}"
    textColor: "{colors.c-text}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    padding: "{spacing.space-8}"
  input:
    backgroundColor: "{colors.c-bg}"
    textColor: "{colors.c-text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "{spacing.space-3}"
    border: "1px solid {colors.c-border-strong}"
---
```

## Fingerprint signals

Observable cues that classify a repo as marketing-landing (highest signal first):

- **Files**
  - `app/(marketing)/` route group, OR `app/page.tsx` whose default export renders a hero
  - `pages/index.{tsx,astro,mdx}` with `<section>` + `<Hero>` composition
  - `astro.config.mjs`, `gatsby-config.js` — static-site generators heavily skew marketing
  - `public/og-*.png`, `public/hero-*.{jpg,webp,mp4}` — promo media checked in
  - Single-tier route tree (`/`, `/pricing`, `/about`, `/contact`) with no `/dashboard` or `/app`
- **Dependencies**
  - `framer-motion` (heavy use, scroll-reveal + hero animation)
  - `@vercel/og` or `@react-email/render` for OG-image generation
  - `astro`, `gatsby`, `next` static export
  - `sharp`, `next/image`, `astro:assets` — image optimizer libs
  - `@studio-freight/lenis` or similar smooth-scroll lib
  - Forms: `react-hook-form` + `zod` posting to a webhook (GHL, HubSpot, Resend, Mailgun) — NO database
- **SEO + metadata**
  - `metadata` exports per route, `generateMetadata`, `<Head>` with OG/Twitter tags
  - `sitemap.{xml,ts}`, `robots.txt`, structured data (`application/ld+json`)
- **Patterns**
  - Heavy `next/image` or `<Image priority>` on hero
  - Semantic `<section>` tags, ARIA landmarks, `<main>` exactly once
  - Tailwind classes lean on `prose`, `container`, `mx-auto`, large `py-24`/`py-32`
  - No auth flows, no protected routes, no DB schema files
- **Static-export friendly** — no `runtime: 'nodejs'`, no Prisma/Drizzle migrations, no Supabase client beyond a single `/api/contact` webhook proxy

When ≥3 of the above match and there is no dashboard surface, classify as marketing-landing and apply this shard's defaults unless an explicit per-project DESIGN.md is present (per `~/Projects/CLAUDE.md` precedence rule).
