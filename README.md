# Atelier

> **v0 generates. Cursor edits. Atelier enforces.**

Design-token toolkit for projects using [`DESIGN.md`](https://github.com/google-labs-code/design.md) — the Google Labs spec for lint-checkable design tokens. Atelier wraps the upstream linter, layers on a precedence rule and a canonical sub-token vocabulary, and ships a CLI, a project audit, a build-category atlas, and an MCP server.

## Why

Tokens drift across projects when there's no machine-checkable contract. AI agents and humans both grab whatever colors are available — usually raw Tailwind palette refs (`bg-zinc-900`) instead of named semantic tokens (`bg-foreground`). Adding a `DESIGN.md` to a project changes that:

> **+105.1% relative lift** in semantic-token conformance.
> 79.9% in DESIGN.md repos vs. 39.0% in control. Source: [`benchmarks/results/2026-05-07-mvb.md`](./benchmarks/results/2026-05-07-mvb.md).
> *(MVB scope: 4 + 4 repos, observational. Full Phase 1 expands to 30 repos before public launch.)*

## Packages

| Package | Role |
|---|---|
| [`@atelier-oss/cli`](./packages/cli) | `atelier init` / `lint` / `classify` / `audit` / `atlas` — the everyday binary |
| [`@atelier-oss/lint`](./packages/lint) | Wraps [`@google/design.md@0.1.1`](https://www.npmjs.com/package/@google/design.md) (Apache-2.0) and adds the precedence rule + 8 canonical sub-token roles |
| [`@atelier-oss/classify`](./packages/classify) | Token-vs-raw scorer — the engine behind the +105% number |
| [`@atelier-oss/atlas`](./packages/atlas) | Fingerprint a project, get a build-category default-DNA — 7 categories: saas-dashboard, multi-llm-synthesis, marketing-landing, conversational-agent-ui, internal-ops, trading-analytics, marketplace-listing |
| [`@atelier-oss/audit`](./packages/audit) | 6-section project audit: token usage, contrast, motion, accessibility, design coverage, responsive |
| [`@atelier-oss/mcp-server`](./packages/mcp-server) | MCP stdio server exposing the above as `atelier_lint` / `atelier_classify` / `atelier_audit` / `atelier_atlas_fingerprint` |

Each package ships independently via [changesets](https://github.com/changesets/changesets).

## Quickstart

```bash
# Install the CLI globally
npm install -g @atelier-oss/cli

# In a project root
atelier init                                  # writes a starter DESIGN.md
atelier lint DESIGN.md                        # validates token contract
atelier classify . --format=json              # scores token conformance
atelier atlas list                            # show known build categories
atelier audit                                 # six-section project audit
atelier audit-init --preset shadcn            # scaffold atelier.audit.config.ts
```

The audit ships with two presets: `shadcn` (generic shadcn-style projects with a flat `components/` directory — recommended starting point) and `prettyfly` (the historical defaults from `benchmarks/audit_home_dashboard.py`, kept available as a parity oracle). Run `atelier audit-init --preset <name>` to scaffold a project-specific config; the audit emits a loud non-blocking finding when none of its filesystem targets resolve so a silent run isn't mistaken for a clean codebase.

## The spec

Read [`spec/DESIGN.md.spec.md`](./spec/DESIGN.md.spec.md) for:

1. **Fork notice** — Atelier extends `@google/design.md@0.1.1` (Apache-2.0); extensions are MIT.
2. **Precedence rule** — `explicit > atlas > palette`. Project-local DESIGN.md beats atlas defaults; atlas defaults beat raw Tailwind palette.
3. **8 canonical sub-token roles** — `background`, `foreground`, `primary`, `primary-foreground`, `accent`, `muted`, `border`, `ring`. Chosen empirically from 4 production DESIGN.md files.
4. **Lint contract** — finding codes `ATELIER_PRECEDENCE_VIOLATION` (warning) and `ATELIER_MISSING_ROLE` (info).

## Status

**Phase 2 complete.** Phase 3 expansion to 24 repos (three-arm: DESIGN.md / shadcn-default / raw-palette) ran 2026-05-07; pre-registered primary gate (DESIGN.md ≥ shadcn-default + 15pp absolute) FAILED by 0.05pp (+14.95pp computed). Public npm publish + upstream PR remain blocked on a clearer signal — either a methodology revision or a Phase 2 generative arm-vs-arm study.

Tailwind v4 (`@theme` blocks, `oklch()` palette) is a v0.2.0 milestone. v0.1.0 covers v3 only.

The kept-alive MVB lives at [`benchmarks/`](./benchmarks/). Re-run anytime:

```bash
python3 -m benchmarks.runner       # corpus walk + scoring
python3 -m benchmarks.parity_check # 60/60 oracle for @atelier-oss/classify TS port
```

## License

MIT. Depends on Apache-2.0 [`@google/design.md`](https://www.npmjs.com/package/@google/design.md). See [`NOTICE`](./NOTICE).
