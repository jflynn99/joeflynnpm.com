"use client";

// Overlay builder UI. All state lives in the ?s= URL param as an encoded
// ChartSpec (SPEC.md §5) — every edit replaces the URL and the server refetches
// the data. This component never fetches OWID data itself.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  encodeSpec,
  withAutoCaveats,
  type ChartSpec,
  type SeriesRef,
  type Transform,
} from "@/lib/chartSpec";
import { isNormalisedUnit, type PopulationLookup } from "@/lib/transforms/perCapita";
import { seriesKey } from "@/lib/chartSpec";
import type { ColumnMeta, EntitiesResponse, EntitySeries, GrapherMetadata } from "@/lib/owid/types";
import ChartRenderer from "@/components/charts/ChartRenderer";
import CitationFooter from "@/components/charts/CitationFooter";
import SearchBox from "@/components/search/SearchBox";

interface Props {
  spec: ChartSpec;
  data: Record<string, EntitySeries[]>;
  columns: Record<string, ColumnMeta>;
  population?: PopulationLookup;
}

function refLabel(ref: SeriesRef, columns: Record<string, ColumnMeta>): string {
  return columns[seriesKey(ref)]?.titleShort ?? `${ref.slug} · ${ref.column}`;
}

function autoTitle(series: SeriesRef[], columns: Record<string, ColumnMeta>): string {
  const names = [...new Set(series.map((r) => refLabel(r, columns)))];
  return names.join(" vs ") || "Overlay";
}

