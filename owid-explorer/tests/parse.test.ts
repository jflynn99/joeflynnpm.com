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

// e.g. gdp-per-capita-worldbank carries a string owid_region column
const WITH_STRING_COLUMN = `entity,code,year,ny_gdp_pcap_pp_kd,owid_region
United States,USA,2000,50000,North America
United States,USA,2001,51000,North America`;

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

  it("excludes non-numeric columns like owid_region", () => {
    const data = parseChartCsv(WITH_STRING_COLUMN);
    expect(data.columns).toEqual(["ny_gdp_pcap_pp_kd"]);
    expect(data.rows[0].values).toEqual({ ny_gdp_pcap_pp_kd: 50000 });
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
