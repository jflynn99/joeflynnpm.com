import type { EntitySeries } from "../owid/types";

// Per entity, over the points present (i.e. the selected time range):
// (value - mean) / stddev. Entities with fewer than 2 points or zero variance
// are passed through as a flat zero line rather than dropped.
export function zScore(series: EntitySeries[]): EntitySeries[] {
  return series.map((s) => {
    const values = s.points.map(([, v]) => v);
    const n = values.length;
    if (n === 0) return s;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const sd = Math.sqrt(variance);
    return {
      ...s,
      points: s.points.map(([year, value]) => [year, sd === 0 ? 0 : (value - mean) / sd]),
    };
  });
}
