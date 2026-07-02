// Transform registry (SPEC.md §5). Transforms apply to every series, in array
// order, per entity. perCapita lands in Phase 2 (needs the population join and
// the already-normalised-unit guard).

import type { Transform } from "../chartSpec";
import type { EntitySeries } from "../owid/types";
import { indexTo100 } from "./indexTo100";
import { zScore } from "./zScore";

export interface TransformOutput {
  series: EntitySeries[];
  caveats: string[];
}

export function applyTransforms(series: EntitySeries[], transforms: Transform[]): TransformOutput {
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
      case "perCapita":
        throw new Error("perCapita transform is not implemented yet (Phase 2)");
    }
  }

  return { series: current, caveats };
}
