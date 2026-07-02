# OWID Explorer — Build Spec (v2)

An open-source, agentic data exploration tool built on Our World in Data's public APIs.
Interactive charts, combinable overlays, and a natural-language agent that can find,
combine and explain data — with a bring-your-own-LLM model.

This is the source of truth. CLAUDE.md is derived from it. v2 incorporates the
spec review of 2026-07-02 (see "Changes from v1" at the bottom).

---

## 1. Product principles

1. **Works without an LLM.** Search, charts and overlays are pure OWID data. The agent
   is an enhancement, not a dependency.
2. **The agent produces specs, not pixels.** The LLM never generates chart code. It
   emits a declarative `ChartSpec` JSON object; the frontend renders it. This keeps the
   agent cheap, testable and swappable.
3. **Ground explanations in OWID's own writing.** The "explain" feature retrieves OWID
   articles (CC-BY) as context. No freestyling.
4. **Cite everything.** Every chart displays the citation metadata OWID provides.
   Overlays display citations for every series.
5. **Correlation caveat.** Any overlay of two independently-sourced series gets a
   visible "correlation ≠ causation" note, and the agent's explanations must
   acknowledge it.

## 2. Stack

- Next.js 14 (App Router), TypeScript, Tailwind — same as joeflynnpm.com
- **ECharts via `echarts/core` with tree-shaken imports and a thin in-repo React
  wrapper** (not `echarts-for-react`: unmaintained, and pulls the full bundle)
- Vercel AI SDK for the agent loop and provider abstraction (Phase 3)
- Deployed on Vercel free tier; OWID responses cached at the edge
- Vitest for tests

## 3. Repo structure

Currently lives at `owid-explorer/` inside the joeflynnpm.com repo (session/deploy
constraint); extract to its own repo before Phase 4 publish. Keep it fully
self-contained — own package.json, no imports from the parent.

```
owid-explorer/
├── CLAUDE.md                      # derived from this spec
├── SPEC.md                        # this file
├── README.md                      # install, BYO-key setup, screenshots
├── .env.example                   # LLM_PROVIDER, ANTHROPIC_API_KEY, etc.
├── app/
│   ├── page.tsx                   # landing: search box + featured charts
│   ├── chart/[slug]/page.tsx      # single chart view (state in URL params)
│   ├── overlay/page.tsx           # overlay builder (spec in URL param)     [Phase 2]
│   └── api/
│       ├── owid/search/route.ts   # proxy + cache for OWID Search API
│       ├── owid/data/route.ts     # proxy + cache for Chart API CSV/metadata
│       ├── owid/entities/route.ts # available entities + year range for a slug
│       └── agent/route.ts         # agent loop; accepts optional client key  [Phase 3]
├── components/
│   ├── charts/
│   │   ├── ChartRenderer.tsx      # ChartSpec + data -> ECharts option
│   │   ├── EChart.tsx             # thin React wrapper around echarts/core
│   │   ├── ChartControls.tsx      # entity picker + time range
│   │   ├── TransformControls.tsx  # index-to-100, log, dual-axis toggles    [Phase 2]
│   │   └── CitationFooter.tsx
│   ├── search/SearchBox.tsx
│   └── agent/                     #                                          [Phase 3]
│       ├── ChatPanel.tsx
│       └── KeyManager.tsx         # localStorage key entry, provider picker
├── lib/
│   ├── owid/
│   │   ├── client.ts              # fetch wrappers for OWID endpoints
│   │   ├── types.ts
│   │   └── parse.ts               # CSV -> rows -> per-entity series
│   ├── transforms/
│   │   ├── index.ts               # registry + apply pipeline
│   │   ├── indexTo100.ts
│   │   ├── perCapita.ts           # joins against OWID population dataset   [Phase 2]
│   │   └── zScore.ts
│   ├── chartSpec.ts               # ChartSpec type + zod schema + URL codec
│   └── agent/                     #                                          [Phase 3]
│       ├── tools.ts               # tool definitions
│       ├── prompts.ts             # system prompt
│       └── providers.ts           # Anthropic / OpenAI / Ollama via AI SDK
└── tests/
    ├── parse.test.ts
    ├── transforms.test.ts
    └── chartSpec.test.ts
```

## 4. OWID API layer

All free, no key. **Verified 2026-07-02.**

| Purpose | Endpoint |
|---|---|
| Keyword search (charts + pages) | `https://ourworldindata.org/api/search?q=...` |
| Chart data (CSV) | `https://ourworldindata.org/grapher/{slug}.csv?csvType=filtered&useColumnShortNames=true` |
| Chart metadata (JSON) | `https://ourworldindata.org/grapher/{slug}.metadata.json?useColumnShortNames=true` |

Notes (verified against the live API):
- **Pass `useColumnShortNames=true` to the metadata endpoint too.** Its `columns`
  object is then keyed by the same short names as the CSV header — the CSV↔metadata
  join is a direct key lookup. (Without the flag, columns are keyed by long title.)
