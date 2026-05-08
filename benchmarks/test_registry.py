"""Tests for benchmarks.registry — per-repo token registry extraction."""
from __future__ import annotations

from pathlib import Path

import pytest

from benchmarks.registry import (
    build_registry,
    extract_css_var_tokens,
    extract_design_md_tokens,
    extract_tailwind_config_tokens,
)


def test_design_md_tokens_extracted_from_frontmatter(tmp_path: Path) -> None:
    (tmp_path / "DESIGN.md").write_text(
        '---\n'
        'colors:\n'
        '  background: "#0A0A0A"\n'
        '  foreground: "#FFFFFF"\n'
        '  pf-primary: "#F47B20"\n'
        '---\n\n'
        '# Project\n'
    )
    tokens = extract_design_md_tokens(tmp_path)
    assert tokens == {"background", "foreground", "pf-primary"}


def test_design_md_tokens_at_subdir(tmp_path: Path) -> None:
    sub = tmp_path / "app"
    sub.mkdir()
    (sub / "DESIGN.md").write_text(
        '---\ncolors:\n  brand: "#000"\n---\n'
    )
    tokens = extract_design_md_tokens(tmp_path)
    assert "brand" in tokens


def test_design_md_tokens_empty_when_no_design_md(tmp_path: Path) -> None:
    assert extract_design_md_tokens(tmp_path) == set()


def test_design_md_tokens_robust_to_malformed_yaml(tmp_path: Path) -> None:
    (tmp_path / "DESIGN.md").write_text(
        '---\ncolors: not a dict at all\n---\n'
    )
    assert extract_design_md_tokens(tmp_path) == set()


def test_tailwind_config_tokens_extracted(tmp_path: Path) -> None:
    (tmp_path / "tailwind.config.js").write_text(
        '/** @type {import("tailwindcss").Config} */\n'
        'module.exports = {\n'
        '  theme: {\n'
        '    extend: {\n'
        '      colors: {\n'
        '        card: "hsl(var(--card))",\n'
        '        "card-foreground": "hsl(var(--card-foreground))",\n'
        '        primary: { DEFAULT: "hsl(var(--primary))" },\n'
        '      },\n'
        '    },\n'
        '  },\n'
        '};\n'
    )
    tokens = extract_tailwind_config_tokens(tmp_path)
    assert "card" in tokens
    assert "card-foreground" in tokens
    assert "primary" in tokens


def test_tailwind_config_tokens_skip_palette_names(tmp_path: Path) -> None:
    (tmp_path / "tailwind.config.ts").write_text(
        'export default {\n'
        '  theme: {\n'
        '    extend: {\n'
        '      colors: {\n'
        '        zinc: { 950: "#0A0A0A" },\n'  # palette extension — must NOT be in registry
        '        custom: "#FF0000",\n'
        '      },\n'
        '    },\n'
        '  },\n'
        '};\n'
    )
    tokens = extract_tailwind_config_tokens(tmp_path)
    assert "zinc" not in tokens
    assert "custom" in tokens


def test_tailwind_config_nested_colors_emit_composed_names(tmp_path: Path) -> None:
    """The advisory-board case: `colors.surface.{DEFAULT,card,elevated,border}`
    must emit `surface`, `surface-card`, `surface-elevated`, `surface-border`."""
    (tmp_path / "tailwind.config.ts").write_text(
        'import type { Config } from "tailwindcss";\n'
        'const config: Config = {\n'
        '  theme: {\n'
        '    extend: {\n'
        '      colors: {\n'
        '        surface: {\n'
        '          DEFAULT: "rgb(var(--background))",\n'
        '          card: "rgb(var(--surface-card))",\n'
        '          elevated: "rgb(var(--surface-elevated))",\n'
        '          border: "rgb(var(--border))",\n'
        '        },\n'
        '        primary: {\n'
        '          DEFAULT: "rgb(var(--primary))",\n'
        '          hover: "rgb(var(--primary-hover))",\n'
        '        },\n'
        '      },\n'
        '    },\n'
        '  },\n'
        '};\n'
        'export default config;\n'
    )
    tokens = extract_tailwind_config_tokens(tmp_path)
    # Top-level (DEFAULT-bearing) names
    assert "surface" in tokens
    assert "primary" in tokens
    # Composed sub-names that Tailwind generates
    assert "surface-card" in tokens
    assert "surface-elevated" in tokens
    assert "surface-border" in tokens
    assert "primary-hover" in tokens
    # The literal `DEFAULT` key must NOT leak out
    assert "DEFAULT" not in tokens
    assert "surface-DEFAULT" not in tokens


