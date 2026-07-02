import type { EntitySeries } from "../owid/types";

// Population lookup keyed `${code}:${year}`, built from the OWID `population`
// chart. Plain object so it can cross the server/client boundary.
export type PopulationLookup = Record<string, number>;

export const POPULATION_SLUG = "population";

export function buildPopulationLookup(series: EntitySeries[]): PopulationLookup {
  const lookup: PopulationLookup = {};
  for (const s of series) {
    for (const [year, value] of s.points) {
      lookup[`${s.code || s.entity}:${year}`] = value;
    }
  }
  return lookup;
}

// Guard against double division — a series whose unit is already normalised
// per person/population must never be per-capita'd again (SPEC.md §5).
export function isNormalisedUnit(unit?: string): boolean {
  if (!unit) return false;
  return /per\s+(capita|person|people|1,?000|100,?000|million)|%|percent|share|index/i.test(unit);
}

export interface PerCapitaResult {
  series: EntitySeries[];
  // entities with no population data at all
  dropped: string[];
}

// Per entity: value / population(code, year). Years without population data
// become gaps; entities entirely missing from the lookup are dropped.
export function perCapita(series: EntitySeries[], population: PopulationLookup): PerCapitaResult {
  const out: EntitySeries[] = [];
  const dropped: string[] = [];
  for (const s of series) {
    const key = s.code || s.entity;
    const points: [number, number][] = [];
    for (const [year, value] of s.points) {
      const pop = population[`${key}:${year}`];
      if (pop !== undefined && pop > 0) points.push([year, value / pop]);
    }
    if (points.length === 0) {
      dropped.push(s.entity);
      continue;
    }
    out.push({ ...s, points });
  }
  return { series: out, dropped };
}
