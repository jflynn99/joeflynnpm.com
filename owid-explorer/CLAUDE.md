# owid-explorer

Agentic data exploration tool on Our World in Data's public APIs. **SPEC.md is the
source of truth** — read it before structural changes. This file is the working
summary.

## Status

- Phase 1 (chart viewer): done
- Phase 2 (overlays + transforms): done
- Phase 3 (agent): built and verified except the live LLM loop (needs a real API key)
- Phase 4 (publish/extract): not started

## Context

- Standalone Next.js 14 app nested inside the joeflynnpm.com repo. Do NOT import
  from the parent; it gets extracted to its own repo in Phase 4. The parent
  tsconfig excludes this directory.
- All commands run from `owid-explorer/`: `npm run dev`, `npm run build`,
  `npm test` (vitest).

## Architecture rules

- Everything renders from `ChartSpec` (`lib/chartSpec.ts`, zod-validated). The agent
  emits specs, never chart code. URLs serialise specs (see SPEC.md §5 for the codec).
- OWID fetches happen server-side only (route handlers / server components) via
  `lib/owid/client.ts`, cached 24h. Never ship a full unfiltered CSV to the browser.
- Always pass `useColumnShortNames=true` to BOTH the CSV and metadata endpoints —
  that keys metadata columns by the CSV's short column names.
- ECharts via tree-shaken `echarts/core` and the in-repo `components/charts/EChart.tsx`
  wrapper. Do not add `echarts-for-react`.
- Every chart shows `CitationFooter` (citationShort, unit, timespan, CC-BY note).
- Transforms are pure functions in `lib/transforms/` with tests. Log scale is an
  axis flag, not a transform. `perCapita` must refuse already-normalised units.
- Proxy routes validate `slug` (`/^[a-z0-9-]+$/i`) before building upstream URLs.
- Agent (`lib/agent/`, `/api/agent`): Vercel AI SDK; the LLM emits ChartSpecs via
  the compose_chart tool and the client renders them (`components/agent/SpecChart`).
  Client keys arrive as x-llm-provider/x-llm-key headers — in-memory only, never
  logged. Ollama config comes from env only, never client headers (SSRF).
- Default models: `claude-haiku-4-5` (Anthropic), `gpt-4o-mini` (OpenAI);
  override with `LLM_MODEL`.

## Verification

- `npm run build` and `npm test` after changes; check `npm run dev` for visual
  regressions on `/` and `/chart/life-expectancy`.
