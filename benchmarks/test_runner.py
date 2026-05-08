"""Validates the pre-registered corpus and gate logic. Runs in CI."""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from benchmarks.runner import (
    CORPUS,
    PRIMARY_GATE_ABS,
    SECONDARY_GATE_REL,
    ArmAggregate,
    RepoResult,
    aggregate,
    evaluate_gates,
)


def test_corpus_has_three_arms() -> None:
    assert set(CORPUS.keys()) == {"with_design_md", "shadcn_default", "raw_palette"}


def test_corpus_arm_minimum_sizes() -> None:
    # Pre-registered minimums per spec.md. Tightening these later means a new spec version.
    assert len(CORPUS["with_design_md"]) >= 4
    assert len(CORPUS["shadcn_default"]) >= 10
    assert len(CORPUS["raw_palette"]) >= 10


def test_corpus_paths_are_absolute() -> None:
    for arm, repos in CORPUS.items():
        for p in repos:
            assert p.startswith("/"), f"{arm}: {p} is not an absolute path"


def test_corpus_no_duplicates_across_arms() -> None:
    seen: dict[str, str] = {}
    for arm, repos in CORPUS.items():
        for p in repos:
            if p in seen:
                pytest.fail(f"{p} appears in both {seen[p]} and {arm}")
            seen[p] = arm


def test_corpus_paths_exist_on_disk() -> None:
    """Every pre-registered path must exist when the benchmark runs.

    A missing path doesn't auto-fail the gate — the dropouts policy handles it —
    but the spec is wrong if a path that was supposed to be there is gone.
    """
    missing: list[str] = []
    for arm, repos in CORPUS.items():
        for p in repos:
            if not Path(p).exists():
                missing.append(f"{arm}: {p}")
    assert not missing, "missing corpus paths:\n  " + "\n  ".join(missing)


def test_evaluate_gates_primary_pass() -> None:
    arms = {
        "with_design_md": ArmAggregate(4, 4, 800, 200, 0.80, []),
        "shadcn_default": ArmAggregate(10, 10, 600, 400, 0.60, []),
        "raw_palette": ArmAggregate(10, 10, 200, 800, 0.20, []),
    }
    gates = evaluate_gates(arms)
    assert gates["primary"]["value"] == pytest.approx(0.20)
    assert gates["primary"]["pass"] is True
    assert gates["secondary"]["pass"] is True


def test_evaluate_gates_primary_fail_when_shadcn_close() -> None:
    """If DESIGN.md beats raw-palette but only narrowly beats shadcn-default,
    the *primary* gate fails — this is the upstream-PR objection in numbers."""
    arms = {
        "with_design_md": ArmAggregate(4, 4, 80, 20, 0.80, []),
        "shadcn_default": ArmAggregate(10, 10, 75, 25, 0.75, []),  # +5%, not +15%
        "raw_palette": ArmAggregate(10, 10, 20, 80, 0.20, []),
    }
    gates = evaluate_gates(arms)
    assert gates["primary"]["value"] == pytest.approx(0.05)
    assert gates["primary"]["pass"] is False
    assert gates["secondary"]["pass"] is True  # secondary still passes


def test_evaluate_gates_handles_none_conformance() -> None:
    arms = {
        "with_design_md": ArmAggregate(0, 0, 0, 0, None, []),
        "shadcn_default": ArmAggregate(10, 10, 600, 400, 0.60, []),
        "raw_palette": ArmAggregate(10, 10, 200, 800, 0.20, []),
    }
    gates = evaluate_gates(arms)
    assert gates["primary"]["value"] is None
    assert gates["primary"]["pass"] is False


def test_aggregate_drops_marked_repos() -> None:
    repos = [
        RepoResult("/a", "a", 100, 50, 800, 200, 0.80, False, None),
        RepoResult("/b", "b", 0, 0, 0, 0, None, True, "no_source_files"),
    ]
    agg = aggregate(repos)
    assert agg.n_total == 2
    assert agg.n_kept == 1
    assert agg.tokens == 800
    assert agg.raw == 200
    assert agg.dropouts == ["b (no_source_files)"]


def test_thresholds_match_spec() -> None:
    # Cross-check that constants match spec.md so a lazy edit on one side trips this test.
    assert PRIMARY_GATE_ABS == 0.15
    assert SECONDARY_GATE_REL == 0.40


def test_spec_md_committed() -> None:
    spec = Path(__file__).parent / "spec.md"
    assert spec.exists(), "benchmarks/spec.md must be committed before runner.py is touched"
    text = spec.read_text()
    # Sanity-check the lock indicators
    assert "Locked" in text
    assert "with_design_md" in text and "shadcn_default" in text and "raw_palette" in text