export default function OverlayBuilder({ spec, data, columns, population }: Props) {
  const router = useRouter();
  const [entityOptions, setEntityOptions] = useState<EntitiesResponse | null>(null);
  const [entityPickerOpen, setEntityPickerOpen] = useState(false);
  const [entityFilter, setEntityFilter] = useState("");
  const [years, setYears] = useState<[string, string]>([
    String(spec.timeRange[0]),
    String(spec.timeRange[1]),
  ]);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    setYears([String(spec.timeRange[0]), String(spec.timeRange[1])]);
  }, [spec.timeRange]);

  // Entity options come from the first series' chart
  const firstSlug = spec.series[0]?.slug;
  useEffect(() => {
    if (!firstSlug) return;
    let cancelled = false;
    fetch(`/api/owid/entities?slug=${encodeURIComponent(firstSlug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !cancelled && setEntityOptions(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [firstSlug]);

  const push = useCallback(
    (next: ChartSpec) => {
      router.replace(`/overlay?s=${encodeSpec(withAutoCaveats(next))}`, { scroll: false });
    },
    [router]
  );

  function updateSeries(nextSeries: SeriesRef[], title?: string) {
    if (nextSeries.length === 0) {
      router.replace("/overlay");
      return;
    }
    const usesRight = nextSeries.some((r) => r.axis === "right");
    push({
      ...spec,
      series: nextSeries,
      title: title ?? autoTitle(nextSeries, columns),
      axes: { left: spec.axes.left, right: usesRight ? (spec.axes.right ?? {}) : undefined },
    });
  }

  async function addSeries(slug: string) {
    setAddError(null);
    try {
      const res = await fetch(`/api/owid/data?slug=${encodeURIComponent(slug)}&format=metadata`);
      if (!res.ok) throw new Error();
      const meta: GrapherMetadata = await res.json();
      const numericColumns = Object.values(meta.columns).filter((c) => c.type !== "Continent");
      const newColumn = numericColumns[0];
      if (!newColumn) throw new Error();

      // New series goes to the right axis when its unit differs from the left's
      const leftRef = spec.series.find((r) => r.axis === "left");
      const leftUnit = leftRef ? columns[seriesKey(leftRef)]?.unit : undefined;
      const axis: "left" | "right" =
        spec.series.length > 0 && newColumn.unit !== leftUnit ? "right" : "left";

      // The new ref's metadata isn't in `columns` yet — title it from the fetch
      const names = [
        ...new Set([...spec.series.map((r) => refLabel(r, columns)), newColumn.titleShort]),
      ];
      updateSeries(
        [...spec.series, { slug, column: newColumn.shortName, axis }],
        names.join(" vs ")
      );
    } catch {
      setAddError(`Could not add "${slug}" — chart metadata unavailable.`);
    }
  }

  // Default index base year: the latest start-year across all series, so every
  // series has a value to index against.
  function defaultBaseYear(): number {
    let base = spec.timeRange[0];
    for (const ref of spec.series) {
      const firstYears = (data[seriesKey(ref)] ?? [])
        .filter((s) => s.points.length > 0)
        .map((s) => s.points[0][0]);
      if (firstYears.length > 0) base = Math.max(base, Math.min(...firstYears));
    }
    return base;
  }

  function toggleTransform(kind: Transform["kind"], baseYear?: number) {
    const active = spec.transforms.some((t) => t.kind === kind);
    let transforms: Transform[];
    if (active) {
      transforms = spec.transforms.filter((t) => t.kind !== kind);
    } else {
      const t: Transform =
        kind === "indexTo100"
          ? { kind, baseYear: baseYear ?? defaultBaseYear() }
          : { kind };
      transforms = [...spec.transforms, t];
    }
    // zScore and log scale are mutually exclusive (values cross zero)
    const axes =
      transforms.some((t) => t.kind === "zScore")
        ? {
            left: { ...spec.axes.left, log: undefined },
            right: spec.axes.right ? { ...spec.axes.right, log: undefined } : undefined,
          }
        : spec.axes;
    push({ ...spec, transforms, axes });
  }

  function setBaseYear(year: number) {
    if (!Number.isInteger(year)) return;
    push({
      ...spec,
      transforms: spec.transforms.map((t) =>
        t.kind === "indexTo100" ? { kind: "indexTo100", baseYear: year } : t
      ),
    });
  }

  function toggleLog(side: "left" | "right") {
    if (spec.transforms.some((t) => t.kind === "zScore")) return;
    const axes = {
      ...spec.axes,
      [side]: { ...(side === "left" ? spec.axes.left : spec.axes.right ?? {}), log: side === "left" ? !spec.axes.left.log : !spec.axes.right?.log },
    };
    push({ ...spec, axes });
  }

  function toggleEntity(code: string) {
    const next = spec.entities.includes(code)
      ? spec.entities.filter((c) => c !== code)
      : [...spec.entities, code];
    if (next.length === 0) return;
    push({ ...spec, entities: next });
  }

  function applyTime() {
    const from = Number(years[0]);
    const to = Number(years[1]);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) return;
    push({ ...spec, timeRange: [from, to] });
  }

  const indexTransform = spec.transforms.find((t) => t.kind === "indexTo100");
  const hasZScore = spec.transforms.some((t) => t.kind === "zScore");
  const allNormalised = spec.series.every((r) =>
    isNormalisedUnit(columns[seriesKey(r)]?.unit)
  );
  const filteredEntities = (entityOptions?.entities ?? [])
    .filter((e) => e.entity.toLowerCase().includes(entityFilter.trim().toLowerCase()))
    .slice(0, 200);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{spec.title}</h1>
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <ChartRenderer spec={spec} data={data} columns={columns} population={population} />
          <CitationFooter columns={Object.values(columns)} />
        </div>
      </div>

      <aside className="space-y-6">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Series</h2>
          <ul className="mt-2 space-y-2">
            {spec.series.map((ref, i) => (
              <li
                key={seriesKey(ref) + ref.axis}
                className="rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-sm"
              >
                <div className="font-medium">{refLabel(ref, columns)}</div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex overflow-hidden rounded border border-gray-300 text-xs">
                    {(["left", "right"] as const).map((axis) => (
                      <button
                        key={axis}
                        type="button"
                        onClick={() =>
                          updateSeries(spec.series.map((r, j) => (j === i ? { ...r, axis } : r)))
                        }
                        className={`px-2 py-0.5 ${ref.axis === axis ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50"}`}
                      >
                        {axis === "left" ? "L axis" : "R axis"}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSeries(spec.series.filter((_, j) => j !== i))}
                    className="text-xs text-gray-400 hover:text-red-600"
                    aria-label={`Remove ${refLabel(ref, columns)}`}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <SearchBox placeholder="Add a series…" onSelect={(r) => addSeries(r.slug)} />
            {addError && <p className="mt-1 text-xs text-red-600">{addError}</p>}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Transforms</h2>
          <div className="mt-2 space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!indexTransform}
                onChange={() => toggleTransform("indexTo100")}
              />
              Index to 100
              {indexTransform && indexTransform.kind === "indexTo100" && (
                <input
                  type="number"
                  value={indexTransform.baseYear}
                  onChange={(e) => setBaseYear(Number(e.target.value))}
                  className="w-20 rounded border border-gray-300 px-1 py-0.5 text-xs"
                  aria-label="Base year"
                />
              )}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasZScore}
                onChange={() => toggleTransform("zScore")}
              />
              Z-score
            </label>
            <label className={`flex items-center gap-2 ${allNormalised ? "text-gray-400" : ""}`}>
              <input
                type="checkbox"
                disabled={allNormalised}
                checked={spec.transforms.some((t) => t.kind === "perCapita")}
                onChange={() => toggleTransform("perCapita")}
              />
              Per capita{allNormalised && " (already normalised)"}
            </label>
            <label className={`flex items-center gap-2 ${hasZScore ? "text-gray-400" : ""}`}>
              <input
                type="checkbox"
                disabled={hasZScore}
                checked={!!spec.axes.left.log}
                onChange={() => toggleLog("left")}
              />
              Log scale (left)
            </label>
            {spec.axes.right && (
              <label className={`flex items-center gap-2 ${hasZScore ? "text-gray-400" : ""}`}>
                <input
                  type="checkbox"
                  disabled={hasZScore}
                  checked={!!spec.axes.right.log}
                  onChange={() => toggleLog("right")}
                />
                Log scale (right)
              </label>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Countries</h2>
          <div className="mt-2 flex flex-wrap gap-1">
            {spec.entities.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => toggleEntity(code)}
                title="Remove"
                className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-red-50 hover:text-red-700"
              >
                {entityOptions?.entities.find((e) => e.code === code)?.entity ?? code} ×
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setEntityPickerOpen((v) => !v)}
            className="mt-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-gray-50"
          >
            {entityPickerOpen ? "Close" : "Add country ▾"}
          </button>
          {entityPickerOpen && (
            <div className="mt-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
              <input
                type="search"
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                placeholder="Filter…"
                className="mb-2 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none"
              />
              <ul className="max-h-48 overflow-auto text-sm">
                {!entityOptions && <li className="px-2 py-1 text-gray-400">Loading…</li>}
                {filteredEntities.map((e) => (
                  <li key={e.code}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-blue-50">
                      <input
                        type="checkbox"
                        checked={spec.entities.includes(e.code)}
                        onChange={() => toggleEntity(e.code)}
                      />
                      {e.entity}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Time range</h2>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="number"
              value={years[0]}
              onChange={(e) => setYears([e.target.value, years[1]])}
              className="w-20 rounded border border-gray-300 px-2 py-1.5 shadow-sm"
              aria-label="From year"
            />
            <span className="text-gray-500">to</span>
            <input
              type="number"
              value={years[1]}
              onChange={(e) => setYears([years[0], e.target.value])}
              className="w-20 rounded border border-gray-300 px-2 py-1.5 shadow-sm"
              aria-label="To year"
            />
            <button
              type="button"
              onClick={applyTime}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 shadow-sm hover:bg-gray-50"
            >
              Apply
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}
