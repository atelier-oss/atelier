---
category: marketplace-listing
tagline: We don't design the page — we design the assets the platform plugs in. Thumbnails win.
examples_in_fleet: [gig-generator-outputs]
---

# Marketplace Listing

A marketplace listing is unusual among build categories: the **chrome belongs to the platform** (Fiverr, Upwork, Etsy, App Store, Play Store, Product Hunt, Amazon, Airbnb, Greenhouse). Our deliverable is **content + imagery** — copy strings and PNG/JPG assets — that the platform composes into its own UI. We never author the CTA button, the navigation, or the page layout. We earn the click that the platform's button captures.

The unit of work is a **content pipeline**, not a web app. Success is measured in grid-thumbnail conversion, not Lighthouse scores.

## Archetypal layout patterns

- Platform-conformant chrome — we DO NOT design the page; we design the assets the platform plugs in
- Hero thumbnail (the unit that converts in the grid) — first impression, must work at thumbnail size
- Title (truncated by platform — front-load the hook in the first 40-60 chars)
- Bullet-list of value props (most platforms wrap this; parallel structure, scannable)
- Multi-image gallery (3-7 images, varied perspectives — context, detail, in-use, comparison)
- Pricing matrix (tier comparison — usually 3 tiers: Basic / Standard / Premium)
- FAQ section (objection handling at the bottom)
- Reviews / social proof block (platform-rendered, but we feed the prompts that earn them)
- "Why me" / about-the-seller section (face + 2-line tagline + credibility hook)
- CTA: a single platform button — we don't author this, we earn the click

## Default DNA — token defaults

