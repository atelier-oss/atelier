---
category: internal-ops
tagline: Keyboard-first multi-pane command surface for operators — kanban, live event streams, cmd-K dispatch, brand-expressive but data-dense.
examples_in_fleet: [prettyfly-os, antfarm-dashboard]
---

# Internal Ops

Operator-facing command and observability surfaces. The user is the operator (Alex, ops team, on-call engineer); the value is glanceable fleet state plus a fast keyboard path to mutating actions. Tolerates more brand expression than enterprise SaaS dashboards because the operator is the brand owner — but every pixel must earn its place against data.

## Archetypal layout patterns

- Sidebar nav + top tab + cmd-K palette (cmdk) — keyboard-first navigation
- Multi-pane workspace (3-column desktop: sidebar / main / detail panel)
- Kanban board (columns + cards, drag-and-drop)
- Live event stream / activity feed (SSE-driven, virtualized scroll)
- Card-grid home → split-pane detail view
- Sortable, filterable, paginated tables (heavier filter chips + saved-view UI than SaaS dashboards)
- Heatmaps / status grids (fleet health at a glance)
- Command palette dispatches actions, not just navigation

## Default DNA — token defaults

- Light + dark with **light-default**; dark mirrors zinc palette (`#09090b` bg / `#18181b` surface / `#27272a` border) — not a derived HSL swap from light, separately curated
- Brand color expressive (PrettyFly OS uses orange `#F47B20` primary CTA + teal `#1A7BA5` navigation accent on `#FAF9F6` canvas) — internal tools tolerate more brand expression than enterprise SaaS dashboards
- Foreground: indigo-950 `#1A1A2E` on light, slate-200 `#E4E4E7` on dark; four-tier text scale (t1/t2/t3/muted) — never reach for raw zinc/gray
- Semantic states locked: success (emerald-500 `#10B981`), warn (amber-500 `#F59E0B`), error (rose-500 `#EF4444`), info (sky-500 `#0EA5E9`); plus runtime extras — running (indigo-400 `#818CF8`), waiting (violet-400 `#A78BFA`), idle (slate `#6A6A7A`)
- Typography: Geist Sans / Mono — concise, clean, slightly more expressive than Inter; `tabular-nums` mandatory on numeric grids
- Type scale: balanced (16px body, 14px caption, 12px meta) — internal tools breathe more than trading
- Spacing: balanced (8/12/16/24/32) — denser than marketing, looser than trading
- Radii: medium (8px card, 6px button, 4px input)
- Motion: subtle, purposeful — pulse-card animation for new events, drag-and-drop with spring (framer-motion). Easing `[0.22, 1, 0.36, 1]`, durations ≤400ms, hover `scale 1.01` max. Respect reduced-motion (replace pulse with bg-fade)
- Single-tier elevation: `border + bg-contrast`, no multi-shadow scale; popovers/dialogs only floating shadow

## Anchor components

- `command-palette` (cmdk-driven, with action dispatch)
- `sidebar-nav` (collapsible)
- `kanban-column` + `kanban-card` (drag handles, status badges)
- `activity-stream-row` (time + actor + verb + object, SSE-fed)
- `pulse-card` (animated card for live updates)
- `command-sphere` (PrettyFly OS visual signature — fleet status orb)
- `telemetry-stream` (live event feed with empty-state)
- `status-pill` (idle / running / error / paused, color-coded)
- `data-table-filterable` (saved views, filter chips, multi-sort)
- `split-pane-detail` (master-detail with deep-link routing)

## Exemplars

- **Linear** — issue tracking, kanban board, ⌘K command bar, instant nav
- **Notion** — multi-pane workspace, slash commands, hierarchical sidebar
- **Vercel Dashboard** — deployments stream, real-time log viewer, project cards
- **GitHub Actions** — real-time job streams, step-level expand, status badges
- **Kibana / Grafana** — operational dashboards, dense panels, time-range scrubbing
- **Retool** — internal-tool builder showcase, table-heavy, action buttons inline
- **Antfarm** — fleet management UI, agent grid, real-time worker status

## Anti-patterns

- Mouse-only workflow (cmd-K and keyboard nav are required)
- Hiding live events behind tabs (operators need always-on visibility)
- Auto-clearing alerts (preserve history; mark as read instead)
- Marketing-style hero on internal-tool home
- Over-decorated cards (data is the value, chrome is overhead)
- Modal-heavy CRUD (prefer split-pane or inline edit)
- Pop-up confirmations on every action (use undo-toast for low-stakes; reserve modals for destructive)
- No keyboard shortcuts surfaced anywhere (operators discover them via cmd-K + ?-help)
- Color-only status (always pair color + icon + label per a11y)
- Animating `width`/`height`/`top`/`left` on data-dense pages
- Adding a third saturated brand accent on the same screen without design review

