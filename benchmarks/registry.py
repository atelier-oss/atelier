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

# Locator for the `colors` keyword in tailwind.config files. Used as a seed
# point; the actual block extraction is brace-balanced via _balanced_block,
# which handles arbitrary nesting depth (a regex can't reliably do this).
_TW_COLORS_KEY_RE = re.compile(r"\bcolors\s*:\s*\{")
# Identifier-or-quoted-key followed by `:` — we only emit matches at brace
# depth 1 (top level inside the colors block) via _top_level_keys, so this
# regex doesn't need a line anchor.
_TW_KEY_RE = re.compile(
    r"""['"]?([A-Za-z][A-Za-z0-9_-]*)['"]?\s*:""",
)


def _balanced_block(text: str, start: int) -> tuple[int, int] | None:
    """Find the balanced `{...}` starting at index `start` (which must be `{`).

    Returns (start, end_exclusive) where text[start:end_exclusive] is the
    full block including outer braces. Returns None if unbalanced.
    Tracks string literals so braces inside strings are ignored.
    """
    if start >= len(text) or text[start] != "{":
        return None
    depth = 0
    in_string: str | None = None
    i = start
    n = len(text)
    while i < n:
        ch = text[i]
        if in_string is not None:
            if ch == "\\" and i + 1 < n:
                i += 2
                continue
            if ch == in_string:
                in_string = None
            i += 1
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
            if depth == 0:
                return (start, i)
            continue
        i += 1
    return None


def _walk_colors_block(block: str, prefix: str = "") -> list[str]:
    """Recursively walk a tailwind colors block and emit Tailwind-class names.

    For a block like `{ surface: { DEFAULT: "...", card: "...", border: "..." } }`,
    Tailwind generates classes for `surface` (from DEFAULT), `surface-card`, and
    `surface-border`. This function emits exactly those composed names.

    Rules:
    - A leaf key with a string/template value contributes prefix-key (or just
      key if prefix is empty).
    - A nested object with a `DEFAULT` key contributes prefix-key (the parent),
      AND recurses into the nested object with `prefix=prefix-key`.
    - A nested object without DEFAULT just recurses with the new prefix.
    - The literal name `DEFAULT` never appears in emitted names — Tailwind
      treats it as the unsuffixed name of the parent.
    """
    if not block.startswith("{") or not block.endswith("}"):
        return []
    names: list[str] = []
    inner = block[1:-1]
    depth = 0
    in_string: str | None = None
    i = 0
    n = len(inner)
    while i < n:
        ch = inner[i]
        if in_string is not None:
            if ch == "\\" and i + 1 < n:
                i += 2
                continue
            if ch == in_string:
                in_string = None
            i += 1
            continue
        if depth == 0:
            m = _TW_KEY_RE.match(inner, i)
            if m:
                key = m.group(1)
                # Skip past the key + colon to find the value start.
                j = m.end()
                # Skip whitespace
                while j < n and inner[j] in " \t\n\r":
                    j += 1
                if j >= n:
                    break
                if inner[j] == "{":
                    # Nested object — find balanced block, recurse.
                    block_span = _balanced_block(inner, j)
                    if block_span is None:
                        i = j + 1
                        continue
                    sub_block = inner[block_span[0] : block_span[1]]
                    composed = f"{prefix}-{key}" if prefix else key
                    # If the nested object has DEFAULT as a leaf, the composed
                    # name itself is also a Tailwind class (the parent name
                    # without suffix).
                    if _has_default_leaf(sub_block):
                        names.append(composed)
                    # Recurse for sub-keys (DEFAULT is filtered inside the recurse).
                    for child in _walk_colors_block(sub_block, prefix=composed):
                        if child.endswith("-DEFAULT"):
                            continue
                        if child == "DEFAULT":
                            continue
                        names.append(child)
                    i = block_span[1]
                    continue
                else:
                    # Leaf value (string/template/expression). Walk to next
                    # comma at depth 0.
                    composed = f"{prefix}-{key}" if prefix else key
                    if key != "DEFAULT":
                        names.append(composed)
                    i = j
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
    return names


def _has_default_leaf(block: str) -> bool:
    """Quick check: does the immediate body of `block` contain a `DEFAULT:` key
    at the top level (not nested deeper)?"""
    if not block.startswith("{") or not block.endswith("}"):
        return False
    inner = block[1:-1]
    depth = 0
    in_string: str | None = None
    i = 0
    n = len(inner)
    while i < n:
        ch = inner[i]
        if in_string is not None:
            if ch == "\\" and i + 1 < n:
                i += 2
                continue
            if ch == in_string:
                in_string = None
            i += 1
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
        if depth == 0 and inner[i:i + 7] == "DEFAULT" and (
            i + 7 >= n or not (inner[i + 7].isalnum() or inner[i + 7] == "_")
        ):
            # Look ahead for `:` after possible whitespace
            j = i + 7
            while j < n and inner[j] in " \t\n\r":
                j += 1
            if j < n and inner[j] == ":":
                return True
        i += 1
    return False

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
    """Color names from tailwind.config.{js,ts,cjs,mjs} — including composed
    names from nested objects (Tailwind generates `bg-surface-card` from
    `colors.surface.card`).

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
            for key_m in _TW_COLORS_KEY_RE.finditer(text):
                # `_TW_COLORS_KEY_RE` matches up to the opening `{` — find it.
                brace_idx = text.index("{", key_m.start())
                block_span = _balanced_block(text, brace_idx)
                if block_span is None:
                    continue
                block = text[block_span[0] : block_span[1]]
                for name in _walk_colors_block(block):
                    # Drop palette-name top-level keys (e.g. extending zinc).
                    # Composed names like `surface-card` are kept — they
                    # don't start with a palette name.
                    if name in TAILWIND_PALETTE_NAMES:
                        continue
                    tokens.add(name)
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
