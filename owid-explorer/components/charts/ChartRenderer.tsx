"use client";

// ChartSpec + data -> ECharts option. The only place chart pixels are decided;
// the agent and the overlay builder only ever produce ChartSpec (SPEC.md §5).

import { useMemo } from "react";
import type { EChartsCoreOption } from "echarts/core";
import { seriesKey, type ChartSpec } from "@/lib/chartSpec";
import { applyTransforms } from "@/lib/transforms";
import type { ColumnMeta, EntitySeries } from "@/lib/owid/types";
import EChart from "./EChart";

const PALETTE = [
  "#2563eb", "#dc2626", "#059669", "#d97706",
  "#7c3aed", "#0891b2", "#be185d", "#4d7c0f",
];

export default function ChartRenderer({
  spec,
  data,
  columns,
}: {
  spec: ChartSpec;
  data: Record<string, EntitySeries[]>;
  columns: Record<string, ColumnMeta>;
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
        spec.transforms
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

    const yAxes: object[] = [
      {
        type: spec.axes.left.log ? "log" : "value",
        name: spec.axes.left.label,
        nameTextStyle: { align: "left" },
        scale: true,
      },
    ];
    if (spec.axes.right) {
      yAxes.push({
        type: spec.axes.right.log ? "log" : "value",
        name: spec.axes.right.label,
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
  }, [spec, data, columns]);

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
