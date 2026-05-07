"""Token-conformance scorer (Atelier Phase 1 benchmark MVB).

Measures how often a codebase references semantic design tokens vs raw
Tailwind palette values or inline hex/rgb/hsl literals. The hypothesis under
test: repos that adopt a `DESIGN.md` token contract show a meaningfully higher
token-reference ratio than control repos, because AI agents and humans both
have a named handle to grab when generating UI.

Surface:
    classify_class(cls) -> Verdict | None
    extract_inline_colors(text) -> list[str]
    extract_tailwind_classes(text) -> list[str]
    score_text(text) -> ScoreResult
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class Verdict(Enum):
    TOKEN = "token"
    RAW = "raw"


TAILWIND_PALETTES = frozenset({
    "slate", "gray", "zinc", "neutral", "stone",
    "red", "orange", "amber", "yellow", "lime", "green",
    "emerald", "teal", "cyan", "sky", "blue", "indigo",
    "violet", "purple", "fuchsia", "pink", "rose",
})

COLOR_PREFIXES = frozenset({
    "text", "bg", "border", "ring", "fill", "stroke",
    "outline", "divide", "placeholder", "caret",
    "accent", "from", "to", "via", "shadow", "decoration",
})

# Same-prefix utility values that read as a color but bypass the design layer
# in either direction — we exclude them rather than count them either way.
UTILITY_COLOR_VALUES = frozenset({
    "white", "black", "transparent", "current", "inherit", "none",
})

# Same-prefix values that aren't colors at all (sizes, alignment, weights,
# stroke styles). They share the prefix but carry no design-token signal.
NON_COLOR_VALUES = frozenset({
    "xs", "sm", "base", "md", "lg", "xl",
    "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl",
    "left", "right", "center", "justify", "start", "end",
    "thin", "extralight", "light", "normal", "medium",
    "semibold", "bold", "extrabold",
    "tighter", "tight", "wide", "wider", "widest",
    "solid", "dashed", "dotted", "double", "hidden",
    "auto", "visible", "inset", "inside", "outside",
})

_HEX_RE = re.compile(r"#[0-9a-fA-F]{3,8}\b")
_RGBA_RE = re.compile(r"rgba?\([^)]+\)")
_HSLA_RE = re.compile(r"hsla?\([^)]+\)")
_CLASS_ATTR_RE = re.compile(r"""(?:className|class)\s*=\s*["'`]([^"'`]+)["'`]""")
_TEMPLATE_LITERAL_RE = re.compile(r"`([^`]+)`")
_QUOTED_STRING_RE = re.compile(r"""["']([^"']+)["']""")


@dataclass
class ScoreResult:
    tokens: int
    raw: int

    @property
    def conformance(self) -> Optional[float]:
        total = self.tokens + self.raw
        if total == 0:
            return None
        return self.tokens / total


def classify_class(cls: str) -> Optional[Verdict]:
    """Classify a single Tailwind class string. None when not a color signal."""
    if not cls or "-" not in cls:
        return None

    prefix, _, value = cls.partition("-")
    if prefix not in COLOR_PREFIXES or not value:
        return None

    # Arbitrary value: prefix-[...]. CSS-var refs read as semantic tokens;
    # hex / rgb / hsl literals read as raw.
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1]
        if "var(" in inner:
            return Verdict.TOKEN
        if _HEX_RE.search(inner) or _RGBA_RE.search(inner) or _HSLA_RE.search(inner):
            return Verdict.RAW
        return None  # arbitrary non-color value (e.g. text-[length:14px])

    # Strip opacity modifier (e.g. bg-zinc-800/50 -> bg-zinc-800)
    base = value.split("/", 1)[0]

    first = base.split("-", 1)[0]

    if first in UTILITY_COLOR_VALUES or first in NON_COLOR_VALUES:
        return None
    if first in TAILWIND_PALETTES:
        return Verdict.RAW
    if first.isdigit():
        return None  # border-0, ring-2

    return Verdict.TOKEN


def extract_inline_colors(text: str) -> list[str]:
    """Find inline #hex, rgb(), rgba(), hsl(), hsla() references."""
    out: list[str] = []
    out.extend(_HEX_RE.findall(text))
    out.extend(_RGBA_RE.findall(text))
    out.extend(_HSLA_RE.findall(text))
    return out


def extract_tailwind_classes(text: str) -> list[str]:
    """Extract candidate Tailwind classes from className attrs and template literals.

    Template literals also get quoted-substring extraction so classes nested
    inside ``${cond && "bg-zinc-900"}`` interpolations are caught.
    """
    classes: list[str] = []
    for body in _CLASS_ATTR_RE.findall(text):
        classes.extend(body.split())
    for body in _TEMPLATE_LITERAL_RE.findall(text):
        classes.extend(body.split())
        for inner in _QUOTED_STRING_RE.findall(body):
            classes.extend(inner.split())
    return classes


def score_text(text: str) -> ScoreResult:
    """Score a code snippet for token-vs-raw conformance."""
    tokens = 0
    raw = 0
    for cls in extract_tailwind_classes(text):
        v = classify_class(cls)
        if v is Verdict.TOKEN:
            tokens += 1
        elif v is Verdict.RAW:
            raw += 1
    raw += len(extract_inline_colors(text))
    return ScoreResult(tokens=tokens, raw=raw)
