# packages — the published toolkit

## Inputs

- Working: `packages/cli/`, `packages/lint/`, `packages/classify/`, `packages/atlas/`,
  `packages/audit/`, `packages/mcp-server/` (all published to npm as `@atelier-oss/*`),
  `packages/agent/` (includes `src/prompts/project-context.ts`, currently mid-edit on this
  branch).
- Stable reference: `spec/DESIGN.md.spec.md` for the token/precedence rules `lint` wraps;
  `@google/design.md` pinned exact at `0.1.1` per root `CLAUDE.md` "Conventions" — never widen
  that pin without a documented compat pass.
- Entry condition: a change to any published package's public surface or internal logic.
- Missing input: a package with no `src/index.ts` public-surface file is not ready to publish.

## Process

1. `pnpm install && pnpm -r build` from repo root before working in any package.
2. Each package: `src/index.ts` is the public surface, tests in `src/*.test.ts`, build via tsup
   → `dist/`. Every operation returns a JSON-serializable Result type
   (`packages/*/src/types.ts`) — keep new operations to that shape.
3. Root-level checks: `pnpm build` (workspace build), `pnpm test`, `pnpm typecheck`, `pnpm lint`
   (all `-r --filter './packages/*'`); `pnpm clean` to clear `dist/`/`.turbo`/tsbuildinfo.
4. Version/publish: `pnpm changeset` to record a change, `pnpm changeset:version` to bump,
   `pnpm changeset:publish` (`pnpm -r build && changeset publish`).

## Outputs

- `packages/<name>/dist/` — build output published to npm under `@atelier-oss/<name>`.

## Human check

Alex checks `pnpm -r build`, `pnpm test`, `pnpm typecheck` all pass, and `pnpm parity`
(`python3 -m benchmarks.parity_check`, prints `60/60 PASS` per root `CLAUDE.md` "Verify gates")
before a changeset publish. Pass: all green. Fail: publish is blocked.
