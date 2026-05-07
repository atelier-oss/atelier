---
category: saas-dashboard
tagline: Dense info surface for multi-tenant operations — sidebar nav, command palette, data tables, light + dark.
examples_in_fleet: [consult-ops, excerpa, prettyfly-audit-engine]
---

# SaaS Dashboard

Default DNA for ops/CRM/admin platforms where logged-in users spend hours per day reading tables, transitioning records through pipelines, and firing keyboard-driven mutations. Glanceability and information density beat hero animation. Light + dark are both first-class — operators toggle mid-session.

## Archetypal layout patterns

- **Shell: left sidebar nav + top app bar + main content** — fixed sidebar (~240px desktop) with module list; top bar carries breadcrumb, global search, user/org switcher; main canvas full-bleed for tables, `max-w-7xl mx-auto` for settings.
- **List → detail with split pane** — paginated list view on left/top, detail pane on right/bottom; URL-addressable record (`/leads/:id`) so detail is shareable and back-button-safe.
- **Tabbed detail surface** — record detail uses 3-7 tabs (Overview / Activity / Files / Settings). One `t-display` KPI strip up top, tabs below.
- **Multi-pane data inspector** — three-column layout (filter rail / list / detail) for high-cardinality records (mailbox, ticket queue, log viewer).
- **Modal-heavy CRUD** — create/edit happen in Radix Dialog with React Hook Form + Zod; never on a separate route. Destructive confirms via AlertDialog with text-input verification on irreversible actions.
- **Command palette as router** — `cmd+k` (cmdk) surfaces every navigable route + global mutation; primary navigation method for power users.

## Default DNA — token defaults

### Color palette

Brand primary is indigo (CTA + focus rings). Surface neutrals are zinc (warmer than slate, plays better in dark mode). Semantic states follow Tailwind defaults so existing utility-class muscle-memory carries over.

| Role                  | Light hex              | Dark hex               | Notes                           |
| --------------------- | ---------------------- | ---------------------- | ------------------------------- |
| `background`          | `#FAFAFA` (zinc-50)    | `#09090B` (zinc-950)   | Canvas                          |
| `foreground`          | `#18181B` (zinc-900)   | `#FAFAFA` (zinc-50)    | Body text                       |
| `card`                | `#FFFFFF`              | `#18181B` (zinc-900)   | Surface elevation               |
| `border`              | `#E4E4E7` (zinc-200)   | `#27272A` (zinc-800)   | Hairlines                       |
| `muted`               | `#F4F4F5` (zinc-100)   | `#27272A` (zinc-800)   | Muted bg                        |
| `muted-foreground`    | `#52525B` (zinc-600)   | `#A1A1AA` (zinc-400)   | Captions                        |
| `primary`             | `#4F46E5` (indigo-600) | `#6366F1` (indigo-500) | CTA, focus ring                 |
| `primary-foreground`  | `#FFFFFF`              | `#FFFFFF`              | On-CTA text                     |
| `success`             | `#16A34A` (green-600)  | `#22C55E` (green-500)  | Status OK                       |
| `warning`             | `#F59E0B` (amber-500)  | `#FBBF24` (amber-400)  | Status pending                  |
| `error` (destructive) | `#E11D48` (rose-600)   | `#F43F5E` (rose-500)   | Status failed / destructive     |
| `info`                | `#0EA5E9` (sky-500)    | `#38BDF8` (sky-400)    | Status informational            |
| `ring`                | `#4F46E5` (indigo-600) | `#6366F1` (indigo-500) | Focus outline (matches primary) |

### Typography

- Sans: **Inter** (or Geist Sans) via `next/font` self-hosted. Stack fallback: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- Mono: **Geist Mono** (or JetBrains Mono). Stack fallback: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. Apply with `tabular-nums` on numeric data cells.
- Hierarchy: `display` (30px / 600) for KPI hero; `heading-page` (24px / 600); `heading-section` (20px / 600); `heading-card` (18px / 600); `body` (16px / 400); `body-sm` (14px / 400) inside dense surfaces; `caption` (12px / 400); `mono-sm` (14px / 400).

### Spacing scale

