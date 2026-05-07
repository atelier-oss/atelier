# Atelier

> **v0 generates. Cursor edits. Atelier enforces.**

Design-token toolkit for projects using [`DESIGN.md`](https://github.com/google-labs-code/design.md) — the Google Labs spec for lint-checkable design tokens.

**Phase 2 in progress.** Final README + headline number ships in Phase 2.8.

## Headline number (preliminary, MVB)

DESIGN.md repos hit **79.9%** semantic-token conformance vs **39.0%** for control repos — a **+105.1% relative lift** in observed token usage.

Source: `benchmarks/results/2026-05-07-mvb.md` (4 + 4 repos, observational, full Phase 1 expands to 30 repos before public launch).

## Packages

| Package               | Status   |
| --------------------- | -------- |
| `@atelier/cli`        | scaffold |
| `@atelier/lint`       | scaffold |
| `@atelier/classify`   | scaffold |
| `@atelier/atlas`      | scaffold |
| `@atelier/audit`      | scaffold |
| `@atelier/mcp-server` | scaffold |

See [`CLAUDE.md`](./CLAUDE.md) for repo layout and conventions.

## License

MIT. Depends on Apache-2.0 [`@google/design.md`](https://www.npmjs.com/package/@google/design.md). See [`NOTICE`](./NOTICE).
