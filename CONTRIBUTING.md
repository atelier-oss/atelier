# Contributing to Atelier

Phase 2 is private bootstrapping. Contributions open up after public launch (Phase 3).

## Local setup

```bash
pnpm install
pnpm -r build
pnpm -r test
python3 benchmarks/parity_check.py    # gate: 60/60 PASS
```

## Adding a changeset

```bash
pnpm changeset
```

Pick the affected packages, choose `patch` / `minor` / `major`, commit the resulting `.md` file alongside your PR.

## Verify before pushing

- `pnpm -r typecheck` — TS clean
- `pnpm -r test` — tests green
- `python3 benchmarks/parity_check.py` — Python parity oracle still 60/60
