// The agent's four tools (SPEC.md §6). The LLM never generates chart code —
// compose_chart validates a declarative ChartSpec and the client renders it.

import { tool } from "ai";
import { z } from "zod";
import { chartSpecSchema, validateSpec, withAutoCaveats } from "../chartSpec";
import { fetchChartCsv, fetchChartMetadata, searchOwid } from "../owid/client";
import { parseChartCsv } from "../owid/parse";
import type { SearchChartResult, SearchPageResult } from "../owid/types";
import { buildSeriesPreview } from "./preview";

export const agentTools = {
  search_indicators: tool({
    description:
      "Search Our World in Data for charts/indicators matching a natural-language query. " +
      "Always use this to find real chart slugs — never invent one.",
    inputSchema: z.object({
      query: z.string().describe("What to look for, e.g. 'renewable energy share'"),
    }),
    execute: async ({ query }) => {
      const res = await searchOwid(query);
      const charts = res.results
        .filter((r): r is SearchChartResult => r.type === "chart")
        .slice(0, 6)
        .map((r) => ({
          slug: r.slug,
          title: r.title,
          subtitle: r.variantName ?? null,
          availableEntities: (r.availableEntities ?? []).slice(0, 25),
        }));
      return { results: charts };
    },
  }),

  fetch_series: tool({
    description:
      "Fetch metadata and a compact statistical preview for an OWID chart. Returns column " +
      "names, units, citations, and per-country stats — use it to pick columns, check units " +
      "(e.g. before per-capita), and confirm data coverage before composing a chart.",
    inputSchema: z.object({
      slug: z.string().describe("OWID grapher slug from search_indicators"),
      entities: z.array(z.string()).min(1).max(10).describe("ISO/OWID codes or entity names"),
      timeRange: z.tuple([z.number().int(), z.number().int()]).optional(),
    }),
    execute: async ({ slug, entities, timeRange }) => {
      const [meta, csv] = await Promise.all([
        fetchChartMetadata(slug),
        fetchChartCsv(slug, { entities, timeRange }),
      ]);
      const data = parseChartCsv(csv);
      return {
        columns: Object.values(meta.columns).map((c) => ({
          column: c.shortName,
          title: c.titleShort,
          unit: c.unit ?? null,
          timespan: c.timespan ?? null,
          citation: c.citationShort ?? null,
        })),
        preview: buildSeriesPreview(data),
      };
    },
  }),

  compose_chart: tool({
    description:
      "Render a chart for the user from a declarative ChartSpec. Call this instead of " +
      "describing a chart in prose. On validation failure, fix the reported errors and retry once.",
    inputSchema: chartSpecSchema,
    execute: async (spec) => {
      const result = validateSpec(withAutoCaveats(spec));
      if (!result.ok) return { ok: false as const, errors: result.errors };
      // The client renders the spec from this tool call's input; nothing else to do
      return { ok: true as const };
    },
  }),

  explain_chart: tool({
    description:
      "Retrieve OWID's own articles (CC-BY) about a topic, to ground an explanation of a " +
      "chart. Answer questions using these excerpts and cite each article by title + link.",
    inputSchema: z.object({
      query: z.string().describe("Topic of the chart/question, e.g. 'why renewables got cheaper'"),
    }),
    execute: async ({ query }) => {
      const res = await searchOwid(query, "pages");
      const articles = res.results
        .filter((r): r is SearchPageResult => r.type !== "chart" && !!(r as SearchPageResult).url)
        .slice(0, 4)
        .map((r) => ({
          title: r.title,
          url: r.url!,
          excerpt: (r.content ?? "").slice(0, 600),
        }));
      return { articles };
    },
  }),
};