`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64` (Tailwind 1/2/3/4/6/8/12/16). Touch targets ≥44×44 (`.touch-target` utility for WCAG 2.5.5).

### Radii

| Token        | Value            | Use                         |
| ------------ | ---------------- | --------------------------- |
| `rounded.sm` | `4px` (0.25rem)  | Inputs, badges, chips       |
| `rounded.md` | `6px` (0.375rem) | Buttons, secondary surfaces |
| `rounded.lg` | `8px` (0.5rem)   | Cards, popovers, sheets     |
| `rounded.xl` | `12px` (0.75rem) | Modals, command palette     |

### Elevation

Single tier: `shadow-sm` on cards, `shadow-md` on floating popover/dialog. Depth is communicated via border + bg contrast, not multi-tier shadows.

## Anchor components

These are the must-have primitives every SaaS dashboard needs. Map to design-library assets where the names are stable.

- **Sidebar nav (collapsible)** — Radix `NavigationMenu` + Sheet on mobile; active state uses `bg-primary/10 text-primary`. (design-library: `shadcn.sidebar`)
- **Command palette (cmdk)** — `cmdk@^1.0.0` mounted at app root, ⌘K binding, route + mutation surfaces. (design-library: `shadcn.command`)
- **Data table** — `@tanstack/react-table` v8 + sortable headers (with `aria-sort`), row selection, server-side pagination, column filtering. `tabular-nums` on numeric cells. (design-library: `shadcn.data-table`)
- **Form fields** — `react-hook-form` + `zod` resolver. Input, Select (Radix Select), Combobox (cmdk-based), Checkbox, RadioGroup, Switch, DatePicker (`react-day-picker`). (design-library: `shadcn.{input,select,combobox,calendar}`)
- **Toast / notification stack** — `sonner` for transient toasts; persistent banners via Alert primitive. (design-library: `shadcn.sonner`)
- **Modal / dialog** — Radix `Dialog` for CRUD, `AlertDialog` for destructive. Never use a separate route for create/edit forms. (design-library: `shadcn.dialog`, `shadcn.alert-dialog`)
- **Tabs** — Radix `Tabs` for record-detail surfaces. (design-library: `shadcn.tabs`)
- **Empty state** — icon + headline + 1-line copy + primary CTA; reuse on every list view (no records, filtered-to-zero, error). Standardize one component.
- **Loading skeleton** — `Skeleton` primitive with `.skeleton-shimmer` (gradient between `muted` and `border`, 1.5s linear).
- **Pagination** — page-N + size selector + total count; URL-driven so back-button works.
- **Breadcrumb** — Radix `Breadcrumb` in top bar; truncates middle segments on overflow.
- **KPI card** — extends Card with `t-display` hero number + `caption` label + optional sparkline (Recharts). One per dashboard hero strip.
- **Status badge / chip** — semantic-token-driven (`bg-success/10 text-success` etc.). Pair color with icon + label, never color alone.

## Exemplars (external, well-designed)

- **Linear** — keyboard-first, command palette is the primary nav method, ⌘K speed sets the bar.
- **Stripe Dashboard** — dense data tables done right, slow-render-tolerant; copy/UX patterns for money/dates.
- **Vercel Dashboard** — log streaming + deploy timeline; canonical multi-pane inspector layout.
- **Supabase Studio** — query editor + table viewer + auth/storage in one shell; settings hierarchy worth copying.
- **GitHub** — tab-heavy detail surfaces (PR / issue / repo), comment threads as part of detail view.
- **Notion** — sidebar tree, inline editing, command palette; DB-as-table view is canonical.
- **Plaid Dashboard** — clean settings architecture and webhook log viewer.

## Anti-patterns

