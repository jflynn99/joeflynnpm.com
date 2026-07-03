// Compact per-(column, entity) statistics for fetch_series (SPEC.md §6).
// The agent only ever sees these previews — full data flows browser-side at
// render time, keeping token usage bounded.

import { toEntitySeries } from "../owid/parse";
import type { ParsedChartData } from "../owid/types";

export interface SeriesPreview {
  column: string;
  entity: string;
  code: string;
  firstYear: number;
  lastYear: number;
  count: number;
  min: number;
  max: number;
  mean: number;
  firstValue: number;
  lastValue: number;
}

export function buildSeriesPreview(data: ParsedChartData): SeriesPreview[] {
  const previews: SeriesPreview[] = [];
  for (const column of data.columns) {
    for (const series of toEntitySeries(data, column)) {
      const values = series.points.map(([, v]) => v);
      if (values.length === 0) continue;
      const round = (n: number) => Number(n.toPrecision(6));
      previews.push({
        column,
        entity: series.entity,
        code: series.code,
        firstYear: series.points[0][0],
        lastYear: series.points[series.points.length - 1][0],
        count: values.length,
        min: round(Math.min(...values)),
        max: round(Math.max(...values)),
        mean: round(values.reduce((a, b) => a + b, 0) / values.length),
        firstValue: round(values[0]),
        lastValue: round(values[values.length - 1]),
      });
    }
  }
  return previews;
}
