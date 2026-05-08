# @atelier-oss/agent

> The Atelier Design Agent — text brief in, token-conformant React+Tailwind out, conformance score reported. Phase 0 skeleton.

## Status

**Phase 0 — throwaway skeleton.** Scope is deliberately the narrowest possible end-to-end:

- Text brief in.
- Single non-streaming `claude-sonnet-4-6` call generates a React+Tailwind component.
- `@atelier-oss/classify` scores the emitted code's token-vs-raw conformance.
- `Agent.run()` returns `{ code, scores, trace, cost }`.

Not in this phase (all on the roadmap):

- No closed-loop iteration (Phase 1 — generate → classify → if score < threshold, rewrite raw refs → re-classify, max N iterations)
- No screenshot input via Claude vision (Phase 2)
- No atlas auto-bootstrap or DESIGN.md emission (Phase 2)
- No Figma input via the Anthropic Figma Plugin (Phase 3)
- No generative benchmark v3 (Phase 4)
- No Claude Code skill bundle / MCP tool / CLI subcommand (Phase 5)

The full plan lives at `~/Projects/memory-vault/planning/2026-05-08-atelier-design-agent.md`. Phase 0 ships per Karpathy doctrine — build the dumbest end-to-end first; failure modes shape Phase 1's loop design.

## Gate

5-component golden corpus at [`eval/golden-corpus/`](./eval/golden-corpus/). Average `atelier_classify` score ≥ **50%** when the agent runs once per brief with no iteration. Above the raw-palette baseline of 31.4%; below the DESIGN.md arm of 78.5% — proves the wiring works without overfitting.

Run the gate (requires `ANTHROPIC_API_KEY` in env):

```bash
pnpm --filter @atelier-oss/agent eval
```

## Programmatic use

```ts
import { Agent } from '@atelier-oss/agent';

const agent = new Agent();
const result = await agent.run({
  brief: 'pricing page with three tiers, primary CTA on the middle tier',
});

console.log(result.scores.classify); // { tokens, raw, conformance }
console.log(result.code);             // [{ path, content }]
console.log(result.trace);            // ordered phase log
console.log(result.cost);             // { input_tokens, output_tokens, usd }
```

## Configuration

```ts
new Agent({
  models: {
    codegen: 'claude-sonnet-4-6', // default
  },
  maxOutputTokens: 16384,         // default — component-level output fits well under
});
```

Models are pinned by ID (`claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5`) per the project's CARL `[OPUS-4-7]` model policy. No aliases.

## License

MIT. Builds on [`@atelier-oss/classify`](../classify) (MIT) and [`@anthropic-ai/sdk`](https://github.com/anthropics/anthropic-sdk-typescript) (MIT).
