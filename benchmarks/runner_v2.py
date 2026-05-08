"""spec-v2 runner — registry-strict three-arm benchmark.

Runs the benchmark in THREE classifier modes (v1, v2-strict, v2-broad)
against the same locked corpus. Each repo is scored three ways; per-arm
aggregates and gates are computed for each mode. The result file presents
all three for comparison so the v1→v2 sensitivity is transparent.

Pre-registered in benchmarks/spec-v2.md. Locked 2026-05-07 before this
runner ran. Corpus + dropouts policy + gate thresholds inherited from v1.

Usage:
    python3 -m benchmarks.runner_v2 [--out-json results.json] [--out-md results.md] [--date 2026-05-07]
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

from benchmarks.registry import build_registry
from benchmarks.runner import (
    CORPUS,
    PRIMARY_GATE_ABS,
    SECONDARY_GATE_REL,
    ArmAggregate,
    RepoResult,
    aggregate,
    evaluate_gates,
    score_repo,
)


CLASSIFIER_MODES = ("v1", "v2_strict", "v2_broad")


def registry_for(repo: Path, mode: str) -> set[str] | None:
    if mode == "v1":
        return None
    if mode == "v2_strict":
        return build_registry(repo, sources=("design_md",))
    if mode == "v2_broad":
        return build_registry(repo, sources=("design_md", "tailwind_config", "css_vars"))
    raise ValueError(f"unknown classifier mode: {mode}")


def run_mode(mode: str) -> tuple[dict[str, list[dict]], dict[str, dict], dict, dict[str, int]]:
    """Run one classifier mode across the full corpus. Returns (per_repo, summary, gates, registry_sizes)."""
    results: dict[str, list[dict]] = {arm: [] for arm in CORPUS}
    registry_sizes: dict[str, int] = {}
    for arm, repos in CORPUS.items():
        arm_results: list[RepoResult] = []
        for path in repos:
            repo = Path(path)
            registry = registry_for(repo, mode)
            r = score_repo(repo, registry=registry)
            arm_results.append(r)
            registry_sizes[r.name] = len(registry) if registry is not None else 0
            conf = r.conformance or 0
            tag = "" if not r.dropped else f"  [DROP: {r.drop_reason}]"
            reg_tag = f"  reg={len(registry)}" if registry is not None else ""
            print(
                f"  [{mode}] {arm}/{r.name:30s}  files={r.files_with_signal:4d}/{r.files_scanned:5d}"
                f"  tok={r.tokens:5d} raw={r.raw:5d} conf={conf:6.1%}{reg_tag}{tag}",
                file=sys.stderr,
            )
        results[arm] = [asdict(r) for r in arm_results]
    summary = {
        arm: asdict(aggregate([RepoResult(**r) for r in results[arm]]))
        for arm in CORPUS
    }
    arms_for_gate = {arm: aggregate([RepoResult(**r) for r in results[arm]]) for arm in CORPUS}
    gates = evaluate_gates(arms_for_gate)
    return results, summary, gates, registry_sizes


def render_summary_table(modes: dict[str, dict]) -> str:
    """Render the per-mode summary tables side by side."""
    lines: list[str] = []
    lines.append("| Arm | v1 conformance | v2-strict | v2-broad (primary) |")
    lines.append("|---|---|---|---|")
    for arm in ("with_design_md", "shadcn_default", "raw_palette"):

        def fmt(mode: str) -> str:
            a = modes[mode]["summary"][arm]
            n_kept = a["n_kept"]
            n_total = a["n_total"]
            conf = a["conformance"]
            if conf is None:
                return f"n/a (n={n_kept}/{n_total})"
            return f"{conf:.1%} (n={n_kept}/{n_total})"

        lines.append(f"| `{arm}` | {fmt('v1')} | {fmt('v2_strict')} | {fmt('v2_broad')} |")
    return "\n".join(lines)


def render_gate_table(modes: dict[str, dict]) -> str:
    lines: list[str] = []
    lines.append("| Mode | Primary delta (DESIGN.md − shadcn) | Primary verdict | Secondary lift | Secondary verdict |")
    lines.append("|---|---|---|---|---|")
    for mode in ("v1", "v2_strict", "v2_broad"):
        gates = modes[mode]["gates"]
        p = gates["primary"]
        s = gates["secondary"]
        p_val = f"{p['value'] * 100:+.2f}pp" if p["value"] is not None else "n/a"
        s_val = f"{s['value']:+.2%}" if s["value"] is not None else "n/a"
        lines.append(
            f"| {mode} | {p_val} | {'PASS' if p['pass'] else 'FAIL'} | {s_val} | {'PASS' if s['pass'] else 'FAIL'} |"
        )
    return "\n".join(lines)


def render_per_repo(modes: dict[str, dict]) -> str:
    lines: list[str] = []
    lines.append(
        "| Arm | Repo | v1 conf | v2-strict conf | v2-broad conf | v2-broad reg | v2-strict reg |"
    )
    lines.append("|---|---|---|---|---|---|---|")
    for arm in ("with_design_md", "shadcn_default", "raw_palette"):
        for i, r in enumerate(modes["v1"]["results"][arm]):
            name = r["name"]
            v1c = f"{r['conformance']:.1%}" if r["conformance"] is not None else "n/a"
            r_strict = modes["v2_strict"]["results"][arm][i]
            r_broad = modes["v2_broad"]["results"][arm][i]
            sc = (
                f"{r_strict['conformance']:.1%}"
                if r_strict["conformance"] is not None
                else "n/a"
            )
            bc = (
                f"{r_broad['conformance']:.1%}"
                if r_broad["conformance"] is not None
                else "n/a"
            )
            lines.append(
                f"| `{arm}` | {name} | {v1c} | {sc} | {bc} "
                f"| {modes['v2_broad']['registry_sizes'][name]} "
                f"| {modes['v2_strict']['registry_sizes'][name]} |"
            )
    return "\n".join(lines)


def render_markdown(date: str, modes: dict[str, dict]) -> str:
    lines: list[str] = []
    lines.append(f"# Atelier Phase 1 Benchmark v2 — {date}")
    lines.append("")
    lines.append("Pre-registered in `benchmarks/spec-v2.md`. Three-arm observational corpus,")
    lines.append("**three classifier modes** for sensitivity analysis: v1 (the original),")
    lines.append("v2-strict (DESIGN.md-only registry), v2-broad (DESIGN.md + tailwind.config + CSS vars).")
    lines.append("")
    lines.append("v2-broad is the **primary** gate per spec-v2 §Gate.")
    lines.append("")
    lines.append("## Arm conformances by classifier mode")
    lines.append("")
    lines.append(render_summary_table(modes))
    lines.append("")
    lines.append("## Gate evaluation")
    lines.append("")
    lines.append(render_gate_table(modes))
    lines.append("")
    p = modes["v2_broad"]["gates"]["primary"]
    s = modes["v2_broad"]["gates"]["secondary"]
    p_str = "PASS" if p["pass"] else "FAIL"
    s_str = "PASS" if s["pass"] else "FAIL"
    lines.append(f"**Primary gate (v2-broad, blocking)**: {p_str}.")
    lines.append(f"**Secondary gate (v2-broad, informational)**: {s_str}.")
    lines.append("")
    lines.append("Sensitivity check: v2-strict and v2-broad ")
    if modes["v2_strict"]["gates"]["primary"]["pass"] == modes["v2_broad"]["gates"]["primary"]["pass"]:
        lines.append("**agree** on the primary verdict — result is robust to registry breadth.")
    else:
        lines.append("**disagree** on the primary verdict — result is registry-dependent. Phase 2 generative study indicated.")
    lines.append("")
    lines.append("## Per-repo conformance across modes")
    lines.append("")
    lines.append(render_per_repo(modes))
    lines.append("")
    lines.append("Registry sizes show how many declared tokens were found in each repo. "
                 "Higher v2-broad registry typically means the repo declared its own token "
                 "vocabulary via tailwind.config or CSS variables. Higher v2-strict registry "
                 "means the repo has a populated DESIGN.md.")
    lines.append("")
    lines.append("## Caveats (inherited from v1)")
    lines.append("")
    lines.append("- Observational only; does not measure causality.")
    lines.append("- All repos owned by one developer (Alex). External validation requires fork-and-rerun.")
    lines.append("- Dropouts policy from spec.md; dropouts do not trigger arm rebalancing.")
    lines.append("")
    lines.append("## v2-specific caveats")
    lines.append("")
    lines.append("- The v2-broad registry includes CSS variables, which catches Tailwind v4 `@theme` blocks but also picks up unrelated `--*` properties (e.g. `--shadow-blur`). False inclusion inflates v2-broad registries; the bias is conservative — it credits more classes as TOKEN, narrowing the design.md vs others gap.")
    lines.append("- The strict-vs-broad sensitivity check is the reliability signal. If the two agree, the result is robust. If they disagree, the gate verdict depends on which CSS variables count as 'tokens', and the next test should be a generative study.")
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    here = Path(__file__).parent
    parser.add_argument(
        "--out-json", type=Path, default=here / "results" / "latest-v2.json"
    )
    parser.add_argument("--out-md", type=Path, default=here / "results" / "latest-v2.md")
    parser.add_argument("--date", default="latest")
    args = parser.parse_args(argv)

    modes: dict[str, dict] = {}
    for mode in CLASSIFIER_MODES:
        results, summary, gates, registry_sizes = run_mode(mode)
        modes[mode] = {
            "results": results,
            "summary": summary,
            "gates": gates,
            "registry_sizes": registry_sizes,
        }

    args.out_json.parent.mkdir(parents=True, exist_ok=True)
    args.out_json.write_text(json.dumps({"date": args.date, "modes": modes}, indent=2))
    args.out_md.write_text(render_markdown(args.date, modes))

    print("\nGate v1 primary:        ", "PASS" if modes["v1"]["gates"]["primary"]["pass"] else "FAIL", file=sys.stderr)
    print("Gate v2-strict primary: ", "PASS" if modes["v2_strict"]["gates"]["primary"]["pass"] else "FAIL", file=sys.stderr)
    print("Gate v2-broad primary:  ", "PASS" if modes["v2_broad"]["gates"]["primary"]["pass"] else "FAIL", file=sys.stderr)
    return 0 if modes["v2_broad"]["gates"]["primary"]["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
