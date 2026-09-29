# docs — upstream PR, launch sequence, version plans

## Inputs

- Working: `docs/upstream-pr-draft.md` (draft for `google-labs-code/design.md` PR #76),
  `docs/manual-launch-sequence.md` (the v0.1.0 publish runbook), `docs/v0.2.0-plan.md` (next
  milestone: Tailwind v4, per root `CLAUDE.md` "Status").
- Stable reference: root `CLAUDE.md` "Status" section is the single line of truth for what
  shipped and what's next — every doc here must agree with it.
- Entry condition: planning the next milestone, or the upstream PR's status changes (e.g. CLA
  signed, PR merged/closed).

## Process

1. `v0.2.0-plan.md` is the working plan for the next milestone; update root `CLAUDE.md`
   "Next milestone" line when its status changes.
2. `manual-launch-sequence.md` is the runbook a real publish followed (v0.1.0, 2026-05-08) —
   update it before the next publish if any step changed, don't rely on memory.
3. `upstream-pr-draft.md` tracks the PR body/status; update root `CLAUDE.md` "Status" the same
   day the PR's real state changes (CLA signed, merged, closed).

## Outputs

- `docs/v0.2.0-plan.md` — the next-milestone plan.
- `docs/manual-launch-sequence.md` — the runbook the next publish follows.

## Human check

Alex confirms `docs/*.md` here and root `CLAUDE.md` "Status" agree before any publish or PR
status announcement. Pass: agree. Fail: fix the stale one first.