- **Color**: high-saturation, photo-friendly, optimized for thumbnail-grid contrast against neutral platform UI
- **Hero thumbnail** must read at 240×136px (Fiverr grid) or 1024×500px (App Store) — design at native and scale up, not down (anti-aliasing artifacts kill credibility)
- **Typography on imagery**: bold, sans-serif, high-contrast over photo (white text + dark drop shadow OR dark text + light overlay) — Inter, Plus Jakarta Sans, or Söhne at heavy weights
- **3-4 word headline maximum** on hero (anything longer disappears at thumbnail scale)
- **Brand mark**: subtle watermark, not centered (avoids competing with platform chrome)
- **Pricing tier visual hierarchy**: middle tier highlighted (anchor pricing — guides choice to the margin-optimal SKU)
- Avoid **pure white bg** — use platform-friendly neutrals (`#FAFAFA`-ish) so the listing doesn't disappear into the platform UI
- **Color**: 1 anchor color (the seller's mark) + 1 accent (CTA emphasis within imagery) — no more

## Anchor components

These are **asset templates**, not React components. Each maps to a per-platform export with locked native dimensions.

- `hero-thumbnail-template` — per platform: Fiverr 1280×769, Etsy 2000×2000, App Store 1024×500, Play Store 1024×500, Product Hunt 1270×760, Amazon 2000×2000, Airbnb 1200×800, Greenhouse N/A (text-only)
- `gallery-image-frame` — consistent treatment across multi-image (same border, padding, color overlay)
- `value-prop-bullet` — 3-7 lines, parallel structure (verb-led, benefit-first)
- `pricing-tier-card` — when the platform supports custom pricing visuals (Fiverr Pro, Etsy gift-guide blocks)
- `comparison-matrix` — text content; platform renders the table chrome
- `faq-block` — Q + A pairs (5-8 items, ordered by objection severity)
- `seller-bio-image` — square avatar + 2-line tagline (1:1 aspect, eye contact, neutral bg)
- `social-proof-card` — rating + review count + best-of-X badge if applicable

## Exemplars

- **Top Fiverr Pro gigs** — any "Top Rated Plus" with high conversion (logo design, brand identity, voiceover) — note hero composition, single-color backgrounds, before/after splits
- **Etsy storefronts with strong photography** — Beardbrand, Studio Neat — natural light, consistent color palette across gallery, lifestyle + detail mix
- **App Store featured apps** — Things 3, Bear, Linear — screenshot composition with annotation overlays, device frames, copy that explains the screen
- **Airbnb Plus listings** — photography rules: wide-angle establishing shot, room-by-room sequence, detail shots, bed always made, no clutter
- **Best-selling Amazon products with custom A+ content** — Anker chargers, Hydro Flask — comparison tables, lifestyle photography, infographic specs
- **Greenhouse job descriptions** from companies known for hiring (Vercel, Linear, Stripe) — crisp role definition, "what you'll do" / "what you bring" parallel structure, salary band upfront
- **Product Hunt #1 launches** — taglines (≤8 words, outcome-led) + first-comment patterns (founder story + credibility hook + ask)

## Anti-patterns

- Designing for **desktop full-size** when most discovery is grid-thumbnail
- **Tiny text on imagery** (<48pt at native res) — invisible at thumbnail
- **Stock photos** (kills credibility instantly — buyers can spot Shutterstock at 50ft)
- **Generic taglines** ("Best service ever", "High quality work") — be specific or be ignored
- **Missing pricing** (creates friction, drops conversion — even "Starting at $X" beats "Contact for quote")
- **Wall-of-text descriptions** without skim structure (no headers, no bullets, no bolding)
- **Inconsistent image treatment** across the gallery (jarring at scroll — pick a treatment, lock it)
- **Burying social proof** at the bottom only (sprinkle it: hero badge, mid-page testimonial, FAQ closer)
- **Using the platform's own colors prominently** (Fiverr green, Etsy orange) — looks like an ad, not a listing
- **Overcrowded heroes** — more than 3 elements at thumbnail scale becomes visual mud

## Default DESIGN.md template

The template captures **asset-design tokens** (typography sizes for imagery, color anchors for thumbnails) — NOT page-layout tokens. There is no page to lay out.

```yaml
brand:
  name: "<seller or product name>"
  voice: "specific, outcome-led, no superlatives"

color:
  anchor: "#1F2937"
  accent: "#F97316"
  bg_neutral: "#FAFAFA"
  text_on_image_light: "#FFFFFF"
  text_on_image_dark: "#0B0F19"
  shadow_overlay: "rgba(0,0,0,0.45)"

typography:
  family_display: "Inter"
  family_body: "Inter"
  hero_headline_px: 96
  hero_subhead_px: 48
  gallery_caption_px: 36
  weight_display: 800
  weight_body: 500
  tracking_display: "-0.02em"

rounded:
  asset_corner: 16
  badge: 999
  card: 12

assets:
  hero_thumbnail:
    fiverr: { w: 1280, h: 769 }
    etsy: { w: 2000, h: 2000 }
    app_store: { w: 1024, h: 500 }
    play_store: { w: 1024, h: 500 }
    product_hunt: { w: 1270, h: 760 }
    amazon: { w: 2000, h: 2000 }
    airbnb: { w: 1200, h: 800 }
  gallery_image:
    count_min: 3
    count_max: 7
    aspect: "1:1 or 4:3 — pick one and lock per listing"
  seller_bio:
    aspect: "1:1"
    min_px: 400

components:
  - hero-thumbnail-template
  - gallery-image-frame
  - value-prop-bullet
  - pricing-tier-card
  - comparison-matrix
  - faq-block
  - seller-bio-image
  - social-proof-card

copy:
  title_max_chars: 80
  title_hook_in_first: 40
  bullets_min: 3
  bullets_max: 7
  bullets_style: "verb-led, benefit-first, parallel structure"
  faq_min: 5
  faq_max: 8

constraints:
  no_stock_photos: true
  no_pure_white_bg: true
  no_platform_brand_colors: true
  middle_tier_highlighted: true
  watermark_position: "bottom-right, 8% opacity"
```

## Fingerprint signals

Observable repo cues that say "this is a marketplace-listing build, not a web app":

- **Files**: `gigs/`, `listings/`, `assets/thumbnails/`, `outputs/etsy/`, `app-store-assets/`, `product-hunt/`, `play-store-listing/`
- **Outputs**: PNG/JPG image sets, copy markdown files (`title.md`, `description.md`, `faq.md`), pricing JSON, per-platform variant subdirs
- **Dependencies**: image-generation libs (`sharp`, `imagemagick`, `pillow`, Figma export API, Replicate / OpenAI / Stability AI image SDKs), copy-templating (Handlebars, Jinja, Liquid)
- **Patterns**: per-platform output dirs (`fiverr/`, `upwork/`, `etsy/`, `app-store/`), thumbnail-size variants generated from a single source (`hero-2000x2000.png` → `hero-1280x769.png`, `hero-1024x500.png`), copy variant files per platform (Fiverr 80-char title vs. App Store 30-char title)
- **Often NOT a web app** — the "code" is content pipelines: a script reads `listing.yaml`, calls an image API, runs `sharp` resizes, writes per-platform output dirs. No `package.json` with `next` / `vite` / `react`. No routes. No components in the React sense.
- Look for: `generate.ts`, `pipeline.py`, `render-thumbnails.sh`, `*.template.md` with `{{placeholder}}` syntax, manifest files mapping listings to platforms
