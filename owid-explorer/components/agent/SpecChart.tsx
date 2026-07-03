"use client";

// Renders a ChartSpec emitted by the agent's compose_chart tool. Data flows
// through our cached proxy routes — the LLM never touches raw data.

import { useEffect, useState } from "react";
import Link from "next/link";
import { encodeSpec, seriesKey, validateSpec, type ChartSpec } from "@/lib/chartSpec";
import { parseChartCsv, toEntitySeries } from "@/lib/owid/parse";
import {
  buildPopulationLookup,
  POPULATION_SLUG,
  type PopulationLookup,
} from "@/lib/transforms/perCapita";
import type { ColumnMeta, EntitySeries, GrapherMetadata } from "@/lib/owid/types";
import ChartRenderer from "@/components/charts/ChartRenderer";
import CitationFooter from "@/components/charts/CitationFooter";

interface LoadedData {
  data: Record<string, EntitySeries[]>;
  columns: Record<string, ColumnMeta>;
  population?: PopulationLookup;
}

async function fetchSlug(slug: string, spec: ChartSpec) {
  const params = new URLSearchParams({
    slug,
    country: spec.entities.join("~"),
    time: `${spec.timeRange[0]}..${spec.timeRange[1]}`,
  });
  const [csvRes, metaRes] = await Promise.all([
    fetch(`/api/owid/data?${params}`),
    fetch(`/api/owid/data?slug=${encodeURIComponent(slug)}&format=metadata`),
  ]);
  if (!csvRes.ok || !metaRes.ok) throw new Error(`failed to load ${slug}`);
  const parsed = parseChartCsv(await csvRes.text());
  const meta: GrapherMetadata = await metaRes.json();
  return { parsed, meta };
}

export default function SpecChart({ spec: rawSpec }: { spec: unknown }) {
  const validated = validateSpec(rawSpec);
  const [loaded, setLoaded] = useState<LoadedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const spec = validated.ok ? validated.spec : null;

  useEffect(() => {
    if (!spec) return;
    let cancelled = false;
    (async () => {
      try {
        const uniqueSlugs = [...new Set(spec.series.map((r) => r.slug))];
        const bySlug = new Map(
          await Promise.all(
            uniqueSlugs.map(async (slug) => [slug, await fetchSlug(slug, spec)] as const)
          )
        );
        const data: Record<string, EntitySeries[]> = {};
        const columns: Record<string, ColumnMeta> = {};
        for (const ref of spec.series) {
          const f = bySlug.get(ref.slug);
          if (!f) continue;
          data[seriesKey(ref)] = toEntitySeries(f.parsed, ref.column);
          const cm = f.meta.columns[ref.column];
          if (cm) columns[seriesKey(ref)] = cm;
        }
        let population: PopulationLookup | undefined;
        if (spec.transforms.some((t) => t.kind === "perCapita")) {
          const { parsed } = await fetchSlug(POPULATION_SLUG, spec);
          population = buildPopulationLookup(toEntitySeries(parsed, parsed.columns[0]));
        }
        if (!cancelled) setLoaded({ data, columns, population });
      } catch (e) {
        if (!cancelled) setError("Could not load chart data from OWID.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rawSpec)]);

  if (!spec) return null;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!loaded) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-400">
        Loading chart…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{spec.title}</h3>
        <Link
          href={`/overlay?s=${encodeSpec(spec)}`}
          className="shrink-0 text-xs text-blue-600 hover:underline"
        >
          Open in overlay builder →
        </Link>
      </div>
      <ChartRenderer
        spec={spec}
        data={loaded.data}
        columns={loaded.columns}
        population={loaded.population}
      />
      <CitationFooter columns={Object.values(loaded.columns)} />
    </div>
  );
}
