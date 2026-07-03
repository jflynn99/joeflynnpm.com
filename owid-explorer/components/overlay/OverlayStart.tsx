"use client";

// Empty state for /overlay: pick the first series, then hand off to the
// URL-driven builder with a sensible initial spec.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { encodeSpec, type ChartSpec } from "@/lib/chartSpec";
import type { EntitiesResponse, GrapherMetadata } from "@/lib/owid/types";
import SearchBox from "@/components/search/SearchBox";

export default function OverlayStart() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function start(slug: string) {
    setLoading(true);
    setError(null);
    try {
      const [metaRes, entitiesRes] = await Promise.all([
        fetch(`/api/owid/data?slug=${encodeURIComponent(slug)}&format=metadata`),
        fetch(`/api/owid/entities?slug=${encodeURIComponent(slug)}`),
      ]);
      if (!metaRes.ok || !entitiesRes.ok) throw new Error();
      const meta: GrapherMetadata = await metaRes.json();
      const available: EntitiesResponse = await entitiesRes.json();

      const column = Object.values(meta.columns).find((c) => c.type !== "Continent")?.shortName;
      if (!column) throw new Error();

      // Default selection names -> codes, capped to keep the chart readable
      const byName = new Map(available.entities.map((e) => [e.entity, e.code]));
      const entities = (meta.chart.selection ?? [])
        .map((name) => byName.get(name))
        .filter((c): c is string => !!c)
        .slice(0, 5);

      const spec: ChartSpec = {
        v: 1,
        title: meta.chart.title,
        series: [{ slug, column, axis: "left" }],
        transforms: [],
        axes: { left: {} },
        entities: entities.length > 0 ? entities : [available.entities[0]?.code ?? "OWID_WRL"],
        timeRange: [available.minYear, available.maxYear],
      };
      router.push(`/overlay?s=${encodeSpec(spec)}`);
    } catch {
      setError(`Could not load "${slug}". Try a different chart.`);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center pt-12">
      <h1 className="text-2xl font-bold tracking-tight">Overlay builder</h1>
      <p className="mt-2 max-w-md text-center text-sm text-gray-500">
        Combine any two OWID series on one chart — dual axes, index-to-100, log and
        z-score transforms. Start by picking the first series.
      </p>
      <div className="mt-6 w-full max-w-xl">
        <SearchBox autoFocus placeholder="Search for the first series…" onSelect={(r) => start(r.slug)} />
      </div>
      {loading && <p className="mt-3 text-sm text-gray-400">Loading chart…</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
