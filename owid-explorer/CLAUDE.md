# owid-explorer

Agentic data exploration tool on Our World in Data's public APIs. **SPEC.md is the
source of truth** — read it before structural changes. This file is the working
summary.

## Status

- Phase 1 (chart viewer): in progress
- Phase 2 (overlays + transforms): lib groundwork done (`lib/transforms/`), no UI yet
- Phase 3 (agent), Phase 4 (publish): not started

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

## Verification

- `npm run build` and `npm test` after changes; check `npm run dev` for visual
  regressions on `/` and `/chart/life-expectancy`.
