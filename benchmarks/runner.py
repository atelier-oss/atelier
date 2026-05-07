"""Atelier MVB runner — observational token-conformance benchmark.

Walks the corpus, scores each repo, emits JSON + markdown. Kept-alive smoke
test for the DESIGN.md hypothesis. Phase 1 expansion to 30 repos lives at
~/Projects/design-library; this is the in-tree version vendored alongside
benchmarks/score.py so anyone can re-run the MVB from a clean checkout.

Usage:
    python3 -m benchmarks.runner [--out-json results.json] [--out-md results.md]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from benchmarks.score import score_text


CORPUS = {
    "with_design_md": [
        "/Users/alexhale/Projects/koho/consult-ops",
        "/Users/alexhale/Projects/eight12-run-club-website",
        "/Users/alexhale/Projects/advisory-board",
        "/Users/alexhale/Projects/prettyfly-os",
    ],
    "control": [
        "/Users/alexhale/Projects/sportsbook-edge",
        "/Users/alexhale/Projects/rainman",
        "/Users/alexhale/Projects/intent-graph",
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


def find_source_files(repo: Path) -> list[Path]:
    files: list[Path] = []
    for ext in EXTENSIONS:
        for f in repo.rglob(f"*{ext}"):
            if set(f.parts) & EXCLUDE_PARTS:
                continue
            name = f.name.lower()
            if ".test." in name or ".spec." in name or ".d.ts" in name:
                continue
            files.append(f)
    return files


def score_repo(repo: Path) -> dict:
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
    return {
        "repo": str(repo),
        "name": repo.name,
        "files_scanned": len(files),
        "files_with_signal": signal_files,
        "tokens": tokens,
        "raw": raw,
        "conformance": (tokens / total) if total else None,
    }


def aggregate(group: list[dict]) -> dict:
    ts = sum(r["tokens"] for r in group)
    rs = sum(r["raw"] for r in group)
    return {
        "tokens": ts,
        "raw": rs,
        "conformance": ts / (ts + rs) if (ts + rs) else None,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    here = Path(__file__).parent
    parser.add_argument("--out-json", type=Path, default=here / "results" / "latest.json")
    parser.add_argument("--out-md", type=Path, default=here / "results" / "latest.md")
    parser.add_argument("--date", default="latest")
    args = parser.parse_args(argv)

    results: dict[str, list[dict]] = {"with_design_md": [], "control": []}
    for group, repos in CORPUS.items():
        for path in repos:
            r = score_repo(Path(path))
            results[group].append(r)
            conf = r["conformance"] or 0
            print(
                f"  {group}/{r['name']:30s}  files={r['files_with_signal']:4d}/{r['files_scanned']:5d}  tok={r['tokens']:5d} raw={r['raw']:5d} conf={conf:6.1%}",
                file=sys.stderr,
            )

    summary = {
        "with_design_md": aggregate(results["with_design_md"]),
        "control": aggregate(results["control"]),
    }
    args.out_json.parent.mkdir(parents=True, exist_ok=True)
    args.out_json.write_text(
        json.dumps({"date": args.date, "results": results, "summary": summary}, indent=2)
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
