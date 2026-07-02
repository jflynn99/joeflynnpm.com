# OWID Explorer

Explore, combine and explain [Our World in Data](https://ourworldindata.org) —
interactive charts with citations, combinable overlays, and an optional
natural-language agent with a bring-your-own-LLM model.

**Status: Phases 1–3 built (chart viewer, overlay engine, agent).** See
[SPEC.md](./SPEC.md) for the full plan.

- Search thousands of OWID charts and open any of them
- Pick countries and time ranges; every view is a shareable URL
- Overlay any two series: dual axes, index-to-100, per-capita, z-score, log scale —
  with an automatic correlation ≠ causation caveat
- Ask in plain language at `/agent`: the LLM finds indicators, composes charts
  (as validated declarative specs — it never writes chart code), and explains them
  grounded in OWID's own cited articles
- Every chart shows OWID's citation, unit and timespan metadata
- Works entirely without an LLM — the agent is an enhancement, not a dependency

## Bring your own LLM

Three ways to run the agent (charts never need any of this):

1. **No key** — everything except the chat panel works.
2. **Paste a key in the UI** — stored in your browser's localStorage, sent only with
   your own chat requests, used in-memory server-side, never logged or persisted.
   Anthropic (default `claude-haiku-4-5`) or OpenAI (default `gpt-4o-mini`).
3. **Fork with `.env`** — set `LLM_PROVIDER` + a key, or `LLM_PROVIDER=ollama` with
   `OLLAMA_BASE_URL` for fully local, free inference. See `.env.example`.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # vitest
npm run build
```

No API keys required — OWID's APIs are free and public. LLM keys are only
needed for the agent (Phase 3); see `.env.example`.

## Deploying

Deploy as its own Vercel project. This app currently lives in a subdirectory of
a larger repo, so set the Vercel project's **Root Directory** to `owid-explorer`.
OWID responses are cached at the edge (24h + stale-while-revalidate).

## Licensing

- This code: MIT (licence file lands with the Phase 4 publish)
- OWID content (data descriptions, articles): [CC BY](https://creativecommons.org/licenses/by/4.0/) — cited on every chart
- Underlying third-party datasets may carry their own terms; check the citation on each chart
- OWID's Grapher code is not reused here — all charts are rendered independently with ECharts
