import type { Metadata } from "next";
import Link from "next/link";
import { decodeSpec, seriesKey, withAutoCaveats } from "@/lib/chartSpec";
import { fetchChartCsv, fetchChartMetadata } from "@/lib/owid/client";
import { parseChartCsv, toEntitySeries } from "@/lib/owid/parse";
import {
  buildPopulationLookup,
  POPULATION_SLUG,
  type PopulationLookup,
} from "@/lib/transforms/perCapita";
import type { ColumnMeta, EntitySeries } from "@/lib/owid/types";
import OverlayBuilder from "@/components/overlay/OverlayBuilder";
import OverlayStart from "@/components/overlay/OverlayStart";

export const metadata: Metadata = { title: "Overlay builder" };

export default async function OverlayPage({
  searchParams,
}: {
  searchParams: { s?: string };
}) {
  if (!searchParams.s) return <OverlayStart />;

  const decoded = decodeSpec(searchParams.s);
  if (!decoded.ok) {
    return (
      <div className="pt-12 text-center">
        <h1 className="text-xl font-bold">Invalid overlay link</h1>
        <p className="mt-2 text-sm text-gray-500">{decoded.errors.join("; ")}</p>
        <Link href="/overlay" className="mt-4 inline-block text-sm text-blue-600 underline">
          Start a new overlay
        </Link>
      </div>
    );
  }
  const spec = withAutoCaveats(decoded.spec);

  const seriesData: Record<string, EntitySeries[]> = {};
  const columnMeta: Record<string, ColumnMeta> = {};
  let population: PopulationLookup | undefined;

  try {
    const uniqueSlugs = [...new Set(spec.series.map((r) => r.slug))];
    const fetched = await Promise.all(
      uniqueSlugs.map(async (slug) => {
        const [meta, csv] = await Promise.all([
          fetchChartMetadata(slug),
          fetchChartCsv(slug, { entities: spec.entities, timeRange: spec.timeRange }),
        ]);
        return { slug, meta, data: parseChartCsv(csv) };
      })
    );
    const bySlug = new Map(fetched.map((f) => [f.slug, f]));

    for (const ref of spec.series) {
      const f = bySlug.get(ref.slug);
      if (!f) continue;
      seriesData[seriesKey(ref)] = toEntitySeries(f.data, ref.column);
      const cm = f.meta.columns[ref.column];
      if (cm) columnMeta[seriesKey(ref)] = cm;
    }

    if (spec.transforms.some((t) => t.kind === "perCapita")) {
      const csv = await fetchChartCsv(POPULATION_SLUG, {
        entities: spec.entities,
        timeRange: spec.timeRange,
      });
      const parsed = parseChartCsv(csv);
      population = buildPopulationLookup(toEntitySeries(parsed, parsed.columns[0]));
    }
  } catch {
    return (
      <div className="pt-12 text-center">
        <h1 className="text-xl font-bold">Could not load overlay data</h1>
        <p className="mt-2 text-sm text-gray-500">
          One of the charts in this overlay failed to load from OWID.
        </p>
        <Link href="/overlay" className="mt-4 inline-block text-sm text-blue-600 underline">
          Start a new overlay
        </Link>
      </div>
    );
  }

  return (
    <OverlayBuilder spec={spec} data={seriesData} columns={columnMeta} population={population} />
  );
}
