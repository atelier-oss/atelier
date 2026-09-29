# benchmarks — parity oracle, MVB harness, results

## Inputs

- Working: `benchmarks/registry.py`/`registry.py`, `benchmarks/runner.py`/`runner_v2.py`,
  `benchmarks/score.py`/`test_score_v2.py`, `benchmarks/parity_check.py`,
  `benchmarks/audit_home_dashboard.py`, `benchmarks/spec.md`/`spec-v2.md`/`spec-v3.md`,
  `benchmarks/fixtures/`, `benchmarks/results/`.
- Stable reference: `packages/classify/` is the TS port `parity_check.py` checks against the
  Python scorer on all 60 fixture rows, per root `CLAUDE.md` "Verify gates".
- Entry condition: a new benchmark phase, a scoring-methodology change, or a classify-package
  change that needs parity re-verification.
- Missing input: never report a benchmark delta without a `spec-vN.md` pre-registered
  methodology backing it — per the project's own phase-1 v2 precedent
  ("pre-registered methodology in `benchmarks/spec-v2.md`").

## Process

1. Run `python3 benchmarks/parity_check.py` — must print `60/60 PASS` before any classify change
   ships (Phase 2.0 verify gate).
2. A new benchmark phase gets its own `spec-vN.md` (methodology, pre-registered before running)
   and a dated result file `results/YYYY-MM-DD-phase-N-vM.md`.
3. `runner.py`/`runner_v2.py` execute the harness; `score.py`/`test_score_v2.py` score it;
   `registry.py` tracks the fixture/result registry.

## Outputs

- `benchmarks/results/YYYY-MM-DD-phase-N-vM.md` — one dated result file per run.

## Human check

Alex reads a new result file against its pre-registered `spec-vN.md` before citing the
percentage-point delta anywhere external. Pass: methodology matches what was pre-registered.
Fail: the result is not cited until re-run under the registered methodology.
