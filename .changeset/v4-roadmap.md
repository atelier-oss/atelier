---
---

Tailwind v4 support is a v0.2.0 milestone. v0.1.0 (when it ships) targets
Tailwind v3 only — `@theme` blocks and the `oklch()` palette aren't yet
recognized by `@atelier/classify`. The token vs. raw classifier needs
additions for:

  - `@theme` block parsing in `@atelier/lint` (treat declared theme variables
    as TOKEN regardless of name shape).
  - `oklch()` / `lab()` / `lch()` color literals in
    `benchmarks/score.py` :: `extract_inline_colors` (currently catches
    `#hex`, `rgb()`, `rgba()`, `hsl()`, `hsla()`).
  - A v4 fixture row in `benchmarks/fixtures/classify-parity.yaml` to keep
    the Python ↔ TS parity oracle honest.

This file is intentionally version-bump-free — it documents the v4 plan
without forcing a release. When the v4 work begins, replace this with a
real changeset entry.
