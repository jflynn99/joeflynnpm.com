// Transform registry (SPEC.md §5). Transforms apply to every series, in array
// order, per entity. Inapplicable transforms are skipped with a visible caveat
// rather than failing the whole chart.

import type { Transform } from "../chartSpec";
import type { EntitySeries } from "../owid/types";
import { indexTo100 } from "./indexTo100";
import { zScore } from "./zScore";
import { isNormalisedUnit, perCapita, type PopulationLookup } from "./perCapita";

export interface TransformContext {
  // unit of the series being transformed, from OWID column metadata
  unit?: string;
  population?: PopulationLookup;
}

export interface TransformOutput {
  series: EntitySeries[];
  caveats: string[];
}

export function applyTransforms(
  series: EntitySeries[],
  transforms: Transform[],
  ctx: TransformContext = {}
): TransformOutput {
  let current = series;
  const caveats: string[] = [];

  for (const t of transforms) {
    switch (t.kind) {
      case "indexTo100": {
        const { series: next, dropped } = indexTo100(current, t.baseYear);
        if (dropped.length > 0) {
          caveats.push(`No ${t.baseYear} value for ${dropped.join(", ")} — omitted from indexed view.`);
        }
        current = next;
        break;
      }
      case "zScore":
        current = zScore(current);
        break;
      case "perCapita": {
        if (isNormalisedUnit(ctx.unit)) {
          caveats.push(`Per-capita skipped: series is already normalised (unit "${ctx.unit}").`);
          break;
        }
        if (!ctx.population) {
          caveats.push("Per-capita skipped: population data unavailable.");
          break;
        }
        const { series: next, dropped } = perCapita(current, ctx.population);
        if (dropped.length > 0) {
          caveats.push(`No population data for ${dropped.join(", ")} — omitted from per-capita view.`);
        }
        current = next;
        break;
      }
    }
  }

  return { series: current, caveats };
}
