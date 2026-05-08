# @atelier/cli

## 0.1.0

### Minor Changes

- 9807c41: Initial 0.1.0 release of the Atelier monorepo. Six packages ship together:

  - `@atelier/cli` — bin: atelier (init / lint / classify / audit / atlas)
  - `@atelier/lint` — wraps `@google/design.md@0.1.1` (Apache-2.0) with the precedence rule (`explicit > atlas > palette`) and the canonical 8-role sub-token vocabulary
  - `@atelier/classify` — token-vs-raw conformance scorer; 60-case parity fixture vs the Python reference
  - `@atelier/atlas` — 7 build-category fingerprinter with shards
  - `@atelier/audit` — 6-section project audit (TS port of audit_home_dashboard.py; Python parity 23 = 23)
  - `@atelier/mcp-server` — MCP stdio server exposing the above as four tools

  Spec: `spec/DESIGN.md.spec.md`. Phase 1 MVB result: +105.1% relative lift in DESIGN.md repos vs control. Public npm publish gated on the 30-repo Phase 1 expansion.

### Patch Changes

- Updated dependencies [9807c41]
  - @atelier/lint@0.1.0
  - @atelier/classify@0.1.0
  - @atelier/atlas@0.1.0
  - @atelier/audit@0.1.0
