#!/usr/bin/env python3
"""Audit the PrettyFly OS home dashboard for Atelier dogfood."""

from __future__ import annotations

import argparse
import json
import os
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_ROOT = Path("/Users/alexhale/Projects/prettyfly-os")
TARGETS = [
    "app/page.tsx",
    "components/home/command-center",
    "app/globals.css",
    "DESIGN.md",
]
HEX_RE = re.compile(r"#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsl\([^)]+\)")


def rel_luminance(rgb: tuple[int, int, int]) -> float:
    parts = []
    for channel in rgb:
        value = channel / 255
        parts.append(value / 12.92 if value <= 0.03928 else ((value + 0.055) / 1.055) ** 2.4)
    return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2]


def contrast_ratio(
    foreground: tuple[int, int, int],
    background: tuple[int, int, int],
) -> float:
    fg = rel_luminance(foreground)
    bg = rel_luminance(background)
    lighter = max(fg, bg)
    darker = min(fg, bg)
    return (lighter + 0.05) / (darker + 0.05)


def rel(path: Path, root: Path) -> str:
    return str(path.relative_to(root))


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def inline_color_findings(root: Path) -> list[str]:
    findings: list[str] = []
    for path in sorted((root / "components/home/command-center").glob("*.tsx")):
        for line_no, line in enumerate(read(path).splitlines(), start=1):
            matches = HEX_RE.findall(line)
            if not matches:
                continue
            allowed = "radial-gradient" in line or "shadow-[" in line
            if allowed:
                findings.append(
                    f"- `{rel(path, root)}:{line_no}` uses custom visual-effect color `{matches[0]}`; acceptable for the orb effect, but should become a token if reused."
                )
            else:
                findings.append(
                    f"- `{rel(path, root)}:{line_no}` uses inline color `{matches[0]}`; replace with an existing DESIGN.md token."
                )
    return findings


def motion_findings(root: Path) -> list[str]:
    command_sphere = read(root / "components/home/command-center/CommandSphere.tsx")
    findings: list[str] = []
    if "useReducedMotion" not in command_sphere:
        findings.append("- `CommandSphere` does not gate animation with `useReducedMotion()`.")
    if "motion-reduce:animate-none" not in command_sphere:
        findings.append("- `CommandSphere` lacks a Tailwind `motion-reduce` fallback.")
    return findings


def contrast_findings(root: Path) -> list[str]:
    findings: list[str] = []
    # CommandCenter scopes `.dark`; these tuples mirror app/globals.css dark
    # shadcn values converted to RGB for deterministic audit output.
    dark_card = (24, 24, 27)  # hsl(240 6% 10%)
    samples = {
        "text-foreground on command-center cards": (244, 244, 245),
        "text-muted-foreground on command-center cards": (113, 113, 122),
        "text-primary on command-center cards": (244, 116, 31),
        "text-[hsl(195,72%,55%)] on command-center cards": (58, 182, 223),
        "text-[hsl(195,72%,38%)] on command-center cards": (27, 132, 167),
        "text-[hsl(24,91%,60%)] on command-center cards": (246, 134, 60),
        "text-emerald-400 on command-center cards": (52, 211, 153),
        "text-red-400 on command-center cards": (248, 113, 113),
    }
    for label, rgb in samples.items():
        ratio = contrast_ratio(rgb, dark_card)
        if ratio < 4.5:
            findings.append(
                f"- `{label}` is {ratio:.2f}:1 against the dark card surface; raise it to AA for t-caption/text-xs copy."
            )
    if "text-muted-foreground" in read(root / "components/home/command-center/TelemetryStream.tsx"):
        ratio = contrast_ratio(samples["text-muted-foreground on command-center cards"], dark_card)
        if ratio < 4.5:
            findings.append(
                "- Telemetry timestamps and empty state use `text-muted-foreground` at caption scale; pair the token fix with the telemetry row pass."
            )
    return findings


def accessibility_findings(root: Path) -> list[str]:
    findings: list[str] = []
    sphere = read(root / "components/home/command-center/CommandSphere.tsx")
    telemetry = read(root / "components/home/command-center/TelemetryStream.tsx")
    if "aria-label={`Open agents" not in sphere:
        findings.append("- Command sphere link needs an explicit agent-count aria label.")
    if "Awaiting incoming signal" in telemetry and "aria-live" not in telemetry:
        findings.append("- Telemetry stream empty/live state is not announced; add `aria-live=\"polite\"` if it becomes real-time.")
    return findings


