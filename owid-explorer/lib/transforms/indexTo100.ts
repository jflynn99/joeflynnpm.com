import type { EntitySeries } from "../owid/types";

export interface IndexResult {
  series: EntitySeries[];
  // entities dropped because they have no value at baseYear (SPEC.md §5)
  dropped: string[];
}

// Per entity: value / value(baseYear) * 100. Entities with no baseYear value
// are dropped and reported so the caller can surface a caveat.
export function indexTo100(series: EntitySeries[], baseYear: number): IndexResult {
  const out: EntitySeries[] = [];
  const dropped: string[] = [];
  for (const s of series) {
    const base = s.points.find(([year]) => year === baseYear)?.[1];
    if (base === undefined || base === 0) {
      dropped.push(s.entity);
      continue;
    }
    out.push({
      ...s,
      points: s.points.map(([year, value]) => [year, (value / base) * 100]),
    });
  }
  return { series: out, dropped };
}