- **Marketing hero or carousel on dashboard home** — operators don't want a slideshow. Default to KPI strip + recent activity.
- **Dense pricing/feature comparison tables in-app** — those belong on the marketing site, never inside the authenticated dashboard.
- **Marketing-style scroll-jacked animations or parallax** — destroys keyboard nav and operator throughput.
- **Infinite scroll for primary data tables** — kills addressability, page jumps lose position. Paginate with explicit page-N + size.
- **Hidden or inaccessible global search** — search must be ⌘K-reachable from any screen, not a settings sub-page.
- **Color-only status indicators** — pair color with icon + label every time (color-blind a11y; also defeats screenshots in monochrome).
- **Single-action toasts that disappear before users react** — irreversible actions confirm via `AlertDialog` (text-verification), not a 3-second toast.
- **One-mode-only color theme (light _or_ dark)** — both are mandatory for a credible SaaS dashboard. Operators toggle mid-session.

## Default DESIGN.md template

Drop this YAML frontmatter into a project's `DESIGN.md` to bootstrap a SaaS dashboard. Hex SRGB flat (NOT HSL nesting); canonical key is `rounded` (NOT `radii`); component sub-tokens limited to the eight accepted keys.

```yaml
---
version: alpha
name: <Project Name>
description: SaaS dashboard for <domain>. Tokens favor density, status legibility, and WCAG AA contrast across light + dark.
colors:
  background: "#FAFAFA"
  foreground: "#18181B"
  card: "#FFFFFF"
  card-foreground: "#18181B"
  popover: "#FFFFFF"
  popover-foreground: "#18181B"
  muted: "#F4F4F5"
  muted-foreground: "#52525B"
  border: "#E4E4E7"
  input: "#E4E4E7"
  primary: "#4F46E5"
  primary-foreground: "#FFFFFF"
  secondary: "#F4F4F5"
  secondary-foreground: "#18181B"
  accent: "#F4F4F5"
  accent-foreground: "#18181B"
  destructive: "#E11D48"
  destructive-foreground: "#FFFFFF"
  ring: "#4F46E5"
  status-success: "#16A34A"
  status-warning: "#F59E0B"
  status-error: "#E11D48"
  status-info: "#0EA5E9"
  sidebar-background: "#F4F4F5"
  sidebar-foreground: "#18181B"
  sidebar-primary: "#4F46E5"
  sidebar-accent: "#E4E4E7"
typography:
  display:
    fontFamily: Inter
    fontSize: 1.875rem
    fontWeight: 600
    lineHeight: 2.25rem
  heading-page:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 2rem
  heading-section:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.75rem
  body:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.25rem
  caption:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1rem
  mono-sm:
    fontFamily: Geist Mono
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.25rem
spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  2xl: 3rem
rounded:
  sm: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    typography: "{typography.body-sm}"
    height: "2.25rem"
  data-table-row:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-sm}"
    padding: "{spacing.sm}"
---
```

## Fingerprint signals

Cues that flag a project as SaaS dashboard during atlas auto-detection. Match ≥3 to classify with confidence.

### File / route signals

- `app/(dashboard)/` route group, or `src/pages/{Dashboard,Leads,Settings}.{jsx,tsx}`
- `lib/queries.ts` / `lib/api.ts` (data-fetching layer separate from UI)
- `components/ui/*` (shadcn add'd components — `button.tsx`, `dialog.tsx`, `data-table.tsx`)
- `app/login/`, `app/settings/`, `app/billing/` routes
- Paginated list views with URL-bound query params (`?page=`, `?status=`, `?q=`)

### Dependency signals (package.json)

- `cmdk`, `@radix-ui/react-*` (≥5 packages), `@tanstack/react-table` or `@tanstack/react-query`
- `next-themes` (theme toggle), `sonner` (toast), `react-hook-form` + `zod`
- `@supabase/supabase-js` or other RLS-capable backend
- `recharts` or `@nivo/*` for inline charts
- `react-router-dom@6+` (Vite stack) or Next.js App Router

### Schema / pattern signals

- Postgres tables with RLS policies bearing `tenant_id` / `company_id` / `org_id` columns
- Auth-gated middleware (`middleware.ts` checking session cookie at edge)
- Multi-tenant row scoping via `auth.uid() = tenant_id` predicates
- `_archive` / `archived_at` soft-delete columns on most domain tables

### Visual signals (if screenshot/markup available)

- Fixed left sidebar with module list
- ⌘K palette (cmdk DOM signature) bound at root
- Data table with sticky thead + sortable columns
- Light/dark toggle in user menu
