"use client";

// ChartSpec + data -> ECharts option. The only place chart pixels are decided;
// the agent and the overlay builder only ever produce ChartSpec (SPEC.md §5).

import { useMemo } from "react";
import type { EChartsCoreOption } from "echarts/core";
import { seriesKey, type ChartSpec } from "@/lib/chartSpec";
import { applyTransforms } from "@/lib/transforms";
import type { PopulationLookup } from "@/lib/transforms/perCapita";
import type { ColumnMeta, EntitySeries } from "@/lib/owid/types";
import EChart from "./EChart";

// Transforms change what the y-axis means — derive its label accordingly.
function deriveAxisLabel(spec: ChartSpec, meta: ColumnMeta | undefined): string | undefined {
  const index = spec.transforms.find((t) => t.kind === "indexTo100");
  if (index && index.kind === "indexTo100") return `Index (${index.baseYear} = 100)`;
  if (spec.transforms.some((t) => t.kind === "zScore")) return "z-score";
  const base = meta?.shortUnit || meta?.unit;
  if (spec.transforms.some((t) => t.kind === "perCapita")) {
    return base ? `${base} per person` : "per person";
  }
  return base || undefined;
}

const PALETTE = [
  "#2563eb", "#dc2626", "#059669", "#d97706",
  "#7c3aed", "#0891b2", "#be185d", "#4d7c0f",
];

export default function ChartRenderer({
  spec,
  data,
  columns,
  population,
}: {
  spec: ChartSpec;
  data: Record<string, EntitySeries[]>;
  columns: Record<string, ColumnMeta>;
  population?: PopulationLookup;
}) {
  const { option, caveats } = useMemo(() => {
    const allCaveats: string[] = [...(spec.caveats ?? [])];
    const echartsSeries: object[] = [];
    let colorIndex = 0;

    for (const ref of spec.series) {
      const key = seriesKey(ref);
      const raw = data[key] ?? [];
      const meta = columns[key];
      const { series: transformed, caveats: transformCaveats } = applyTransforms(
        raw,
        spec.transforms,
        { unit: meta?.unit, population }
      );
      allCaveats.push(...transformCaveats);

      const multiRef = spec.series.length > 1;
      for (const entitySeries of transformed) {
        const name = multiRef
          ? `${meta?.titleShort ?? ref.column} — ${entitySeries.entity}`
          : entitySeries.entity;
        echartsSeries.push({
          type: "line",
          name,
          yAxisIndex: ref.axis === "right" ? 1 : 0,
          showSymbol: false,
          connectNulls: false, // gaps stay gaps — no interpolation
          data: entitySeries.points,
          lineStyle: { width: 2 },
          color: ref.color ?? PALETTE[colorIndex++ % PALETTE.length],
        });
      }
    }

    const firstMeta = (axis: "left" | "right") => {
      const ref = spec.series.find((s) => s.axis === axis);
      return ref ? columns[seriesKey(ref)] : undefined;
    };
    const yAxes: object[] = [
      {
        type: spec.axes.left.log ? "log" : "value",
        name: spec.axes.left.label ?? deriveAxisLabel(spec, firstMeta("left")),
        nameTextStyle: { align: "left" },
        scale: true,
      },
    ];
    if (spec.axes.right) {
      yAxes.push({
        type: spec.axes.right.log ? "log" : "value",
        name: spec.axes.right.label ?? deriveAxisLabel(spec, firstMeta("right")),
        nameTextStyle: { align: "right" },
        scale: true,
        splitLine: { show: false },
      });
    }

    const option: EChartsCoreOption = {
      animation: false,
      grid: { left: 60, right: spec.axes.right ? 60 : 24, top: 48, bottom: 72 },
      legend: { bottom: 0, type: "scroll" },
      tooltip: {
        trigger: "axis",
        valueFormatter: (v: unknown) =>
          typeof v === "number" ? Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(v) : "",
      },
      xAxis: {
        type: "value",
        min: spec.timeRange[0],
        max: spec.timeRange[1],
        axisLabel: { formatter: (v: number) => String(Math.round(v)) },
      },
      yAxis: yAxes,
      series: echartsSeries,
    };

    return { option, caveats: allCaveats };
  }, [spec, data, columns, population]);

  return (
    <div>
      <EChart option={option} />
      {caveats.length > 0 && (
        <ul className="mt-2 space-y-1">
          {caveats.map((c, i) => (
            <li key={i} className="text-xs text-amber-700">
              ⚠ {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
