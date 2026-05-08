"""Tests for spec-v2 strict classification (`classify_class_strict`, `score_text(..., registry=)`)."""
from __future__ import annotations

from benchmarks.score import (
    Verdict,
    classify_class,
    classify_class_strict,
    score_text,
)


def test_strict_token_demotes_to_raw_when_not_in_registry() -> None:
    # v1 would call this TOKEN — `card` is not a Tailwind palette name.
    # v2 strict demotes to RAW because `card` is not in the registry.
    assert classify_class("bg-card") is Verdict.TOKEN
    assert classify_class_strict("bg-card", set()) is Verdict.RAW


def test_strict_token_preserves_when_in_registry() -> None:
    assert classify_class_strict("bg-card", {"card"}) is Verdict.TOKEN


def test_strict_palette_still_raw() -> None:
    assert classify_class_strict("bg-zinc-800", {"zinc"}) is Verdict.RAW
    # Even if registry contained `zinc` (unusual), palette wins because v1 marks it RAW first.


def test_strict_handles_arbitrary_var_in_registry() -> None:
    # bg-[var(--card)] with `card` in registry → TOKEN
    assert classify_class_strict("bg-[var(--card)]", {"card"}) is Verdict.TOKEN
    # Same class with empty registry → RAW
    assert classify_class_strict("bg-[var(--card)]", set()) is Verdict.RAW


def test_strict_handles_arbitrary_var_with_fallback() -> None:
    assert classify_class_strict("bg-[var(--surface,#fff)]", {"surface"}) is Verdict.TOKEN


def test_strict_arbitrary_hex_still_raw() -> None:
    assert classify_class_strict("bg-[#FF0000]", {"FF0000"}) is Verdict.RAW


def test_strict_non_color_class_unchanged() -> None:
    # Size/alignment classes have no color signal — None in both modes.
    assert classify_class_strict("text-xs", set()) is None
    assert classify_class_strict("text-center", {"center"}) is None  # `center` is in NON_COLOR_VALUES


def test_strict_compound_token_matches_full_remainder() -> None:
    # Tailwind: `bg-card-foreground` is a single token named `card-foreground`,
    # not `card` with a suffix. The strict matcher checks the full remainder.
    assert classify_class_strict("bg-card-foreground", {"card-foreground"}) is Verdict.TOKEN
    assert classify_class_strict("bg-card-foreground", {"card"}) is Verdict.TOKEN  # prefix fallback
    assert classify_class_strict("bg-card-foreground", {"foreground"}) is Verdict.RAW
    # Single-word tokens — base is just the word.
    assert classify_class_strict("bg-card", {"card"}) is Verdict.TOKEN
    # Project-prefix style: registry has `pf-primary` (full key); class matches it.
    assert classify_class_strict("bg-pf-primary", {"pf-primary"}) is Verdict.TOKEN


def test_score_text_no_registry_matches_v1() -> None:
    text = '<div className="bg-card text-zinc-800 bg-foreground" />'
    v1 = score_text(text)
    assert v1.tokens == 2  # bg-card, bg-foreground
    assert v1.raw == 1  # text-zinc-800


def test_score_text_with_registry_demotes_unknown_tokens() -> None:
    text = '<div className="bg-card text-zinc-800 bg-foreground" />'
    # Only `card` is in registry — `foreground` is demoted to RAW.
    v2 = score_text(text, registry={"card"})
    assert v2.tokens == 1  # bg-card only
    assert v2.raw == 2  # text-zinc-800 + bg-foreground (demoted)


def test_score_text_with_full_registry_recovers_v1() -> None:
    text = '<div className="bg-card text-foreground bg-pf-primary" />'
    v1 = score_text(text)
    # Each token name must be in the registry (full names, not just prefixes).
    v2 = score_text(text, registry={"card", "foreground", "pf-primary"})
    assert v2.tokens == v1.tokens
    assert v2.raw == v1.raw