- The CSV supports `country=USA~GBR~CHN` and `time=1990..2023` query params — filter
  server-side, don't download world-scale CSVs to the browser. `country` accepts
  ISO codes, OWID region codes (`OWID_WRL`, `OWID_EUR`), **and entity names**
  (URL-encoded, `~`-separated). Prefer codes in our URLs.
- Search results of `type: "chart"` include `availableEntities`; article results
  include `title`, `url`, `content` (excerpt), `authors`, `date`. Search returns
  `{ query, results, nbHits, offset, length }`.
- Column metadata fields: `titleShort`, `titleLong`, `descriptionShort`,
  `descriptionKey`, `unit`, `shortUnit`, `timespan`, `shortName`, `lastUpdated`,
  `citationShort`, `citationLong`, `owidVariableId`, `fullMetadata`. Surface
  `citationShort`, `unit`, `timespan`, `descriptionShort` in the UI.
- `metadata.chart.selection` holds the chart's default entity selection (names) —
  use it when the URL specifies no entities.
- Entity names and ISO codes are standardised across all OWID datasets. **Join key
  for overlays is `(code, year)`.** No interpolation: overlay series are plotted on
  the union of years; missing years are gaps, never invented points.
- There is no cheap "list entities for a slug" endpoint. `/api/owid/entities`
  fetches the full CSV **server-side**, extracts unique `(entity, code)` pairs and
  the min/max year, and caches hard. Never ship the full CSV to the browser.
- Cache aggressively: `Cache-Control: public, s-maxage=86400,
  stale-while-revalidate=604800` on all proxy routes, plus
  `fetch(..., { next: { revalidate: 86400 } })` upstream. OWID data changes slowly.
- Validate `slug` (`/^[a-z0-9-]+$/i`) and cap param lengths in proxy routes — they
  construct upstream URLs.
- The semantic Indicators API (docs.owid.io) is **post-v1**; keyword search covers
  v1 needs. Dropped from scope.

Licensing: OWID content is CC-BY; underlying third-party data carries its own terms;
Grapher's code may not be reused (we render our own charts). README must state this.

## 5. ChartSpec — the core abstraction

Everything renders from this. The agent emits it, the overlay builder edits it, the
URL serialises it (shareable links for free).

```typescript
interface ChartSpec {
  v: 1;                      // spec version, for URL forward-compat
  title: string;
  series: SeriesRef[];
  transforms: Transform[];   // applied in array order (see semantics below)
  axes: { left: AxisConfig; right?: AxisConfig };  // right axis => dual-axis overlay
  entities: string[];        // ISO / OWID codes
  timeRange: [number, number];
  annotations?: Annotation[];
  caveats?: string[];        // auto-populated, e.g. correlation warning
}

interface SeriesRef {
  slug: string;              // OWID grapher slug
  column: string;            // short column name from CSV
  axis: 'left' | 'right';
  color?: string;
}

interface AxisConfig {
  label?: string;
  log?: boolean;             // log scale is a render flag, not a data transform
}

type Transform =
  | { kind: 'indexTo100'; baseYear: number }
  | { kind: 'perCapita' }
  | { kind: 'zScore' };
```

Transform semantics (deterministic, unit-tested):
- Transforms apply to **every series**, in array order.
- `indexTo100`: per series, per entity — divide by that entity's value at
  `baseYear` × 100. If an entity has no value at `baseYear`, drop that entity from
  that series and record a caveat.
- `zScore`: per series, per entity, over the selected time range.
- `perCapita`: joins the OWID `population` dataset on `(code, year)`. **Must refuse
  (validation error) when the column's unit already contains "per capita",
  "per 1,000", "per 100,000", "%" or similar** — no double division.
- Log scale lives on `AxisConfig`, not in `transforms` — it changes rendering, not
  data. Log + zScore/indexed-below-zero is rejected at validation.

URL serialisation:
- Chart page (`/chart/[slug]`): plain query params mirroring OWID —
  `?country=USA~GBR&time=1990..2023`. Human-readable, hand-editable.
- Overlay page (`/overlay`): full spec as `?s=<base64url(JSON.stringify(spec))>`.
  `encodeSpec`/`decodeSpec` in `lib/chartSpec.ts`; decode re-validates with zod and
  checks `v`. Round-trip is unit-tested.

Validate with zod. If the agent emits an invalid spec, return the zod error to the
model and let it retry once before failing gracefully.

## 6. Agent tool schemas (Phase 3)

Four tools, defined with the AI SDK's `tool()` helper:

```typescript
search_indicators
  input:  { query: string }                       // natural language
  output: { results: { slug, title, subtitle, availableEntities }[] }
  // wraps OWID search; agent uses this instead of memorised slugs

fetch_series
  input:  { slug: string, entities: string[], timeRange?: [number, number] }
  output: { columns: string[], preview: SeriesPreview[], meta: CitationMeta }
  // SeriesPreview per (column, entity): firstYear, lastYear, count, min, max,
  // mean, first/last values. NEVER full data — keeps tokens down; full data
  // only flows browser-side at render.

compose_chart
  input:  ChartSpec                               // zod-validated
  output: { ok: true } | { ok: false, errors: string[] }
  // side effect: spec is streamed to the client and rendered

explain_chart
  input:  { spec: ChartSpec, question?: string }
  output: { articles: { title, url, excerpt }[] }
  // retrieves relevant OWID articles via Search API;
  // the model then answers grounded in these excerpts, with links
```

