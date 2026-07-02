# OWID Explorer

Explore, combine and explain [Our World in Data](https://ourworldindata.org) —
interactive charts with citations, combinable overlays, and an optional
natural-language agent with a bring-your-own-LLM model.

**Status: Phase 1 (chart viewer).** See [SPEC.md](./SPEC.md) for the full plan.

- Search thousands of OWID charts and open any of them
- Pick countries and time ranges; every view is a shareable URL
- Every chart shows OWID's citation, unit and timespan metadata
- Works entirely without an LLM — the agent (Phase 3) is an enhancement, not a dependency

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
