---
category: trading-analytics
tagline: Dark-default, dense, real-time — charts dominate, color is reserved for state.
examples_in_fleet: [sportsbook-edge, rainman]
---

# Trading / Analytics

For projects whose primary value is letting a user _read a market and act on it_: trading dashboards, betting models, sentiment-driven bots, sports analytics, prediction markets, ML signal frontends. The user is presumed expert. Information density beats friendliness; a screen that takes a beginner 30 seconds to parse is fine if it takes the operator 2 seconds.

## Archetypal layout patterns

- **Dark-default canvas** — text-on-near-black; color reserved for state, not chrome. Light variant exists but is the exception.
- **Tickering / streaming numerics** — visible price/PnL changes as numbers update; the screen feels alive even at idle.
- **Multi-pane workspace** on desktop (chart + order book + ladder + alerts simultaneously); tabbed/stacked on mobile only when forced.
- **Density preference** — small fonts (12–13px body), tight padding, lots of data per screen. The "data per scroll" ratio is the design KPI.
- **Color semantics LOCKED** — green = up/profit, red = down/loss, _never inverted_. This is non-negotiable across cultures for this category (yes, even though red = up in some Asian markets — for fleet consistency we lock to Western convention).
- **Alert states surface with tone** — critical (rose-500), warn (amber-500), info (sky-400). Severity is visible at a glance.
- **Charts dominate visual hierarchy** — UI chrome (toolbars, labels) is minimal and recedes; the chart is the unit.
- **Time axis on every visualization** — the user must always know the time. No floating-point unanchored numbers.
- **Big numbers** — large mono digits for PnL, total balance, win rate. The hero number is bigger than the headline.
- **Confidence + freshness indicators** — model confidence (dot/bar), data freshness (last-tick timestamp). Stale data must look stale.

## Default DNA — token defaults

- **Background**: near-black `#0A0A0F` (zinc-tinted) or `#0B1120` (blue-tinted) by default
- **Surface**: zinc-900 `#18181B` / slate-900 `#0F172A` cards, lifted with subtle 1px border (`#27272A` / `#1E293B`)
- **Foreground**: zinc-100 `#F4F4F5` / slate-200 `#E2E8F0`
- **Up / profit**: emerald-500 `#10B981` — never modify hue, only saturation for muted variants (e.g., `#10B981` at 60% opacity for inactive rows)
- **Down / loss**: rose-500 `#EF4444`
- **Neutral**: zinc-400 `#A1A1AA` / slate-400 `#94A3B8` (for unchanged values, secondary labels)
- **Warning**: amber-500 `#F59E0B`
- **Critical**: rose-600 `#DC2626` (deeper than down, distinguishable on alert banners)
- **Info / accent**: sky-400 `#38BDF8` (for selectable callouts; never as primary "good" signal)
- **Typography**: 1 sans (Inter / Geist Sans) + 1 mono (JetBrains Mono / Geist Mono / IBM Plex Mono). **Mono for ALL numerics**, sans for labels/copy only.
- **Type scale (condensed)**: 12–13px body, 14px headings, 18–20px panel titles, 24–32px hero number (KPI), 40–48px reserved for full-screen PnL displays
- **Numeric features**: `font-feature-settings: "tnum" 1, "zero" 1` (tabular nums + slashed zero) on every digit
- **Spacing**: tight scale 4 / 8 / 12 / 16 / 24 (no 32+ inside data panels; reserved for section breaks)
- **Radii**: small (2–4px) — corners shouldn't compete with chart precision; full-rounded only on pills/chips
- **Motion**: smooth animations on number changes (Framer Motion / CSS `transition: color 200ms`); flashes on tick (green-flash up, red-flash down) ≤300ms; respect `prefers-reduced-motion` (replace flash with subtle bg shift, no easing change)

## Anchor components

