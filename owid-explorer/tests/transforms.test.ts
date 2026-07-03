import { describe, expect, it } from "vitest";
import { indexTo100 } from "../lib/transforms/indexTo100";
import { zScore } from "../lib/transforms/zScore";
import {
  buildPopulationLookup,
  isNormalisedUnit,
  perCapita,
} from "../lib/transforms/perCapita";
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

describe("perCapita", () => {
  const population = buildPopulationLookup([
    { entity: "United States", code: "USA", points: [[1990, 250], [2000, 280]] },
  ]);

  it("divides by population on (code, year); missing years become gaps", () => {
    const { series, dropped } = perCapita([SERIES[0]], population);
    expect(dropped).toEqual([]);
    // 2010 has no population -> gap
    expect(series[0].points).toEqual([
      [1990, 50 / 250],
      [2000, 75 / 280],
    ]);
  });

  it("drops entities with no population data and reports them", () => {
    const { series, dropped } = perCapita(SERIES, population);
    expect(dropped).toEqual(["Japan"]);
    expect(series).toHaveLength(1);
  });
});

describe("isNormalisedUnit", () => {
  it("flags already-normalised units", () => {
    for (const unit of ["tonnes per person", "per capita", "deaths per 1,000", "%", "share of GDP"]) {
      expect(isNormalisedUnit(unit)).toBe(true);
    }
  });

  it("passes absolute units", () => {
    for (const unit of ["tonnes", "years", "international-$ in 2021 prices", undefined]) {
      expect(isNormalisedUnit(unit)).toBe(false);
    }
  });
});

describe("applyTransforms", () => {
  it("applies in order and collects caveats", () => {
    const { series, caveats } = applyTransforms(SERIES, [{ kind: "indexTo100", baseYear: 1990 }]);
    expect(series).toHaveLength(1);
    expect(caveats[0]).toMatch(/Japan/);
  });

  it("skips perCapita with a caveat when the unit is already normalised", () => {
    const { series, caveats } = applyTransforms(
      SERIES,
      [{ kind: "perCapita" }],
      { unit: "tonnes per person", population: {} }
    );
    expect(series).toEqual(SERIES); // untouched
    expect(caveats[0]).toMatch(/already normalised/);
  });

  it("skips perCapita with a caveat when population data is missing", () => {
    const { caveats } = applyTransforms(SERIES, [{ kind: "perCapita" }], { unit: "tonnes" });
    expect(caveats[0]).toMatch(/population data unavailable/);
  });
});
