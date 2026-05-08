"""Validates that benchmarks/score.py emits expected verdicts on classify-parity.yaml.

This is the parity oracle for @atelier-oss/classify. The TS port (Phase 2.1) loads
the same YAML and must match every row. Run before AND after each TS edit:

    python3 -m benchmarks.parity_check          # from repo root
    python3 benchmarks/parity_check.py          # also works (path shim below)

Exit code 0 = all cases pass. 1 = at least one mismatch. 2 = setup error.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

# Allow direct invocation (python3 benchmarks/parity_check.py) by putting the
# repo root on sys.path BEFORE the `benchmarks.score` import below. When run as
# a module (python3 -m benchmarks.parity_check) this is a no-op.
_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

try:
    import yaml  # type: ignore[import-not-found]
except ImportError:
    print(
        "ERROR: PyYAML required.  pip install pyyaml  (or: pip3 install --user pyyaml)",
        file=sys.stderr,
    )
    sys.exit(2)

from benchmarks.score import (
    Verdict,
    classify_class,
    extract_inline_colors,
)


FIXTURE = Path(__file__).parent / "fixtures" / "classify-parity.yaml"


def expected_to_verdict(s: str) -> Verdict | None:
    mapping: dict[str, Verdict | None] = {
        "token": Verdict.TOKEN,
        "raw": Verdict.RAW,
        "none": None,
    }
    if s not in mapping:
        raise ValueError(f"unknown expected value: {s!r}")
    return mapping[s]


def evaluate(case: dict[str, Any]) -> tuple[Verdict | None, Verdict | None]:
    """Return (actual_verdict, expected_verdict) for one fixture case."""
    kind = case.get("kind", "class")
    inp = case["input"]
    expected = expected_to_verdict(case["expected"])

    if kind == "class":
        actual = classify_class(inp)
    elif kind == "inline":
        # Inline color check returns RAW if any literal found, else None
        colors = extract_inline_colors(inp)
        actual = Verdict.RAW if colors else None
    else:
        raise ValueError(f"unknown kind: {kind!r}")

    return actual, expected


def main() -> int:
    if not FIXTURE.exists():
        print(f"FAIL: fixture not found at {FIXTURE}", file=sys.stderr)
        return 2

    raw_text = FIXTURE.read_text(encoding="utf-8")
    cases = yaml.safe_load(raw_text)
    if not isinstance(cases, list):
        print(
            f"FAIL: fixture must be a YAML list, got {type(cases).__name__}",
            file=sys.stderr,
        )
        return 2

    passed = 0
    failed: list[tuple[int, str, str]] = []
    for idx, case in enumerate(cases):
        try:
            actual, expected = evaluate(case)
        except (KeyError, ValueError) as exc:
            failed.append((idx, str(case.get("input", "<missing>")), f"malformed: {exc}"))
            continue
        if actual == expected:
            passed += 1
        else:
            failed.append(
                (
                    idx,
                    case["input"],
                    f"expected={case['expected']!r}, actual={actual}",
                )
            )

    total = len(cases)
    print(f"{passed}/{total} PASS")

    if failed:
        for idx, inp, reason in failed:
            print(f"  FAIL #{idx}: {inp!r} — {reason}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
