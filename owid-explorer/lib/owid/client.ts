// Server-side fetch wrappers for OWID's public APIs. Never call these from
// client components — data flows through our cached route handlers or server
// components. See SPEC.md §4.

import type { EntitiesResponse, GrapherMetadata, SearchResponse } from "./types";
import { parseChartCsv } from "./parse";

const OWID_BASE = "https://ourworldindata.org";
export const OWID_REVALIDATE_SECONDS = 86400; // OWID data changes slowly

const SLUG_RE = /^[a-z0-9-]+$/i;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && slug.length <= 200;
}

function assertSlug(slug: string): void {
  if (!isValidSlug(slug)) throw new Error(`Invalid OWID slug: ${slug}`);
}

async function owidFetch(url: string): Promise<Response> {
  const res = await fetch(url, { next: { revalidate: OWID_REVALIDATE_SECONDS } });
  if (!res.ok) {
    throw new Error(`OWID request failed (${res.status}): ${url}`);
  }
  return res;
}

export async function searchOwid(query: string, type?: string): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query.slice(0, 200) });
  if (type) params.set("type", type);
  const res = await owidFetch(`${OWID_BASE}/api/search?${params}`);
  return res.json();
}

export interface CsvFilter {
  // ISO codes, OWID region codes, or entity names — joined with ~
  entities?: string[];
  timeRange?: [number, number];
}

export async function fetchChartCsv(slug: string, filter: CsvFilter = {}): Promise<string> {
  assertSlug(slug);
  const params = new URLSearchParams({
    csvType: "filtered",
    useColumnShortNames: "true",
  });
  if (filter.entities && filter.entities.length > 0) {
    params.set("country", filter.entities.slice(0, 50).join("~"));
    // Map-default charts ignore the country filter unless a line tab is forced
    params.set("tab", "line");
  }
  if (filter.timeRange) {
    params.set("time", `${filter.timeRange[0]}..${filter.timeRange[1]}`);
  }
  const res = await owidFetch(`${OWID_BASE}/grapher/${slug}.csv?${params}`);
  return res.text();
}

export async function fetchChartMetadata(slug: string): Promise<GrapherMetadata> {
  assertSlug(slug);
  // useColumnShortNames=true keys `columns` by the CSV's short column names
  const res = await owidFetch(
    `${OWID_BASE}/grapher/${slug}.metadata.json?useColumnShortNames=true`
  );
  return res.json();
}

// There is no cheap OWID endpoint listing a chart's entities, so derive it from
// the full CSV server-side (cached). Never ship the full CSV to the browser.
export async function fetchChartEntities(slug: string): Promise<EntitiesResponse> {
  assertSlug(slug);
  const csv = await fetchChartCsv(slug);
  const data = parseChartCsv(csv);
  const seen = new Map<string, string>();
  let minYear = Infinity;
  let maxYear = -Infinity;
  for (const row of data.rows) {
    if (!seen.has(row.code || row.entity)) seen.set(row.code || row.entity, row.entity);
    if (row.year < minYear) minYear = row.year;
    if (row.year > maxYear) maxYear = row.year;
  }
  const entities = [...seen.entries()]
    .map(([code, entity]) => ({ code, entity }))
    .sort((a, b) => a.entity.localeCompare(b.entity));
  return {
    entities,
    minYear: Number.isFinite(minYear) ? minYear : 0,
    maxYear: Number.isFinite(maxYear) ? maxYear : 0,
  };
}