def test_tailwind_config_deeply_nested_colors(tmp_path: Path) -> None:
    """Two-level nesting: `colors.domain.market.{DEFAULT,muted}` →
    `domain-market`, `domain-market-muted`."""
    (tmp_path / "tailwind.config.js").write_text(
        'module.exports = {\n'
        '  theme: { extend: { colors: {\n'
        '    domain: {\n'
        '      market: { DEFAULT: "#3b82f6", muted: "#3b82f620" },\n'
        '      tech: { DEFAULT: "#8b5cf6" },\n'
        '    },\n'
        '  } } }\n'
        '};\n'
    )
    tokens = extract_tailwind_config_tokens(tmp_path)
    assert "domain" not in tokens  # `domain` itself has no DEFAULT leaf
    assert "domain-market" in tokens
    assert "domain-market-muted" in tokens
    assert "domain-tech" in tokens


def test_tailwind_config_skips_node_modules(tmp_path: Path) -> None:
    nm = tmp_path / "node_modules" / "some-pkg"
    nm.mkdir(parents=True)
    (nm / "tailwind.config.js").write_text(
        'module.exports = { theme: { colors: { fake: "#000" } } };'
    )
    tokens = extract_tailwind_config_tokens(tmp_path)
    assert "fake" not in tokens


def test_css_var_tokens_extracted(tmp_path: Path) -> None:
    (tmp_path / "globals.css").write_text(
        ':root {\n'
        '  --background: 0 0% 100%;\n'
        '  --foreground: 240 10% 3.9%;\n'
        '  --primary-foreground: 0 0% 98%;\n'
        '}\n'
    )
    tokens = extract_css_var_tokens(tmp_path)
    assert "background" in tokens
    assert "foreground" in tokens
    assert "primary-foreground" in tokens


def test_css_var_tokens_handle_tailwind_v4_at_theme(tmp_path: Path) -> None:
    (tmp_path / "app.css").write_text(
        '@theme {\n'
        '  --color-card: oklch(0.2 0 0);\n'
        '  --color-surface: oklch(0.18 0 0);\n'
        '}\n'
    )
    tokens = extract_css_var_tokens(tmp_path)
    assert "color-card" in tokens
    assert "color-surface" in tokens


def test_build_registry_unions_all_sources(tmp_path: Path) -> None:
    (tmp_path / "DESIGN.md").write_text(
        '---\ncolors:\n  pf-primary: "#F00"\n---\n'
    )
    (tmp_path / "tailwind.config.js").write_text(
        'module.exports = { theme: { extend: { colors: { card: "#000" } } } };'
    )
    (tmp_path / "globals.css").write_text(':root { --surface: #111; }\n')
    registry = build_registry(tmp_path)
    assert {"pf-primary", "card", "surface"} <= registry


def test_build_registry_strict_only_design_md(tmp_path: Path) -> None:
    (tmp_path / "DESIGN.md").write_text(
        '---\ncolors:\n  pf-primary: "#F00"\n---\n'
    )
    (tmp_path / "tailwind.config.js").write_text(
        'module.exports = { theme: { extend: { colors: { card: "#000" } } } };'
    )
    registry = build_registry(tmp_path, sources=("design_md",))
    assert registry == {"pf-primary"}
    assert "card" not in registry
