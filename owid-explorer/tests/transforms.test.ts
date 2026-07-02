import { describe, expect, it } from "vitest";
import { indexTo100 } from "../lib/transforms/indexTo100";
import { zScore } from "../lib/transforms/zScore";
import { applyTransforms } from "../lib/transforms";
import type { EntitySeries } from "../lib/owid/types";

const SERIES: EntitySeries[] = [
  { entity: "United States", code: "USA", points: [[1990, 50], [2000, 75], [2010, 100]] },
  { entity: "Japan", code: "JPN", points: [[2000, 10], [2010, 20]] },
];

describe("indexTo100", () => {
  it("indexes each entity to its own base-year value", () => {
    const { series, dropped } = indexTo100(SERIES, 1990);
    expect(dropped).toEqual(["Japan"]); // no 1990 value
    expect(series).toHaveLength(1);
    expect(series[0].points).toEqual([[1990, 100], [2000, 150], [2010, 200]]);
  });
});

describe("zScore", () => {
  it("standardises per entity over its own points", () => {
    const [usa] = zScore([SERIES[0]]);
    const values = usa.points.map(([, v]) => v);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    expect(mean).toBeCloseTo(0, 10);
    expect(values[0]).toBeLessThan(0);
    expect(values[2]).toBeGreaterThan(0);
  });

  it("returns a flat zero line for zero-variance series", () => {
    const [flat] = zScore([{ entity: "X", code: "X", points: [[2000, 5], [2001, 5]] }]);
    expect(flat.points.map(([, v]) => v)).toEqual([0, 0]);
  });
});

describe("applyTransforms", () => {
  it("applies in order and collects caveats", () => {
    const { series, caveats } = applyTransforms(SERIES, [{ kind: "indexTo100", baseYear: 1990 }]);
    expect(series).toHaveLength(1);
    expect(caveats[0]).toMatch(/Japan/);
  });

  it("throws on the unimplemented perCapita transform", () => {
    expect(() => applyTransforms(SERIES, [{ kind: "perCapita" }])).toThrow(/Phase 2/);
  });
});
