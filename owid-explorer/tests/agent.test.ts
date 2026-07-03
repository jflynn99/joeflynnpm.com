import { describe, expect, it } from "vitest";
import { resolveProvider } from "../lib/agent/providers";
import { buildSeriesPreview } from "../lib/agent/preview";
import { parseChartCsv } from "../lib/owid/parse";

describe("resolveProvider", () => {
  it("prefers a client key for anthropic/openai", () => {
    const sel = resolveProvider(
      { provider: "anthropic", key: "sk-ant-test" },
      { LLM_PROVIDER: "openai", OPENAI_API_KEY: "server-key" }
    );
    expect(sel).toEqual({ provider: "anthropic", apiKey: "sk-ant-test", source: "client" });
  });

  it("never accepts ollama from client headers (SSRF guard)", () => {
    const sel = resolveProvider({ provider: "ollama", key: "anything" }, {});
    expect(sel).toBeNull();
  });

  it("falls back to server env config", () => {
    const sel = resolveProvider({}, { LLM_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "k" });
    expect(sel).toEqual({ provider: "anthropic", apiKey: "k", source: "server" });
  });

  it("allows ollama from env without a key", () => {
    const sel = resolveProvider({}, { LLM_PROVIDER: "ollama" });
    expect(sel).toEqual({ provider: "ollama", source: "server" });
  });

  it("returns null when nothing is configured", () => {
    expect(resolveProvider({}, {})).toBeNull();
    // env provider without its key is not configured
    expect(resolveProvider({}, { LLM_PROVIDER: "anthropic" })).toBeNull();
  });
});

describe("buildSeriesPreview", () => {
  const CSV = `entity,code,year,co2
United States,USA,1990,10
United States,USA,2000,20
United States,USA,2010,30
Japan,JPN,2000,5`;

  it("summarises each (column, entity) pair without exposing full data", () => {
    const previews = buildSeriesPreview(parseChartCsv(CSV));
    expect(previews).toHaveLength(2);
    const usa = previews.find((p) => p.code === "USA")!;
    expect(usa).toMatchObject({
      column: "co2",
      firstYear: 1990,
      lastYear: 2010,
      count: 3,
      min: 10,
      max: 30,
      mean: 20,
      firstValue: 10,
      lastValue: 30,
    });
  });
});
