# Atelier — Project Context

Public OSS toolkit for projects using `DESIGN.md` (Google Labs spec). Pitch: **v0 generates. Cursor edits. Atelier enforces.**

## Status

Phase 2 in progress. Public launch deferred until 30-repo benchmark passes.

Phase 1 MVB result (2026-05-07): DESIGN.md group 79.9% token conformance vs 39.0% control = +105.1% relative lift. Kill switch cleared.

## Repo layout

```
atelier/
├── packages/{cli,lint,classify,atlas,audit,mcp-server}/  — published to @atelier-oss/*
├── spec/DESIGN.md.spec.md                                 — canonical spec extension
├── benchmarks/                                            — parity oracle + MVB harness
├── library/                                               — internal asset DB (gitignored)
└── docs/                                                  — drafts (upstream PR, etc.)
```

## Packages (each ships independently)

| Package               | Role                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `@atelier-oss/cli`        | `npx @atelier-oss/cli init/lint/classify/audit/atlas`                                            |
| `@atelier-oss/lint`       | wraps `@google/design.md@0.1.1` (Apache-2.0) + precedence rule + 8 sub-tokens                |
| `@atelier-oss/classify`   | token-vs-raw scorer (TS port of `benchmarks/score.py`)                                       |
| `@atelier-oss/atlas`      | 7 build-category shards + fingerprint(repoPath) → category                                   |
| `@atelier-oss/audit`      | 6-section project audit (token usage, contrast, motion, a11y, design coverage, responsive)   |
| `@atelier-oss/mcp-server` | MCP tools — `atelier_lint`, `atelier_classify`, `atelier_audit`, `atelier_atlas_fingerprint` |

## Conventions

- License: MIT for Atelier code; depends on Apache-2.0 `@google/design.md`. NOTICE file at root.
- Node 20+, pnpm 10, TS 5.6+, vitest 2.x, tsup 8.x.
- `@google/design.md` pinned **exact** to `0.1.1` (no `^`, no `~`). Tracked manually until upstream stabilizes.
- Each package: `src/index.ts` is the public surface; tests in `src/*.test.ts`; build via tsup → `dist/`.
- Adapter format: every operation returns a JSON-serializable Result type (see `packages/*/src/types.ts`).

## Verify gates

- Phase 2.0: `pnpm install && pnpm -r build` zero errors; `python3 benchmarks/parity_check.py` prints `60/60 PASS`.
- Phase 2.1: TS classify matches Python on all 60 fixture rows.
- Phase 2.2+: documented in PLAN per phase.

## Public launch (Phase 3, NOT here)

`npm publish`, GitHub org provisioning, upstream PR open — all gated on 30-repo benchmark expansion clearing +40% lift threshold.
