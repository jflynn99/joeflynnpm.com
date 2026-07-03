import { describe, expect, it } from "vitest";
import {
  CORRELATION_CAVEAT,
  decodeSpec,
  encodeSpec,
  validateSpec,
  withAutoCaveats,
  type ChartSpec,
} from "../lib/chartSpec";

const VALID: ChartSpec = {
  v: 1,
  title: "CO₂ vs GDP per capita",
  series: [
    { slug: "co-emissions-per-capita", column: "emissions_total_per_capita", axis: "left" },
    { slug: "gdp-per-capita-worldbank", column: "ny_gdp_pcap_pp_kd", axis: "right" },
  ],
  transforms: [{ kind: "indexTo100", baseYear: 1990 }],
  axes: { left: {}, right: {} },
  entities: ["USA", "GBR"],
  timeRange: [1990, 2023],
  caveats: ["These series come from independent sources."],
};

describe("validateSpec", () => {
  it("accepts a valid spec", () => {
    expect(validateSpec(VALID)).toEqual({ ok: true, spec: VALID });
  });

  it("rejects a right-axis series without axes.right", () => {
    const bad = { ...VALID, axes: { left: {} } };
    const result = validateSpec(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/right axis/);
  });

  it("rejects inverted time ranges", () => {
    const result = validateSpec({ ...VALID, timeRange: [2023, 1990] });
    expect(result.ok).toBe(false);
  });

  it("rejects log scale combined with zScore", () => {
    const result = validateSpec({
      ...VALID,
      transforms: [{ kind: "zScore" }],
      axes: { left: { log: true }, right: {} },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid slugs", () => {
    const bad = { ...VALID, series: [{ ...VALID.series[0], slug: "../etc" }] };
    expect(validateSpec(bad).ok).toBe(false);
  });
});

describe("URL codec", () => {
  it("round-trips a spec through base64url", () => {
    const encoded = encodeSpec(VALID);
    expect(encoded).not.toMatch(/[+/=]/); // URL-safe
    const decoded = decodeSpec(encoded);
    expect(decoded).toEqual({ ok: true, spec: VALID });
  });

  it("fails gracefully on garbage", () => {
    expect(decodeSpec("not-a-spec!!!").ok).toBe(false);
  });
});

describe("withAutoCaveats", () => {
  it("adds the correlation caveat when series span multiple charts", () => {
    const spec = withAutoCaveats({ ...VALID, caveats: undefined });
    expect(spec.caveats).toContain(CORRELATION_CAVEAT);
  });

  it("removes it again when the overlay collapses to one chart", () => {
    const single = withAutoCaveats({
      ...VALID,
      series: [VALID.series[0]],
      axes: { left: {} },
      caveats: [CORRELATION_CAVEAT],
    });
    expect(single.caveats).toBeUndefined();
  });

  it("is idempotent", () => {
    const once = withAutoCaveats(VALID);
    expect(withAutoCaveats(once)).toEqual(once);
  });
});
