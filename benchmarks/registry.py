"""Per-repo token registry extraction for spec-v2 strict classification.

A token registry is the set of named tokens a project has explicitly declared.
The v2 classifier uses it to require explicit registry membership before
crediting a class as TOKEN — this closes the v1 leak where any non-Tailwind
prefix scored as TOKEN even without a token contract.

Three sources, unioned for v2-broad, only first for v2-strict:

  1. DESIGN.md frontmatter `colors:` block (root or depth-1)
  2. tailwind.config.{js,ts,cjs,mjs} `theme.colors` / `theme.extend.colors` keys,
     excluding Tailwind's own palette names
  3. Project CSS custom properties (`--*`) in `.css` / `.scss` / `.postcss`,
     excluding node_modules — covers both classic `:root` and Tailwind v4
     `@theme` blocks.

All extractors return a `set[str]` of token names. Caller may union sources
or take only the strict source.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Iterable

import yaml


TAILWIND_PALETTE_NAMES = frozenset(
    {
        "slate", "gray", "zinc", "neutral", "stone",
        "red", "orange", "amber", "yellow", "lime", "green",
        "emerald", "teal", "cyan", "sky", "blue", "indigo",
        "violet", "purple", "fuchsia", "pink", "rose",
    }
)

EXCLUDE_DIRS = frozenset({"node_modules", ".next", "dist", "build", ".turbo", ".cache", "_archive"})

_FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---", re.DOTALL)

# Match `colors:` blocks in tailwind.config files. Tolerant of the common
# shapes we see in real configs:
#   theme: { extend: { colors: { ... } } }
#   theme: { colors: { ... } }
#   colors: { ... }
# The `\{[^{}]*?(?:\{[^{}]*?\}[^{}]*?)*?\}` pattern handles one level of
# nesting (e.g. `card: { DEFAULT: "..." }`).
_TW_COLORS_BLOCK_RE = re.compile(
    r"colors\s*:\s*(\{[^{}]*?(?:\{[^{}]*?\}[^{}]*?)*?\})",
    re.DOTALL,
)
# Identifier-or-quoted-key followed by `:` — we only emit matches at brace
# depth 1 (top level inside the colors block) via _top_level_keys, so this
# regex doesn't need a line anchor.
_TW_KEY_RE = re.compile(
    r"""['"]?([A-Za-z][A-Za-z0-9_-]*)['"]?\s*:""",
)


def _top_level_keys(block: str) -> list[str]:
    """Return keys declared at brace depth 1 inside a `{ ... }` block.

    The block is assumed to start with `{` and end with `}`. The parser
    tracks brace depth and inside-string state so a nested object like
    `card: { DEFAULT: "..." }` contributes only `card`, not `DEFAULT`.
    """
    if not block.startswith("{") or not block.endswith("}"):
        return []
    keys: list[str] = []
    depth = 0
    i = 0
    in_string: str | None = None  # "'" / '"' / "`" when inside a string literal
    n = len(block)
    while i < n:
        ch = block[i]
        if in_string is not None:
            if ch == "\\" and i + 1 < n:
                i += 2
                continue
            if ch == in_string:
                in_string = None
            i += 1
            continue
        # At depth 1, prefer matching a key BEFORE treating a leading quote
        # as the start of a value-string — keys can themselves be quoted.
        if depth == 1:
            m = _TW_KEY_RE.match(block, i)
            if m:
                keys.append(m.group(1))
                i = m.end()
                continue
        if ch in ("'", '"', "`"):
            in_string = ch
            i += 1
            continue
        if ch == "{":
            depth += 1
            i += 1
            continue
        if ch == "}":
            depth -= 1
            i += 1
            continue
        i += 1
    return keys

# CSS custom property declarations — covers `:root { --x: ... }` and
# Tailwind v4 `@theme { --color-x: ... }` blocks. Captures the part after
# the leading `--`.
_CSS_VAR_RE = re.compile(r"--([A-Za-z][A-Za-z0-9_-]*)\s*:")


def _safe_read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def _excluded(path: Path) -> bool:
    return bool(set(path.parts) & EXCLUDE_DIRS)


def extract_design_md_tokens(repo: Path) -> set[str]:
    """Tokens declared in DESIGN.md `colors:` frontmatter (root or depth-1)."""
    if not repo.exists():
        return set()
    candidates: list[Path] = []
    root_design = repo / "DESIGN.md"
    if root_design.exists():
        candidates.append(root_design)
    # depth-1 subdirs only (matches spec-v2 §registry sources)
    for entry in repo.iterdir():
        if entry.is_dir() and not _excluded(entry):
            sub_design = entry / "DESIGN.md"
            if sub_design.exists():
                candidates.append(sub_design)

    tokens: set[str] = set()
    for design in candidates:
        text = _safe_read(design)
        m = _FRONTMATTER_RE.match(text)
        if not m:
            continue
        try:
            data = yaml.safe_load(m.group(1))
        except yaml.YAMLError:
            continue
        if not isinstance(data, dict):
            continue
        colors = data.get("colors")
        if isinstance(colors, dict):
            tokens.update(str(k) for k in colors.keys())
    return tokens


def extract_tailwind_config_tokens(repo: Path) -> set[str]:
    """Top-level color keys from tailwind.config.{js,ts,cjs,mjs}.

    Excludes Tailwind's built-in palette names so an `extend.colors.zinc`
    section (a palette extension, not a custom token) doesn't leak in.
    """
    if not repo.exists():
        return set()
    tokens: set[str] = set()
    for ext in ("js", "ts", "cjs", "mjs"):
        for cfg in repo.rglob(f"tailwind.config.{ext}"):
            if _excluded(cfg):
                continue
            text = _safe_read(cfg)
            for body_m in _TW_COLORS_BLOCK_RE.finditer(text):
                body = body_m.group(1)
                for key in _top_level_keys(body):
                    if key not in TAILWIND_PALETTE_NAMES:
                        tokens.add(key)
    return tokens


def extract_css_var_tokens(repo: Path) -> set[str]:
    """Project-declared CSS custom properties — captures `--name` (without leading `--`)."""
    if not repo.exists():
        return set()
    tokens: set[str] = set()
    for ext in ("css", "scss", "postcss"):
        for stylesheet in repo.rglob(f"*.{ext}"):
            if _excluded(stylesheet):
                continue
            text = _safe_read(stylesheet)
            tokens.update(_CSS_VAR_RE.findall(text))
    return tokens


def build_registry(
    repo: Path,
    sources: Iterable[str] = ("design_md", "tailwind_config", "css_vars"),
) -> set[str]:
    """Union of token names from selected sources. v2-broad uses all three;
    v2-strict uses only `design_md`."""
    sources = set(sources)
    registry: set[str] = set()
    if "design_md" in sources:
        registry |= extract_design_md_tokens(repo)
    if "tailwind_config" in sources:
        registry |= extract_tailwind_config_tokens(repo)
    if "css_vars" in sources:
        registry |= extract_css_var_tokens(repo)
    return registry
