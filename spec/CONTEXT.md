# spec — DESIGN.md spec extension

## Inputs

- Working: `spec/DESIGN.md.spec.md` (the canonical extension to Google Labs' `DESIGN.md` spec
  that Atelier enforces).
- Stable reference: the upstream `google-labs-code/design.md` project (PR #76, open as DRAFT
  per root `CLAUDE.md` "Status", pending Google CLA signature) — this file is what that PR
  proposes upstream.
- Entry condition: a token-precedence rule or sub-token addition that `packages/lint` needs to
  enforce.

## Process

1. Any change here must be mirrored into `packages/lint`'s enforcement logic in the same PR —
   the spec and the linter must never disagree about what passes.
2. Track changes intended for upstream separately in `docs/upstream-pr-draft.md` so the local
   spec and the PR proposal can diverge briefly without losing sync.

## Outputs

- `spec/DESIGN.md.spec.md` — the spec `packages/lint` implements and `packages/cli lint` runs.

## Human check

Alex confirms a spec change and its `packages/lint` implementation agree before merge, and that
`docs/upstream-pr-draft.md` reflects what's actually proposed to Google Labs. Pass: agree. Fail:
fix whichever is behind.