System prompt requirements:
- Always search before fetching; never invent slugs.
- Always call `compose_chart` rather than describing a chart in prose.
- Check the column `unit` before applying `perCapita` — never per-capita an
  already-normalised series.
- When two series from different sources are overlaid, add the correlation caveat to
  `spec.caveats` and mention it in any explanation.
- Cite OWID articles by title + link in explanations.

## 7. BYO-LLM model

Provider abstraction via the AI SDK — one config object:

```typescript
// lib/agent/providers.ts
const provider = getProvider(process.env.LLM_PROVIDER ?? clientHeader);
// 'anthropic' | 'openai' | 'ollama'
```

Three usage modes:
1. **Demo, no key:** charts/overlays fully functional; chat panel shows "add a key to
   enable the agent".
2. **Demo, pasted key:** KeyManager stores key in localStorage; sent per-request as an
   `x-llm-key` header to `/api/agent`, used in-memory only, never logged or persisted.
   State this explicitly in the UI and README. Anthropic/OpenAI only — the hosted
   serverless function cannot reach a user's local Ollama.
3. **Fork:** `.env` with `LLM_PROVIDER` + key; Ollama option for fully local/free.
   Ollama base URL comes from `.env` only — never from a client header (SSRF).

Default model when Anthropic: `claude-haiku-4-5` — the tool-calling here is simple
enough that a small model handles it, and it keeps everyone's costs down.

Optional later: server-funded "try it" mode, rate-limited (e.g. 10 requests/IP/day via
Vercel KV counter). Not in v1.

## 8. Phases and acceptance criteria

**Phase 1 — Chart viewer**
- Search OWID, open any chart by slug, select entities and time range, render with
  citation footer. Shareable URL. Deployed to Vercel.
- Done when: you can search "life expectancy", pick UK + Japan, and share the link.

**Phase 2 — Overlay engine**
- Add a second series to any chart; dual-axis, index-to-100, log, z-score transforms;
  correlation caveat renders automatically.
- Done when: CO2 per capita vs GDP per capita, indexed to 1990, on one shareable chart.

**Phase 3 — Agent**
- Chat panel; "show me renewable energy adoption vs electricity prices in Germany"
  produces a rendered overlay; "why?" produces a grounded, cited explanation.
- Done when: a cold user can go from question to explained chart with zero clicks on
  the chart UI.

**Phase 4 — Package + publish**
- Extract to standalone repo. README with GIFs, .env.example, MIT licence (for YOUR
  code; note OWID/third-party data terms), provider docs including Ollama.
- Done when: repo public, demo live, blog post on joeflynnpm.com, LinkedIn cross-post.

**Definition of project done = end of Phase 4.** Not Phase 5. There is no Phase 5.

## 9. Deliberately out of scope (v1)

- Maps / choropleths (OWID does these brilliantly already; low marginal value)
- User accounts, saved charts (URLs are the save mechanism)
- Scatter plots (tempting, adds a whole axis-pairing UI; revisit post-v1)
- Server-funded LLM usage
- Semantic indicator search via the ETL Indicators API
- Mobile-optimised overlay builder (charts should be responsive; the builder can be
  desktop-first)
- Interpolation/resampling of mismatched series (gaps stay gaps)

## Changes from v1 (spec review, 2026-07-02)

1. Verified all endpoints live; documented actual response shapes. Key find:
   `useColumnShortNames=true` also works on `metadata.json`, making the CSV↔metadata
   join a direct key lookup.
2. Dropped `echarts-for-react` (unmaintained, full-bundle) for a thin in-repo wrapper
   over tree-shaken `echarts/core`.
3. `ChartSpec` gains a `v` version field; log scale moved from `transforms` to
   `AxisConfig` (it's a render flag, not a data transform); transform semantics
   (ordering, per-entity behaviour, missing-baseYear handling) are now specified.
4. Defined the URL codec explicitly: readable query params for `/chart/[slug]`,
   base64url spec for `/overlay`. Round-trip unit test required.
5. `perCapita` must refuse already-normalised units — double-division was the biggest
   silent-wrongness risk in v1; also encoded as an agent prompt rule.
6. Added `/api/owid/entities` — there's no cheap OWID endpoint for "entities available
   on a chart", so we derive it server-side from the full CSV, cached.
7. Overlay join policy pinned: union of years, gaps stay gaps, no interpolation.
8. `fetch_series` preview shape pinned (per-entity stats) so token cost is bounded.
9. BYO-key security tightened: pasted-key mode is Anthropic/OpenAI only; Ollama base
   URL never comes from the client (SSRF).
10. Dropped the semantic Indicators API from v1 scope; keyword search suffices.
11. Slug/param validation on proxy routes (they build upstream URLs).
12. Phase 4 now explicitly includes extraction to a standalone repo (v1 build lives
    inside joeflynnpm.com as `owid-explorer/`).
