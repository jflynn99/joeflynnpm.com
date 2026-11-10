"use client";

import { useState } from "react";
import type { YearStats } from "@/lib/readingStats";
import { YearAxis, yearGridStyle, yearRange } from "./YearAxis";
import { FICTION, NON_FICTION, Swatch } from "./FictionLegend";

/**
 * Books per year as columns stacked Fiction / Non-fiction, with pages per year
 * on the same years beneath. Hover, focus or tap a year for its figures.
 */
export function BooksPerYear({ byYear, datedBooks }: { byYear: YearStats[]; datedBooks: number }) {
  const [active, setActive] = useState<number | null>(null);

  const stats = new Map(byYear.map((y) => [y.year, y]));
  const years = yearRange(byYear.map((y) => y.year));
  const empty = (year: number): YearStats => ({ year, books: 0, pages: 0, fiction: 0, nonFiction: 0 });
  const rows = years.map((year) => stats.get(year) ?? empty(year));

  const maxBooks = Math.max(...rows.map((y) => y.books), 1);
  const maxPages = Math.max(...rows.map((y) => y.pages), 1);
  const current = active === null ? null : stats.get(active) ?? empty(active);

  const pct = (value: number, max: number) => `${(value / max) * 100}%`;

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-lg font-semibold">Books per year</h3>
        <div className="flex gap-4 text-sm text-muted">
          <Swatch color={FICTION} label="Fiction" />
          <Swatch color={NON_FICTION} label="Non-fiction" />
        </div>
      </div>
      <p className="mb-4 text-sm text-muted">
        Covers the {datedBooks} books with a recorded finish date. Earlier reads
        were logged without one, so they count in the totals but not here.
      </p>

      {/* Readout: the hover / tap detail, announced to screen readers too. */}
      <p className="mb-3 min-h-5 text-sm tabular-nums" aria-live="polite">
        {current ? (
          <>
            <span className="font-semibold">{current.year}</span>
            <span className="text-muted">
              {" · "}
              {current.books} {current.books === 1 ? "book" : "books"}: {current.fiction} Fiction,{" "}
              {current.nonFiction} Non-fiction · {current.pages.toLocaleString()} pages
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Hover over or tap a year for its figures.</span>
        )}
      </p>

      <div onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}>
        {/* Books, stacked Fiction (bottom) / Non-fiction (top) */}
        <div className="grid h-40 items-end gap-1 border-b border-border sm:gap-2" style={yearGridStyle(rows.length)}>
          {rows.map((y) => {
            const dim = active !== null && active !== y.year;
            return (
              <button
                key={y.year}
                type="button"
                aria-label={`${y.year}: ${y.books} books, ${y.fiction} Fiction, ${y.nonFiction} Non-fiction, ${y.pages.toLocaleString()} pages`}
                className="flex h-full flex-col justify-end rounded-sm transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                style={{ opacity: dim ? 0.45 : 1 }}
                onPointerEnter={(e) => e.pointerType === "mouse" && setActive(y.year)}
                onFocus={() => setActive(y.year)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(y.year)}
              >
                <span className="flex w-full flex-col justify-end gap-[2px]" style={{ height: pct(y.books, maxBooks) }}>
                  {y.nonFiction > 0 && (
                    <span
                      className="block w-full rounded-t"
                      style={{ flexGrow: y.nonFiction, background: NON_FICTION }}
                    />
                  )}
                  {y.fiction > 0 && (
                    <span
                      className={`block w-full ${y.nonFiction > 0 ? "" : "rounded-t"}`}
                      style={{ flexGrow: y.fiction, background: FICTION }}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <YearAxis years={years} />

        {/* Pages, on the same years */}
        <p className="mb-2 mt-5 text-sm font-medium text-muted">Pages per year</p>
        {/* Mouse and tap only: the year buttons above already read out the pages. */}
        <div aria-hidden className="grid h-16 items-end gap-1 border-b border-border sm:gap-2" style={yearGridStyle(rows.length)}>
          {rows.map((y) => {
            const dim = active !== null && active !== y.year;
            return (
              <div
                key={y.year}
                className="flex h-full flex-col justify-end transition-opacity"
                style={{ opacity: dim ? 0.45 : 1 }}
                onPointerEnter={(e) => e.pointerType === "mouse" && setActive(y.year)}
                onClick={() => setActive(y.year)}
              >
                <span
                  className="block w-full rounded-t bg-muted-foreground"
                  style={{ height: pct(y.pages, maxPages) }}
                />
              </div>
            );
          })}
        </div>
        <YearAxis years={years} />
      </div>

    </div>
  );
}