def design_coverage_findings(root: Path) -> list[str]:
    design = read(root / "DESIGN.md")
    findings: list[str] = []
    for token in ["command-palette", "pulse-card"]:
        if token not in design:
            findings.append(f"- DESIGN.md does not mention `{token}`.")
    for component in ["CommandCenter", "CommandSphere", "TelemetryStream"]:
        if component not in design:
            findings.append(f"- DESIGN.md does not cover `{component}` yet.")
    return findings


def responsive_findings(root: Path) -> list[str]:
    center = read(root / "components/home/command-center/CommandCenter.tsx")
    findings: list[str] = []
    if "lg:grid-cols-[260px_1fr_260px]" not in center:
        findings.append("- CommandCenter no longer has a fixed side-column desktop grid; re-check wide layout.")
    if "grid-cols-1" not in center:
        findings.append("- CommandCenter is missing a single-column mobile fallback.")
    return findings


def collect_checks(root: Path) -> dict[str, list[str]]:
    return {
        "Token Usage": inline_color_findings(root),
        "Contrast": contrast_findings(root),
        "Motion": motion_findings(root),
        "Accessibility": accessibility_findings(root),
        "DESIGN.md Coverage": design_coverage_findings(root),
        "Responsive Layout": responsive_findings(root),
    }


def count_findings(checks: dict[str, list[str]]) -> int:
    return sum(len(findings) for findings in checks.values())


def event_payload(report_path: Path, finding_count: int) -> dict[str, Any]:
    return {
        "type": "SKILL_COMPLETED",
        "agent_slug": "atelier",
        "skill_slug": "design-audit",
        "surface": "pf_runtime",
        "cwd_project": "prettyfly-os",
        "data": {
            "target": "home-dashboard",
            "report_path": str(report_path),
            "finding_count": finding_count,
        },
    }


def build_report(
    root: Path,
    report_path: Path,
    checks: dict[str, list[str]] | None = None,
) -> str:
    checks = checks or collect_checks(root)
    payload = event_payload(report_path, count_findings(checks))
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    lines = [
        "# Atelier Home Dashboard Audit",
        "",
        f"Generated: `{generated}`",
        "",
        "Target: PrettyFly OS home dashboard (`app/page.tsx` + `components/home/command-center/*`).",
        "",
        "## Summary",
        "",
        "This is an audit-only dogfood run. It reads source files and writes this report; it does not mutate dashboard UI.",
        "",
        "## Findings",
        "",
    ]
    for section, findings in checks.items():
        lines.extend([f"### {section}", ""])
        if findings:
            lines.extend(findings)
        else:
            lines.append("- No findings.")
        lines.append("")
    lines.extend(
        [
            "## Recommended Next Step",
            "",
            "Use this report to select a narrow home-dashboard PR. Recommended first PR: add DESIGN.md coverage for `CommandCenter`, `CommandSphere`, and `TelemetryStream`, then tokenize any repeated command-center visual-effect colors.",
            "",
            "## PFOS Event Payload",
            "",
            "```json",
            json.dumps(payload, indent=2, sort_keys=True),
            "```",
            "",
        ]
    )
    return "\n".join(lines)


def emit_event(url: str, token: str, report_path: Path, finding_count: int) -> tuple[int, str]:
    body = event_payload(report_path, finding_count)
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:  # nosec B310
            return int(resp.status), resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        return int(exc.code), exc.read().decode("utf-8", errors="replace")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_ROOT / "docs" / "atelier-home-dashboard-audit.md",
    )
    parser.add_argument("--emit-url", default=os.environ.get("PFOS_AGENT_EVENT_URL"))
    parser.add_argument("--emit-token", default=os.environ.get("PFOS_AGENT_EVENT_TOKEN"))
    args = parser.parse_args()

    root = args.root.expanduser().resolve()
    missing = [target for target in TARGETS if not (root / target).exists()]
    if missing:
        raise SystemExit(f"missing audit targets: {', '.join(missing)}")

    checks = collect_checks(root)
    finding_count = count_findings(checks)
    report = build_report(root, args.out, checks)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(report, encoding="utf-8")

    if args.emit_url and args.emit_token:
        status, response = emit_event(args.emit_url, args.emit_token, args.out, finding_count)
        print(f"wrote {args.out}")
        print(f"emitted PFOS event: http={status} body={response[:200]}")
    else:
        print(f"wrote {args.out}")
        print("PFOS event not emitted: set PFOS_AGENT_EVENT_URL and PFOS_AGENT_EVENT_TOKEN")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