## Default DESIGN.md template

```yaml
---
version: alpha
name: Internal Ops Surface
description: Operator-facing command surface — kanban, SSE event stream, cmd-K dispatch. Light-default warm canvas with dark zinc parity for ops sessions.
colors:
  background: "#FAF9F6"
  foreground: "#1A1A2E"
  card: "#FFFFFF"
  card-foreground: "#1A1A2E"
  popover: "#FFFFFF"
  popover-foreground: "#1A1A2E"
  primary: "#F47B20"
  primary-foreground: "#171717"
  secondary: "#F1EEE8"
  secondary-foreground: "#1A1A2E"
  muted: "#F1EEE8"
  muted-foreground: "#6A6A7A"
  accent: "#1A7BA5"
  accent-foreground: "#FFFFFF"
  destructive: "#EF4444"
  destructive-foreground: "#FFFFFF"
  border: "#E8E6E1"
  input: "#E8E6E1"
  ring: "#F47B20"
  state-success: "#10B981"
  state-warn: "#F59E0B"
  state-error: "#EF4444"
  state-running: "#818CF8"
  state-waiting: "#A78BFA"
  state-idle: "#6A6A7A"
  dark-background: "#09090B"
  dark-foreground: "#FAFAFA"
  dark-surface: "#18181B"
  dark-border: "#27272A"
  dark-muted-foreground: "#9CA3AF"
typography:
  display:
    fontFamily: Geist Sans
    fontSize: 2.25rem
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.02em
  heading:
    fontFamily: Geist Sans
    fontSize: 1.25rem
    fontWeight: 500
    lineHeight: 1.3
  body:
    fontFamily: Geist Sans
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: Geist Sans
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.4
  mono-sm:
    fontFamily: Geist Mono
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
spacing:
  xs: 0.5rem
  sm: 0.75rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
rounded:
  sm: 0.25rem
  md: 0.375rem
  lg: 0.5rem
components:
  command-palette:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.popover-foreground}"
    rounded: "{rounded.lg}"
    typography: "{typography.body}"
  kanban-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  activity-stream-row:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.mono-sm}"
    padding: "{spacing.sm}"
  pulse-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  status-pill:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.sm}"
    typography: "{typography.label}"
    padding: "{spacing.xs}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    typography: "{typography.body}"
  sidebar-nav-item:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    typography: "{typography.body}"
    padding: "{spacing.sm}"
---
```

## Fingerprint signals

Observable repo cues that route a project into this category:

- **Files / dirs**: `app/(ops)/`, `app/(silos)/`, `app/agents/`, `app/kanban/`, SSE/realtime endpoints (`app/api/**/stream/route.ts`), kanban schemas (`supabase/migrations/*kanban*.sql`), `lib/agentEvents.ts`, `lib/sse.ts`, `components/silo/`, `components/CmdKPalette.tsx`
- **Dependencies** (`package.json`): `cmdk`, `@dnd-kit/core` + `@dnd-kit/sortable`, `framer-motion`, `next-themes`, `@supabase/supabase-js` (with RLS), `eventsource-parser`, `react-virtuoso` (or similar virtualized list), `lucide-react`
- **Routes**: `/agents`, `/silos`, `/kanban`, `/admin`, `/inbox`, `/settings`, `/(ops)/...`
- **Patterns**: SSE handlers (`new ReadableStream` + `controller.enqueue`), webhook intake routes, fleet observability tables (`agent_events`, `runs`, `tasks` with `cwd_project` / `surface` / `skill_slug` columns), command palette dispatch wiring
- **Multi-tenant**: typically RLS-backed (`company_id` / `tenant_id` / `org_id` columns, `auth.uid()` policies), `SET LOCAL` patterns, signed session tokens
- **Telemetry**: Langfuse / OpenTelemetry / Sentry; `agent_events` HTTP emission as first-class observability primitive

## See also

- Reference impl: `~/Projects/prettyfly-os/DESIGN.md` + `~/Projects/prettyfly-os/.interface-design/system.md`
- Sibling category (denser, dark-default, real-time-first): `trading-analytics.md`
- Sibling category (lighter, less brand expression, lighter palette of widgets): `saas-dashboard.md`
- Atlas resolution: explicit per-project `DESIGN.md` early-returns; this shard is fallback only