- `kpi-card` — label + big mono number + delta-pill; optional sparkline footer
- `delta-pill` — ▲ / ▼ + percent + colored bg (emerald-500/15 or rose-500/15 fill, full color text)
- `price-ticker` — animated mono numerics with directional flash; bid/ask split optional
- `chart-frame` — lightweight-charts / TradingView container with toolbar (timeframe, indicators, fullscreen)
- `order-book` — depth ladder, two-column ask/bid with cumulative depth bars
- `alert-banner` — severity icon + message + dismiss; persists until acknowledged for `critical`
- `data-table-dense` — compact row height (28–32px), sortable, filterable, sticky header, virtualized for >200 rows
- `time-range-picker` — segmented control: 1H / 1D / 7D / 30D / YTD / Custom
- `position-card` — symbol + side (long/short pill) + size + entry + mark + PnL with color
- `confidence-indicator` — model-confidence dot (0–100% mapped to opacity ramp on emerald or rose) for ML predictions
- `freshness-stamp` — last-update relative time ("3s ago", "stale 2m"); turns amber after threshold

## Exemplars

- **TradingView** — charts as the unit. Toolbar minimal, chart maximal, indicators stack as overlays. Reference for chart UX.
- **Bloomberg Terminal** — density ceiling. Multi-monitor, color-coded panels, keyboard-driven. Reference for "max info per pixel".
- **Coinbase Advanced Trade** — modern crypto trading layout: chart left, order book right, order form below, history bottom-left. Reference for retail-pro balance.
- **dYdX** — perpetuals UI; isolated/cross margin clarity, leverage slider, funding rate visibility. Reference for derivatives chrome.
- **Kalshi** — event markets; binary outcome cards, time-decay-aware pricing. Reference for prediction-market layouts.
- **Polymarket** — outcome cards + order book, simpler than Kalshi but same shape.
- **Robinhood** (counterexample) — too consumer-friendly: hides numbers behind animations, gradient backgrounds on cards, pull-to-refresh. _Do not_ take cues here for pro tools.

## Anti-patterns

- **Inverting green/red semantics** — never make red = good, even in "stop loss" contexts. Use a different color (amber, neutral) for non-up/down state.
- **Marketing-style scroll animations** on data screens (parallax, fade-in-on-scroll). Data must be visible immediately; movement is reserved for _new data_, not chrome reveal.
- **Light-default for serious traders** — light mode is a setting, not the default. Eye fatigue and color contrast both favor dark.
- **Decorative gradients on KPI cards** — mesh gradients, glassmorphism, animated background blobs. All add visual noise to the number that matters.
- **Carousels for primary data** — never hide a key metric behind "swipe to see more". The trader needs all hero numbers simultaneously.
- **Hiding key numbers behind tabs** — tabs are for _modes_ (positions vs. orders vs. history), not for splitting one logical view. PnL + balance + exposure must coexist on the same surface.
- **Imprecise typography** — proportional digits cause column misalignment. Mono / `tabular-nums` is mandatory for any vertical stack of numbers.
- **Auto-clearing flashes too fast (<200ms)** — invisible to peripheral vision. 200–300ms is the minimum for "I saw it tick".
- **Color-only state communication** — always pair with icon/symbol (▲/▼, ✓/⚠/✕). Colorblind users + grayscale screenshots both depend on this.
- **Animated hero numbers that count up on load** — looks "premium" but delays the read. Render the final value, animate only on _change_.

## Default DESIGN.md template

