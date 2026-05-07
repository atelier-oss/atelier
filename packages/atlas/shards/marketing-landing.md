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
