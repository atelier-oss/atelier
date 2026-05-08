"""Atelier Phase 1 benchmark runner — three-arm corpus, spec.md-locked.

Walks the corpus, scores each repo, emits JSON + markdown. Three arms:
    A. with_design_md  — repos with a DESIGN.md (organic, not backfilled)
    B. shadcn_default  — Radix UI + shadcn token vocabulary, no DESIGN.md
    C. raw_palette     — raw Tailwind palette refs, no DESIGN.md

Gate (primary): arm_A_conformance - arm_B_conformance >= +0.15 absolute.
Gate (secondary, reported): (arm_A - arm_C) / arm_C >= +0.40 relative.

Pre-registered in benchmarks/spec.md. Corpus is frozen with this file.

Usage:
    python3 -m benchmarks.runner [--out-json results.json] [--out-md results.md] [--date 2026-05-08]
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional

from benchmarks.score import score_text


CORPUS = {
    "with_design_md": [
        "/Users/alexhale/Projects/koho/consult-ops",
        "/Users/alexhale/Projects/eight12-run-club-website",
        "/Users/alexhale/Projects/advisory-board",
        "/Users/alexhale/Projects/prettyfly-os",
    ],
    "shadcn_default": [
        "/Users/alexhale/Projects/agent-hub-dashboard",
        "/Users/alexhale/Projects/intent-graph",
        "/Users/alexhale/Projects/medspa-platform",
        "/Users/alexhale/Projects/prettyfly-os-coach",
        "/Users/alexhale/Projects/koho/excerpa/web",
        "/Users/alexhale/Projects/prettyfly/audit-engine",
        "/Users/alexhale/Projects/prettyfly/decision-maker-identifier/code",
        "/Users/alexhale/Projects/yehovah/app",
        "/Users/alexhale/Projects/yehovah/landing",
        "/Users/alexhale/Projects/1g1f/code/1g1f-ministries",
    ],
    "raw_palette": [
        "/Users/alexhale/Projects/base-camp-tampa",
        "/Users/alexhale/Projects/eight12-run-club-web",
        "/Users/alexhale/Projects/evansville-tonight",
        "/Users/alexhale/Projects/gravity-claw/dashboard",
        "/Users/alexhale/Projects/gravity-stack/site",
        "/Users/alexhale/Projects/koho/process-automation/frontend",
        "/Users/alexhale/Projects/mission-control/api-cost-dashboard",
        "/Users/alexhale/Projects/nexus",
        "/Users/alexhale/Projects/open-generative-ai",
        "/Users/alexhale/Projects/prettyfly-audit-engine",
    ],
}

EXTENSIONS = (".tsx", ".jsx", ".ts", ".js")
EXCLUDE_PARTS = frozenset(
    {
        "node_modules", "dist", "build", ".next", ".venv", "venv",
        ".git", "__pycache__", ".turbo", ".cache", "out", "coverage",
        ".vercel", "_archive",
    }
)

# Pre-registered dropout thresholds (see spec.md §Dropouts policy).
MIN_FILES = 1            # zero source files = drop
MIN_SIGNAL = 10          # tokens + raw < 10 = drop
PRIMARY_GATE_ABS = 0.15  # arm_A - arm_B >= 15 percentage points
SECONDARY_GATE_REL = 0.40  # (arm_A - arm_C) / arm_C >= 40%


@dataclass
class RepoResult:
    repo: str
    name: str
    files_scanned: int
    files_with_signal: int
    tokens: int
    raw: int
    conformance: Optional[float]
    dropped: bool
    drop_reason: Optional[str]


@dataclass
class ArmAggregate:
    n_total: int
    n_kept: int
    tokens: int
    raw: int
    conformance: Optional[float]
    dropouts: list[str]


def find_source_files(repo: Path) -> list[Path]:
    files: list[Path] = []
    if not repo.exists():
        return files
    for ext in EXTENSIONS:
        for f in repo.rglob(f"*{ext}"):
            if set(f.parts) & EXCLUDE_PARTS:
                continue
            name = f.name.lower()
            if ".test." in name or ".spec." in name or ".d.ts" in name:
                continue
            files.append(f)
    return files


def score_repo(repo: Path) -> RepoResult:
    if not repo.exists():
        return RepoResult(
            repo=str(repo), name=repo.name, files_scanned=0, files_with_signal=0,
            tokens=0, raw=0, conformance=None, dropped=True, drop_reason="missing_path",
        )
    files = find_source_files(repo)
    tokens = 0
    raw = 0
    signal_files = 0
    for f in files:
        try:
            text = f.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        s = score_text(text)
        if s.tokens or s.raw:
            signal_files += 1
        tokens += s.tokens
        raw += s.raw
    total = tokens + raw
    drop_reason: Optional[str] = None
    if len(files) < MIN_FILES:
        drop_reason = "no_source_files"
    elif total < MIN_SIGNAL:
        drop_reason = "insufficient_signal"
    return RepoResult(
        repo=str(repo),
        name=repo.name,
        files_scanned=len(files),
        files_with_signal=signal_files,
        tokens=tokens,
        raw=raw,
        conformance=(tokens / total) if total else None,
        dropped=drop_reason is not None,
        drop_reason=drop_reason,
    )


def aggregate(group: list[RepoResult]) -> ArmAggregate:
    kept = [r for r in group if not r.dropped]
    ts = sum(r.tokens for r in kept)
    rs = sum(r.raw for r in kept)
    return ArmAggregate(
        n_total=len(group),
        n_kept=len(kept),
        tokens=ts,
        raw=rs,
        conformance=ts / (ts + rs) if (ts + rs) else None,
        dropouts=[f"{r.name} ({r.drop_reason})" for r in group if r.dropped],
    )


def evaluate_gates(arms: dict[str, ArmAggregate]) -> dict:
    a = arms["with_design_md"].conformance
    b = arms["shadcn_default"].conformance
    c = arms["raw_palette"].conformance

    primary_delta = (a - b) if (a is not None and b is not None) else None
    primary_pass = primary_delta is not None and primary_delta >= PRIMARY_GATE_ABS

    secondary_lift = ((a - c) / c) if (a is not None and c not in (None, 0)) else None
    secondary_pass = secondary_lift is not None and secondary_lift >= SECONDARY_GATE_REL

    return {
        "primary": {
            "comparison": "with_design_md - shadcn_default (absolute)",
            "value": primary_delta,
            "threshold": PRIMARY_GATE_ABS,
            "pass": primary_pass,
            "blocking": True,
        },
        "secondary": {
            "comparison": "(with_design_md - raw_palette) / raw_palette (relative)",
            "value": secondary_lift,
            "threshold": SECONDARY_GATE_REL,
            "pass": secondary_pass,
            "blocking": False,
        },
    }


def render_markdown(date: str, results: dict, summary: dict, gates: dict) -> str:
    lines: list[str] = []
    lines.append(f"# Atelier Phase 1 Benchmark — {date}")
    lines.append("")
    lines.append("Pre-registered in `benchmarks/spec.md`. Three-arm observational corpus.")
    lines.append("")
    lines.append("## Arm summaries")
    lines.append("")
    lines.append("| Arm | n (kept / total) | Tokens | Raw | Conformance |")
    lines.append("|---|---|---|---|---|")
    for arm in ("with_design_md", "shadcn_default", "raw_palette"):
        a = summary[arm]
        conf = f"{a['conformance']:.1%}" if a["conformance"] is not None else "n/a"
        lines.append(
            f"| `{arm}` | {a['n_kept']} / {a['n_total']} | {a['tokens']} | {a['raw']} | {conf} |"
        )
    lines.append("")
    lines.append("## Gates")
    lines.append("")
    p = gates["primary"]
    s = gates["secondary"]
    p_val = f"{p['value']:+.1%}" if p["value"] is not None else "n/a"
    s_val = f"{s['value']:+.1%}" if s["value"] is not None else "n/a"
    lines.append(f"- **Primary (blocking)**: {p['comparison']} = **{p_val}** "
                 f"(threshold ≥ +{p['threshold']:.0%}) — {'PASS' if p['pass'] else 'FAIL'}")
    lines.append(f"- Secondary (informational): {s['comparison']} = **{s_val}** "
                 f"(threshold ≥ +{s['threshold']:.0%}) — {'PASS' if s['pass'] else 'FAIL'}")
    lines.append("")
    lines.append("## Per-repo")
    lines.append("")
    lines.append("| Arm | Repo | Files (signal/total) | Tokens | Raw | Conformance | Status |")
    lines.append("|---|---|---|---|---|---|---|")
    for arm in ("with_design_md", "shadcn_default", "raw_palette"):
        for r in results[arm]:
            conf = f"{r['conformance']:.1%}" if r["conformance"] is not None else "n/a"
            status = "kept" if not r["dropped"] else f"dropped ({r['drop_reason']})"
            lines.append(
                f"| `{arm}` | {r['name']} | {r['files_with_signal']}/{r['files_scanned']} "
                f"| {r['tokens']} | {r['raw']} | {conf} | {status} |"
            )
    lines.append("")
    lines.append("## Caveats")
    lines.append("")
    lines.append("- Observational only — does not measure causality or AI-generation conformance.")
    lines.append("- All repos are owned by one developer (Alex). External validation requires fork-and-rerun by independent maintainers.")
    lines.append("- Dropouts policy is pre-registered in `spec.md`; dropouts do not trigger arm rebalancing.")
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    here = Path(__file__).parent
    parser.add_argument("--out-json", type=Path, default=here / "results" / "latest.json")
    parser.add_argument("--out-md", type=Path, default=here / "results" / "latest.md")
    parser.add_argument("--date", default="latest")
    args = parser.parse_args(argv)

    results: dict[str, list[dict]] = {arm: [] for arm in CORPUS}
    summary: dict[str, dict] = {}

    for arm, repos in CORPUS.items():
        arm_results: list[RepoResult] = []
        for path in repos:
            r = score_repo(Path(path))
            arm_results.append(r)
            conf = r.conformance or 0
            tag = "" if not r.dropped else f"  [DROP: {r.drop_reason}]"
            print(
                f"  {arm}/{r.name:30s}  files={r.files_with_signal:4d}/{r.files_scanned:5d}"
                f"  tok={r.tokens:5d} raw={r.raw:5d} conf={conf:6.1%}{tag}",
                file=sys.stderr,
            )
        results[arm] = [asdict(r) for r in arm_results]
        summary[arm] = asdict(aggregate(arm_results))

    arms_for_gate = {arm: aggregate([RepoResult(**r) for r in results[arm]]) for arm in CORPUS}
    gates = evaluate_gates(arms_for_gate)

    args.out_json.parent.mkdir(parents=True, exist_ok=True)
    args.out_json.write_text(
        json.dumps(
            {"date": args.date, "results": results, "summary": summary, "gates": gates},
            indent=2,
        )
    )
    args.out_md.write_text(render_markdown(args.date, results, summary, gates))
    print(f"\nGate primary (blocking): {'PASS' if gates['primary']['pass'] else 'FAIL'}", file=sys.stderr)
    print(f"Gate secondary:           {'PASS' if gates['secondary']['pass'] else 'FAIL'}", file=sys.stderr)
    return 0 if gates["primary"]["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