```yaml
---
designSystem:
  name: "{ProjectName} Trading"
  category: trading-analytics
  defaultMode: dark
  modes: [dark, light]

color:
  bgBase: "#0A0A0F"
  bgSurface: "#18181B"
  bgSurfaceRaised: "#27272A"
  border: "#27272A"
  borderSubtle: "#1F1F23"
  fgPrimary: "#F4F4F5"
  fgSecondary: "#A1A1AA"
  fgMuted: "#71717A"
  up: "#10B981"
  down: "#EF4444"
  neutral: "#A1A1AA"
  warn: "#F59E0B"
  critical: "#DC2626"
  info: "#38BDF8"

typography:
  fontSans: "Inter, system-ui, sans-serif"
  fontMono: "'JetBrains Mono', 'Geist Mono', ui-monospace, monospace"
  body: { size: 13, lineHeight: 18, family: sans }
  label: { size: 12, lineHeight: 16, family: sans, weight: 500 }
  numeric: { size: 13, lineHeight: 18, family: mono, features: "tnum, zero" }
  heading: { size: 14, lineHeight: 20, weight: 600, family: sans }
  hero:
    {
      size: 32,
      lineHeight: 36,
      family: mono,
      weight: 600,
      features: "tnum, zero",
    }

spacing: [4, 8, 12, 16, 24, 32]
rounded: { sm: 2, md: 4, lg: 6, pill: 999 }
shadow:
  card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.4)"
  popover: "0 8px 24px rgba(0,0,0,0.6)"

motion:
  tickFlashMs: 250
  tickFlashUp: "rgba(16,185,129,0.18)"
  tickFlashDown: "rgba(239,68,68,0.18)"
  reducedMotionFallback: bgShift

components:
  kpi-card:
    padding: 16
    rounded: md
    titleStyle: label
    valueStyle: hero
    deltaSlot: delta-pill
  delta-pill:
    paddingX: 6
    paddingY: 2
    rounded: pill
    bg: "{color.up}/15 | {color.down}/15"
    fg: "{color.up} | {color.down}"
    iconBefore: "▲ | ▼"
  price-ticker:
    fontFamily: mono
    fontFeatures: "tnum, zero"
    flashOnChange: true
  data-table-dense:
    rowHeight: 30
    headerHeight: 34
    fontSize: 12
    stickyHeader: true
    zebra: false
    hoverBg: "{color.bgSurfaceRaised}"
  alert-banner:
    paddingX: 12
    paddingY: 10
    rounded: sm
    severityColors:
      info: "{color.info}"
      warn: "{color.warn}"
      critical: "{color.critical}"
  button-primary:
    bg: "{color.fgPrimary}"
    fg: "{color.bgBase}"
    rounded: sm
    paddingX: 12
    paddingY: 8
  time-range-picker:
    style: segmented
    options: ["1H", "1D", "7D", "30D", "YTD", "Custom"]
    activeFg: "{color.fgPrimary}"
    inactiveFg: "{color.fgSecondary}"
---
```

## Fingerprint signals

Cues that route a repo to this category during atlas resolution:

**Files & paths**

- `lib/marketData/`, `lib/positions/`, `lib/signals/`, `lib/orderbook/`
- `app/api/ohlcv`, `app/api/ticker`, `app/api/positions`, `app/api/signals`
- `app/(trading)`, `app/tracker`, `app/bankroll`, `app/matchup/[id]`, `app/model`, `app/attribution` (Sportsbook Edge shape)
- WebSocket handlers: `pages/api/socket.ts`, `lib/ws/`, `server/realtime/`
- Migrations like `signals_and_metrics.sql`, `positions.sql`, `ohlcv.sql` (Rainman shape)

**Dependencies (frontend)**

- `lightweight-charts`, `tradingview/charting_library` (chart-first)
- `recharts`, `victory`, `visx`, `d3` (general charting)
- `swr`, `@tanstack/react-query` with short staleTime
- `socket.io-client`, native `WebSocket`, `eventsource` (SSE)
- `framer-motion` for tick flashes

**Dependencies (backend)**

- `ccxt`, `binance-api-node`, `tradingview-ws` (market connectors)
- `technicalindicators`, `ta-lib`, `pandas-ta` (indicator math)
- Python: `pandas`, `numpy`, `scikit-learn`, `xgboost`, `statsmodels` (ML pipeline)
- `bullmq` + `ioredis` (job queues for signal generation — Rainman pattern)
- `pg` + time-series tables (`timestamptz` columns, `BRIN` indexes)

**Code patterns**

- `tabular-nums` / `font-variant-numeric: tabular-nums` in CSS
- Heavy `Intl.NumberFormat` use for currency, percentage, compact notation
- `Decimal.js` / `bignumber.js` for price math (no floats)
- `dayjs` / `date-fns` with timezone awareness; charts in user-local but data in UTC
- Time-series math: rolling windows, EMA, Bollinger bands, Z-scores

**Real-time**

- Server-Sent Events (`text/event-stream`) for one-way price ticks
- WebSocket for bidirectional (order placement + market data)
- GraphQL subscriptions (`@apollo/client` + `graphql-ws`)
- Long-polling fallback (~1s) when WS is blocked

**Operational**

- `.env` keys: `BINANCE_API_KEY`, `COINBASE_*`, `KALSHI_*`, `POLYGON_*`, `ALPACA_*`
- Cron / launchd jobs for nightly OHLCV ingest, signal recomputation
- Telegram / Discord bot integration for alerts (Rainman uses `node-telegram-bot-api`)
- HITL (human-in-the-loop) approval gates on real-money mutations (Rainman `HITLManager.ts` pattern)
