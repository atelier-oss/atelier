---
category: cinematic-hero-catalog
tagline: Visual reference library — ~110 cinematic-tier hero/landing/CTA/footer templates curated for /design-stack prompt anchoring. Not a code source; a vocabulary.
examples_in_fleet: [prettyfly-os-jarvis-v2]
---

# Cinematic Hero Catalog

A visual vocabulary, not a code source. Catalogs ~110 cinematic-tier hero, landing, CTA, and footer references from [MotionSites.ai](https://motionsites.ai/) (Design Rocket). The templates are paid commercial assets — Atelier does NOT clone them. The catalog exists so `/design-stack` can pick a visual anchor by name ("match the Sentinel AI feel", "Synapse Dark hero, but pricing-first") and let the agent generate code that lives up to that aesthetic.

This category is **intent-only**: there are no fingerprints. A repo never auto-classifies as `cinematic-hero-catalog`. It's invoked when a user prompts `/design-stack` with explicit reference language. Implementation always falls back to the more specific category that DOES match (typically `marketing-landing` — the cinematic catalog enriches that surface, never replaces it).

## How to use this catalog

1. **Pick an anchor by name.** When a brief feels under-specified ("nice landing page for an AI product"), reach into this catalog and lock a reference: "Sentinel AI for the orb-hero feel, Synapse Dark for the dashboard moment, Lumina Footer for the close." Three names beat ten paragraphs of taste guidance.
2. **Treat the visual as the contract, not the markup.** The reference is a poster + GIF on motionsites.ai. The output is React + Tailwind written from scratch to match the feel — no scraping, no template purchase, no clone. Where the user wants the actual template, they buy it directly from Design Rocket.
3. **Stack two anchors when one isn't enough.** Cinematic-hero anchors compose cleanly with Section "Cinematic scroll-pin (Mendes pattern)" in [`marketing-landing.md`](./marketing-landing.md) — pick a Mendes-style scroll-pin video hero AND a MotionSites-style component vibe in the same brief.
4. **Anchor PFOS Jarvis, internal-ops, and conversational-agent-ui surfaces** to the dark-cosmic / orb cluster — those projects already converge on amber + teal + black-canvas register. The cluster name "AI gradient hero with abstract orb" is a bullseye for that brand.

## Catalog by category

Slugs follow `kebab-case-of-the-template-name` (e.g., "Aetheris Voyage" → `aetheris-voyage`). Each entry resolves at `https://motionsites.ai/{slug}` (best-effort; verify before quoting in a prompt). Some entries are free copy-and-go, others gated behind a paid tier — check the template page itself for the current state. Visual themes are short tags so the agent can reach for the right one without browsing the catalog.

### Hero Section (~40 templates)

The single largest cluster on MotionSites. Hero templates dominate the catalog because the hero is where motion design earns its premium price.

| Template | Visual theme |
|---|---|
| Aetheris Voyage | dark cosmic, cinematic depth |
| Velorah | premium black-and-amber, agency |
| Liquid Glass Agency | glassmorphism, soft refraction |
| Aethera Studio | minimal editorial, type-led |
| Asme | cool monochrome, photo-led |
| Portal | abstract gradient, AI-product feel |
| Celestia | cosmic, particle-field |
| RIVR | DeFi-flavored, neon-on-black |
| EMBER.dsgn | warm amber, design-studio |
| Bloom AI | AI gradient hero with orb |
| Sentinel AI | dark cosmic, abstract sphere — **bullseye for PFOS Jarvis** |
| Stellar AI | dark cosmic, orb-hero |
| Sync AI | gradient flow, AI-product |
| Power AI | dark cinematic, amber accents — **PFOS-adjacent** |
| Dot | minimal mark, micro-hero |
| VertexAI | data-tech, geometric |
| Nexar | corporate-tech |
| Nexus IT | enterprise IT, data |
| ClubX Investors | finance, neon-amber |
| Crypto Wealth | finance/web3, gold-on-black |
| Digital Epoch | retrofuturist, blue-violet |
| Luminex | luminous gradient, soft orb |
| Impressive | bold display type |
| AKOR Security | cybersecurity, dark + red |
| Shamoni | warm-light, brand |
| Taskly | productivity, light-and-bright |
| EcoVolta / EcoVolta V2 | green energy, photo-led |
| EVR Ventures | finance, neutral |
| Railroad.ai | data product, dashboard-tease |
| Slam Dunk | sport, high-energy |
| WISA Space | space-tech, dark cosmic |
| Prioritize | productivity, calm gradient |
| Web3 EOS | web3, gradient |
| NeoVision | retrowave/neon |
| Neuralyn | AI gradient, orb-hero — **PFOS-adjacent** |
| Glassmorphism Agency | glass refraction, agency |
| New Era Bold | bold display, editorial |

### Landing Page (~35 templates)

Multi-section landing flows beyond the hero. Use these when the brief has 3+ sections (hero + features + pricing + footer).

| Template | Visual theme |
|---|---|
| Liquid Glass Agency | glassmorphism, multi-section agency |
| Velorah Focus | dense agency, amber + black |
| SkyElite Private Jets | luxury, photo-led |
| Urban Jungle | editorial-warm |
| Prisma Creative Studio | colorful, creative-agency |
| Innovation | corporate gradient |
| AI Designer Portfolio | designer site, dark + amber |
| Mindloop Landing | calming gradient |
| Vitara | wellness/lifestyle |
| Weblex Dark | dark corporate |
| NeoVision | neon retrowave |
| FlowMate | productivity gradient |
| Acreage Farming | rural-photo |
| Targo Logistics | logistics-corporate |
| Yacht Club | luxury, photo-led |
| AI Designer Agency | dark designer-portfolio |
| NexaCore | enterprise tech |
| Space Voyage | dark cosmic |
| Focus AI | productivity AI, calm |
| Viktor Portfolio | designer portfolio, amber |
| Bold Portfolio | bold display, editorial |
| NOVA Space Systems | aerospace, technical |
| Zenith Realty | real-estate luxury |
| Veloce Finance | finance dashboard-tease |
| RIVR DeFi | web3 DeFi, neon |
| Nike Premium | sport-premium, photo-led |
| Web3 EOS | web3 gradient |
| Orbis NFT | NFT marketplace, neon |
| Datacore Booking | booking SaaS |
| Convix Software | enterprise software |
| Logoisum Video Agency | video-agency, dark |
| E-commerce | DTC product page |
| Guardnet | cybersecurity, dark |

### SaaS (~30 templates)

Product-led SaaS landing pages. Heavier on the dashboard-tease screenshot, lighter on the abstract orb.

| Template | Visual theme |
|---|---|
| CoderCrest | dev-tool, code-themed |
| Datacore SaaS | data-tool dashboard |
| ClearInvoice | finance SaaS |
| AuraMail | email SaaS, soft |
| BookedUp | booking SaaS |
| Apex SaaS | enterprise SaaS |
| Slate | minimal SaaS |
| Mindloop | calming SaaS |
| Nexus IT | IT-ops SaaS |
| HR SaaS | HR-tool, photo-led |
| Securify | cybersec SaaS |
| Targo Logistics | logistics-SaaS |
| Synapse Dark | dark cinematic SaaS — **PFOS-adjacent** |
| Stellar AI | AI-SaaS, orb-hero — **PFOS-adjacent** |
| Sync AI | gradient AI-SaaS |
| Grow AI Talent | recruiting AI |
| Nexora Automation | automation gradient |
| Neuralyn | AI gradient — **PFOS-adjacent** |
| Digitwist | AI-builder, gradient |
| Bionova Biotech | biotech, photo-led |
| Finlytic | finance AI |
| Planet Orbit | space-themed SaaS |
| Nickel Payments | payments, fintech |
| Power AI | AI-SaaS dark — **PFOS-adjacent** |
| Price Calculator | pricing-tool, focused |
| Taskora | productivity SaaS |
| Terra Geo Map | geo/data SaaS |

### Agency (~5 templates)

| Template | Visual theme |
|---|---|
| Velorah | premium agency |
| Glassmorphism Agency | glass-refraction agency |
| Logoisum Video | video-agency dark |
| Buzzentic | bright marketing-agency |
| Orbit Engineers | engineering-services |

### AI / SaaS cluster (overlaps)

Already enumerated above. The members worth flagging again as **direct anchors for PFOS Jarvis** (dark cinematic + amber/teal + abstract orb): Synapse Dark, Stellar AI, Sentinel AI, Neuralyn, Power AI, Bloom AI, Nexora Automation, Sync AI, Focus AI.

### Web3 / Fintech

| Template | Visual theme |
|---|---|
| Web3 EOS | web3 gradient |
| Orbit Web3 | web3 dark |
| Orbis NFT | NFT marketplace |
| Crypto Wealth | finance gold-on-black |
| RIVR DeFi | DeFi neon |
| Veloce Finance | finance dashboard |
| Wealth Video Hero | finance video-hero |
| Nickel Payments | payments fintech |

### Portfolio

| Template | Visual theme |
|---|---|
| 3D Portfolio | 3D-experiment |
| Portfolio Cosmic | dark cosmic |
| AI Designer Portfolio | dark designer |
| xPortfolio | bold editorial |
| Bold Portfolio | bold display |
| Dark Portfolio | minimal dark |
| Viktor Portfolio | amber editorial |

### Creative / 3D

| Template | Visual theme |
|---|---|
| Framelix 3D Studios | 3D-studio |
| New Era Bold | bold editorial |
| New Era Automotive | automotive, dark |

### Pricing

| Template | Visual theme |
|---|---|
| What Package Fits You | quiz-flow pricing |
| SaaS Pricing Flow | tiered pricing |
| Nex Max Upgrade | upgrade-flow |
| Price Calculator | calculator pricing |

### CTA

| Template | Visual theme |
|---|---|
| FAQ CTA | FAQ-led close |
| Community CTA | community-led close |

### Features

| Template | Visual theme |
|---|---|
| Nexora Features | feature grid |
| Glow Features | bright feature grid |
| Keep Ahead Features | benefits-led |
| Benefits Features | benefits grid |

### Footer

| Template | Visual theme |
|---|---|
| Lumina Footer | luminous, gradient |
| Kresna Footer | minimal-corporate |
| Vize Footer | enterprise |
| HAUL! | bold-display |
| Zenith Footer | luxury minimal |

### Other clusters

- **Animation** — `Loader Animation` (motion patterns).
- **Email Marketing** — `Email Marketing` (transactional template).
- **Social Media** — `Velorah Focus`, `Digital Reality`, `Social Media Posts` (social-card variants).
- **Presentation** — `Pro AI Deck`, `Investor Deck` (deck-format).
- **Signup** — `Aurora Onboard` (onboarding flow).
- **Backgrounds** — full subdomain at `motionsites.ai/backgrounds` for animated background loops; pair with the Mendes scroll-pin pattern when a brief calls for video back-plate.

## Visual themes that recur

The catalog clusters into a small number of repeatable visual languages. Pick the cluster first, then pick the template within it.

- **Dark cosmic with abstract orb / sphere** — Synapse, Stellar AI, Sentinel AI, Neuralyn, Power AI, Bloom AI, Nexora, Sync AI, Aetheris Voyage, Celestia, WISA Space. Direct PFOS Jarvis anchor.
- **Glassmorphism / liquid glass agency** — Liquid Glass Agency, Glassmorphism Agency, Aethera Studio. Soft refraction, blur, layered transparency.
- **Premium black-and-amber editorial** — Velorah, Velorah Focus, EMBER.dsgn, Power AI, Viktor Portfolio. Editorial typography + amber accent.
- **Retrowave / neon** — NeoVision, Digital Epoch, RIVR, RIVR DeFi, Crypto Wealth. High-saturation, dark canvas, neon highlights.
- **Photo-led luxury** — SkyElite Private Jets, Yacht Club, Zenith Realty, Nike Premium. Real photography over illustration.
- **Isometric data product** — VertexAI, Datacore SaaS, Railroad.ai, Terra Geo Map. Geometric, data-product feel.
- **Calming productivity gradient** — Mindloop, Mindloop Landing, FlowMate, Prioritize, Focus AI. Soft gradients, low-contrast canvas.

## Anchor selections for common briefs

| Brief shape | Anchor stack |
|---|---|
| AI product landing, premium feel | **Sentinel AI** (hero) + **Synapse Dark** (dashboard moment) + **Lumina Footer** (close) |
| Agency / studio site | **Velorah** (hero) + **Glassmorphism Agency** (project showcase) + **Vize Footer** (close) |
| Web3 / DeFi launch | **RIVR** (hero) + **Orbis NFT** (marketplace section) + **Zenith Footer** (close) |
| Productivity SaaS | **Mindloop** (hero) + **Nexora Features** (feature grid) + **SaaS Pricing Flow** (pricing) |
| PFOS Jarvis-style operator surface | **Power AI** (hero) + **Stellar AI** (orb moment) + **Synapse Dark** (dashboard tease) — pair with `internal-ops.md` token defaults |
| Editorial portfolio | **Viktor Portfolio** (hero) + **Bold Portfolio** (case-study moment) + **HAUL!** (close) |

## Anti-patterns

- **Treating the catalog as a clone target.** It isn't. The MotionSites templates are paid; we use them as taste anchors only, generate from scratch, and cite the anchor in the design brief for the user's awareness.
- **Picking five anchors at once.** Three is the cap. More than three drowns the visual contract; the agent ends up averaging instead of committing.
- **Reaching for cinematic-hero anchors on a SaaS dashboard.** The dashboard surface lives in [`saas-dashboard.md`](./saas-dashboard.md) or [`internal-ops.md`](./internal-ops.md). Cinematic-hero anchors apply to marketing surfaces — the welcome page, not the authenticated app.
- **Pairing dark-cosmic anchors with light-default brand tokens** without an explicit dark/light split in the project's DESIGN.md. The visual anchor and the token contract must agree, or the agent emits two designs glued together.

## Source + license

- **Catalog source**: [motionsites.ai](https://motionsites.ai/) and [motionsites.ai/backgrounds](https://motionsites.ai/backgrounds), maintained by Design Rocket. Snapshot taken 2026-05-08.
- **Template licensing**: pay-to-use; some templates marked "Copy" are free, others premium. Atelier does NOT redistribute, embed, or clone the templates — the catalog is metadata only (name, slug, theme).
- **Atelier license**: MIT. The shard prose here is original; the template names are factual references to a public catalog and are not Atelier's IP.

## See also

- [`marketing-landing.md`](./marketing-landing.md) — sibling category. The "Cinematic scroll-pin (Mendes pattern)" section there pairs naturally with anchors picked from this catalog.
- [`conversational-agent-ui.md`](./conversational-agent-ui.md) — the AI / SaaS cluster from this catalog (Sentinel, Stellar, Power AI, Neuralyn) shares brand language with operator-facing chat surfaces; component-level references for those surfaces live there.
- [`internal-ops.md`](./internal-ops.md) — PrettyFly-OS-style operator surfaces; pair the dark-cosmic-orb cluster with internal-ops token defaults for fleet command UIs.
- Atlas resolution: this category never auto-classifies; explicit per-project DESIGN.md early-returns; `/design-stack` reaches into this catalog by intent only.
