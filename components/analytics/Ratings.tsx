"use client";

import { useState } from "react";
import type { RatingCount, YearRating } from "@/lib/readingStats";
import { YearAxis, yearGridStyle } from "./YearAxis";

const STARS = [1, 2, 3, 4, 5];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Where a rating sits on the plot, as a percentage up from the 1★ line. */
const heightOf = (rating: number) => `${((rating - 1) / (STARS.length - 1)) * 100}%`;

/**
 * Ratings: how Joe rates overall (the distribution, every Book), then whether
 * that has changed (one dot per year at its average rating, Dated Books only).
 * Hover, focus or tap a dot for the exact average.
 */
export function Ratings({
  ratings,
  ratingByYear,
  years,
}: {
  ratings: RatingCount[];
  ratingByYear: YearRating[];
  years: number[];
}) {
  const [active, setActive] = useState<number | null>(null);

  const max = Math.max(...ratings.map((r) => r.count), 1);
  const byYear = new Map(ratingByYear.map((y) => [y.year, y]));
  const current = active === null ? null : byYear.get(active) ?? null;

  return (
    <div>
      <h3 className="mb-1 text-lg font-semibold">Ratings</h3>
      <p className="mb-4 text-sm text-muted">
        How many books got each rating, then the average rating for each year. Unrated books are left out of
        the yearly averages, and a year with no rated books has no dot. The yearly dots cover books with a recorded
        finish date.
      </p>

      <ol className="space-y-2">
        {[...ratings].reverse().map((r) => (
          <li
            key={r.rating}
            className="grid grid-cols-[3.5rem_1fr_2rem] items-center gap-x-3 text-sm sm:grid-cols-[6.5rem_1fr_2rem]"
          >
            <span className="text-right text-muted">
              <span aria-hidden>{"★".repeat(r.rating)}</span>
              <span className="sr-only">{plural(r.rating, "star")}</span>
            </span>
            <div className="h-5 overflow-hidden rounded bg-card" aria-hidden>
              <div className="h-full rounded bg-accent" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
            <span className="tabular-nums text-muted-foreground">
              {r.count}
              <span className="sr-only"> {r.count === 1 ? "book" : "books"}</span>
            </span>
          </li>
        ))}
      </ol>

      <p className="mb-2 mt-6 text-sm font-medium text-muted">Average rating per year</p>

      {/* Readout: the hover / tap detail, announced to screen readers too. */}
      <p className="mb-3 min-h-5 text-sm tabular-nums" aria-live="polite">
        {current ? (
          <>
            <span className="font-semibold">{current.year}</span>
            <span className="text-muted">
              {" · "}
              {current.average}★ average across {plural(current.rated, "rated book")}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Hover over or tap a dot for the year&rsquo;s average.</span>
        )}
      </p>

      <div onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}>
        <div className="relative h-32 border-b border-border">
          {/* One faint line per star, 5★ at the top and 1★ at the bottom. */}
          <div aria-hidden className="absolute inset-x-0 inset-y-2">
            {STARS.map((star) => (
              <div
                key={star}
                className="absolute inset-x-0 border-t border-border"
                style={{ bottom: heightOf(star) }}
              >
                <span className="absolute -top-2 left-0 bg-background pr-1 text-[10px] leading-4 tabular-nums text-muted">
                  {star}★
                </span>
              </div>
            ))}
          </div>

          <div className="relative grid h-full gap-1 sm:gap-2" style={yearGridStyle(years.length)}>
            {years.map((year) => {
              const entry = byYear.get(year);
              if (!entry) return <span key={year} aria-hidden />;
              const isActive = active === year;
              const dim = active !== null && !isActive;
              return (
                <button
                  key={year}
                  type="button"
                  aria-label={`${year}: ${entry.average} stars average across ${plural(entry.rated, "rated book")}`}
                  className="relative h-full rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                  onPointerEnter={(e) => e.pointerType === "mouse" && setActive(year)}
                  onFocus={() => setActive(year)}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive(year)}
                >
                  <span className="absolute inset-x-0 inset-y-2">
                    <span
                      className={`absolute left-1/2 block h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full bg-accent transition-opacity ${isActive ? "ring-2 ring-foreground" : ""}`}
                      style={{ bottom: heightOf(entry.average), opacity: dim ? 0.45 : 1 }}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <YearAxis years={years} />
      </div>
    </div>
  );
}
