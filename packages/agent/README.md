# @atelier-oss/agent

> The Atelier Design Agent — text brief in, token-conformant React+Tailwind out, conformance score reported.

## Status

**Phase 3a — Figma REST integration.**

Pass a Figma file URL or key. The agent fetches Variables + Styles + file metadata via the Figma REST API, infers role mappings (Figma variable name → atelier canonical role like `primary` / `background` / `foreground` / `muted`), and injects the role table into the system prompt. The model uses role tokens (`bg-primary`) instead of inlining hex (`#F47B20`) when the brief references colors the file declares.

```ts
const result = await agent.run({
  brief: 'pricing tier card using the brand orange CTA',
  figma: 'https://www.figma.com/file/ABC123/Acme-Brand',
  // figmaToken falls back to FIGMA_TOKEN env var
});
```

Notes:

- Requires a Figma personal access token. Set `FIGMA_TOKEN` env var or pass `figmaToken` on `AgentOptions`.
- The Variables API (`/v1/files/{key}/variables/local`) is **Enterprise-gated**. On non-Enterprise files the endpoint may 404; the adapter handles this gracefully (treats it as "no variables") so Styles and file metadata still load.
- Role inference uses keyword heuristics on variable names (`color/primary` → `primary`, `color/text-muted` → `muted`, etc.). Variables that don't match any role are listed under "unmapped" — the LLM still sees them.
- Iterate phase is unchanged: rewrite uses prior code as the reference, not the Figma context.

---

**Phase 2 — screenshot input + atlas fingerprint context** (shipped).

Phase 2 ships two capabilities on top of the Phase 1 closed-loop rewrite loop:

### Screenshot input via Claude vision

Pass a path to a PNG/JPEG/GIF/WEBP reference screenshot. The agent loads it as a base64 image content block and includes it in the initial generate call so the model can see the layout reference directly.

```ts
const result = await agent.run({
  brief: 'header nav with logo and CTA',
  screenshot: './screenshots/header-reference.png',
});
```

The image is passed on the initial generate call only. Rewrite iterations (the closed-loop) are pure-text — by that stage the prior code is the reference.

### Atlas fingerprint project context

Pass a `cwd` path to your project root. The agent fingerprints the project via `@atelier-oss/atlas`, resolves a build category (e.g. `saas-dashboard`, `marketing-landing`), and injects a token-preference preamble into the system prompt. This biases token choices toward the category's expected palette without overriding explicit token rules.

```ts
const result = await agent.run({
  brief: 'data table with sortable columns',
  cwd: process.cwd(), // e.g. resolves to 'saas-dashboard'
});
```

When atlas cannot resolve a category (null), the run proceeds without augmentation — graceful fallback, no error.

---

**Phase 1 — closed-loop iteration** (shipped, still active).

- `claude-sonnet-4-6` initial generate.
- `@atelier-oss/classify` scores token-vs-raw conformance.
- If score < threshold, the rewrite loop kicks in: feeds prior code + score back to model, asks for a token-only rewrite. Re-classify. Up to N iterations. Best emission seen wins.
- `Agent.run()` returns `{ code, scores, trace, cost, iterations }`.

Empirical findings from Phase 0 ([`eval/PHASE-0-FINDINGS.md`](./eval/PHASE-0-FINDINGS.md)) showed the failure mode: soft poetic color language ("warm coral", "dusty teal") tempts the model to inline `bg-amber-300` / `bg-teal-400` directly. The Phase 1 rewrite prompt explicitly maps color metaphors to canonical roles.

Not in this phase (all on the roadmap):

- No DESIGN.md emission to disk from atlas/Figma results (Phase 2.x / 3b)
- No Anthropic Figma Plugin MCP path — that ships as a Claude Code skill in Phase 5
- No generative benchmark v3 (Phase 4)
- No Claude Code skill bundle / MCP tool / CLI subcommand (Phase 5)

The full plan lives at `~/Projects/memory-vault/planning/2026-05-08-atelier-design-agent.md`.

## Phase 2 Gate

5 fresh repos with no `DESIGN.md`, screenshot ref provided → ≥ 75% conformance on first iteration. Fixture screenshots to be prepared separately; gate to be run via the eval harness.

## Programmatic use

```ts
import { Agent } from '@atelier-oss/agent';

// Text-only (Phase 0/1 compat):
const agent = new Agent();
const result = await agent.run({
  brief: 'pricing card with a warm coral primary CTA on a soft cream canvas',
});

// With screenshot reference (Phase 2):
const result2 = await agent.run({
  brief: 'pricing card',
  screenshot: './refs/pricing-ref.png',
});

// With atlas context (Phase 2):
const result3 = await agent.run({
  brief: 'data table with sortable columns',
  cwd: process.cwd(),
});

// With Figma file (Phase 3a):
const result4 = await agent.run({
  brief: 'pricing card using the brand orange CTA',
  figma: 'https://www.figma.com/file/ABC123/Acme-Brand',
});

// All four combined:
const result5 = await agent.run({
  brief: 'sidebar nav',
  screenshot: './refs/nav-ref.png',
  cwd: process.cwd(),
  figma: 'ABC123',
});

console.log(result.scores.classify);  // { tokens, raw, conformance }
console.log(result.code);              // [{ path, content }]
console.log(result.trace);             // ordered phase log (intake notes: screenshot, atlasCategory)
console.log(result.cost);              // { input_tokens, output_tokens, usd }
console.log(result.iterations);        // [{ n, conformance, raw, tokens, durationMs }]
```

## Configuration

```ts
new Agent({
  models: {
    codegen: 'claude-sonnet-4-6', // default
  },
  maxOutputTokens: 16384,         // default — component-level output fits well under
  iterate: 3,                     // default — max rewrite passes after initial generate
  threshold: 0.95,                // default — bail out when conformance >= threshold
  figmaToken: process.env.FIGMA_TOKEN, // default — only required when input.figma is set
});

// Phase 0 mode (no iteration):
new Agent({ iterate: 0 });
```

Models are pinned by ID (`claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5`) per the project's CARL `[OPUS-4-7]` model policy. No aliases.

## License

MIT. Builds on [`@atelier-oss/classify`](../classify) (MIT), [`@atelier-oss/atlas`](../atlas) (MIT), and [`@anthropic-ai/sdk`](https://github.com/anthropics/anthropic-sdk-typescript) (MIT).
