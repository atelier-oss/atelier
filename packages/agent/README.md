# @atelier-oss/agent

> The Atelier Design Agent — text brief in, token-conformant React+Tailwind out, conformance score reported. Phase 0 skeleton.

## Status

**Phase 1 — closed-loop iteration.** The agent now ships:

- Text brief in.
- `claude-sonnet-4-6` initial generate.
- `@atelier-oss/classify` scores token-vs-raw conformance.
- **If score < threshold, the rewrite loop kicks in**: a second prompt feeds the prior code + score breakdown back to the model and asks for a token-only rewrite. Re-classify. Up to N iterations. Best emission seen wins.
- `Agent.run()` returns `{ code, scores, trace, cost, iterations }`.

Empirical findings from Phase 0 ([`eval/PHASE-0-FINDINGS.md`](./eval/PHASE-0-FINDINGS.md)) showed the failure mode: soft poetic color language ("warm coral", "dusty teal") tempts the model to inline `bg-amber-300` / `bg-teal-400` directly. The Phase 1 rewrite prompt explicitly maps color metaphors to canonical roles and enumerates the failing patterns to reject.

Not in this phase (all on the roadmap):

- No screenshot input via Claude vision (Phase 2)
- No atlas auto-bootstrap or DESIGN.md emission (Phase 2)
- No Figma input via the Anthropic Figma Plugin (Phase 3)
- No generative benchmark v3 (Phase 4)
- No Claude Code skill bundle / MCP tool / CLI subcommand (Phase 5)

The full plan lives at `~/Projects/memory-vault/planning/2026-05-08-atelier-design-agent.md`.

## Gate

15-component golden corpus at [`eval/golden-corpus/`](./eval/golden-corpus/). **Phase 1 gate**: average `atelier_classify` conformance ≥ **95%** AND no individual fixture below **75%**, with `iterate=3`, `threshold=0.95`.

Run the gate (requires `ANTHROPIC_API_KEY` in env):

```bash
pnpm --filter @atelier-oss/agent eval
```

## Programmatic use

```ts
import { Agent } from '@atelier-oss/agent';

const agent = new Agent();
const result = await agent.run({
  brief: 'pricing card with a warm coral primary CTA on a soft cream canvas',
});

console.log(result.scores.classify);  // { tokens, raw, conformance }
console.log(result.code);              // [{ path, content }]
console.log(result.trace);             // ordered phase log
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
});

// Phase 0 mode (no iteration):
new Agent({ iterate: 0 });
```

Models are pinned by ID (`claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5`) per the project's CARL `[OPUS-4-7]` model policy. No aliases.

## License

MIT. Builds on [`@atelier-oss/classify`](../classify) (MIT) and [`@anthropic-ai/sdk`](https://github.com/anthropics/anthropic-sdk-typescript) (MIT).
