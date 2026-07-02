import { describe, expect, it } from "vitest";
import { parseChartCsv, parseCsv, toEntitySeries } from "../lib/owid/parse";

describe("parseCsv", () => {
  it("handles quoted fields with commas and escaped quotes", () => {
    const rows = parseCsv('a,"b, c","d ""e"""\n1,2,3');
    expect(rows).toEqual([
      ["a", "b, c", 'd "e"'],
      ["1", "2", "3"],
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

const SAMPLE = `entity,code,year,life_expectancy_0
United Kingdom,GBR,2000,77.8491
United Kingdom,GBR,2001,78.1208
United States,USA,2001,76.9194
United States,USA,2000,76.8058
United States,USA,2002,`;

describe("parseChartCsv", () => {
  it("parses OWID chart CSV into typed rows", () => {
    const data = parseChartCsv(SAMPLE);
    expect(data.columns).toEqual(["life_expectancy_0"]);
    expect(data.rows).toHaveLength(5);
    expect(data.rows[0]).toEqual({
      entity: "United Kingdom",
      code: "GBR",
      year: 2000,
      values: { life_expectancy_0: 77.8491 },
    });
    // empty cell -> null
    expect(data.rows[4].values.life_expectancy_0).toBeNull();
  });
});

describe("toEntitySeries", () => {
  it("groups by entity, sorts by year, and drops nulls as gaps", () => {
    const series = toEntitySeries(parseChartCsv(SAMPLE), "life_expectancy_0");
    expect(series.map((s) => s.code)).toEqual(["GBR", "USA"]);
    const usa = series[1];
    expect(usa.points).toEqual([
      [2000, 76.8058],
      [2001, 76.9194],
    ]); // 2002 null omitted, years sorted despite CSV order
  });
});
