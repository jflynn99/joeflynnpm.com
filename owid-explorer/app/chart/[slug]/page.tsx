import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchChartCsv, fetchChartMetadata, isValidSlug } from "@/lib/owid/client";
import { parseChartCsv, toEntitySeries } from "@/lib/owid/parse";
import { seriesKey, type ChartSpec } from "@/lib/chartSpec";
import ChartRenderer from "@/components/charts/ChartRenderer";
import ChartControls from "@/components/charts/ChartControls";
import CitationFooter from "@/components/charts/CitationFooter";
import type { ColumnMeta, EntitySeries } from "@/lib/owid/types";

interface PageProps {
  params: { slug: string };
  searchParams: { country?: string; time?: string };
}

function parseTimeParam(time?: string): [number, number] | undefined {
  const m = time?.match(/^(-?\d+)\.\.(-?\d+)$/);
  return m ? [Number(m[1]), Number(m[2])] : undefined;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!isValidSlug(params.slug)) return {};
  try {
    const meta = await fetchChartMetadata(params.slug);
    return { title: meta.chart.title, description: meta.chart.subtitle };
  } catch {
    return {};
  }
}

export default async function ChartPage({ params, searchParams }: PageProps) {
  const { slug } = params;
  if (!isValidSlug(slug)) notFound();

  let meta;
  try {
    meta = await fetchChartMetadata(slug);
  } catch {
    notFound();
  }

  // Entities come from the URL (codes or names, ~-separated) or fall back to
  // the chart's own default selection. Time range from ?time=1990..2023.
  const requestedEntities = searchParams.country?.split("~").filter(Boolean);
  const entities =
    requestedEntities && requestedEntities.length > 0
      ? requestedEntities.slice(0, 50)
      : meta.chart.selection?.length
        ? meta.chart.selection
        : undefined;
  const requestedTime = parseTimeParam(searchParams.time);

  const csv = await fetchChartCsv(slug, { entities, timeRange: requestedTime });
  const data = parseChartCsv(csv);
  if (data.rows.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold">{meta.chart.title}</h1>
        <p className="mt-4 text-gray-500">
          No data for this selection. Try different countries or a wider time range.
        </p>
      </div>
    );
  }

  const selectedCodes = [...new Set(data.rows.map((r) => r.code || r.entity))];
  const years = data.rows.map((r) => r.year);
  const timeRange: [number, number] =
    requestedTime ?? [Math.min(...years), Math.max(...years)];

  const spec: ChartSpec = {
    v: 1,
    title: meta.chart.title,
    series: data.columns.map((column) => ({ slug, column, axis: "left" as const })),
    transforms: [],
    axes: { left: { label: Object.values(meta.columns)[0]?.shortUnit || undefined } },
    entities: selectedCodes,
    timeRange,
  };

  const seriesData: Record<string, EntitySeries[]> = {};
  const columnMeta: Record<string, ColumnMeta> = {};
  for (const ref of spec.series) {
    seriesData[seriesKey(ref)] = toEntitySeries(data, ref.column);
    const cm = meta.columns[ref.column];
    if (cm) columnMeta[seriesKey(ref)] = cm;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{meta.chart.title}</h1>
      {meta.chart.subtitle && <p className="mt-1 text-sm text-gray-500">{meta.chart.subtitle}</p>}

      <div className="mt-5">
        <ChartControls slug={slug} selectedCodes={selectedCodes} timeRange={timeRange} />
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <ChartRenderer spec={spec} data={seriesData} columns={columnMeta} />
        <CitationFooter
          columns={Object.values(columnMeta)}
          originalChartUrl={meta.chart.originalChartUrl}
        />
      </div>
    </div>
  );
}
