import Link from "next/link";
import { OTHER_GENRES, type GenreSeries } from "@/lib/readingStats";
import { yearGridStyle } from "./YearAxis";

/** "3 in 2024, 1 in 2025": the chart's figures as text, for screen readers. */
function describeSeries(series: GenreSeries) {
  if (series.byYear.length === 0) return `${series.genre}: no Dated Books`;
  return `${series.genre}: ${series.byYear.map((y) => `${y.count} in ${y.year}`).join(", ")}`;
}

/**
 * Genres over time as small multiples: one mini column chart per Genre, all on
 * the same years and one shared vertical scale, so heights compare honestly.
 * Each named Genre links to that Genre on /books; Other is not one Genre, so
 * it does not link.
 */
export function GenresOverTime({ genres, years }: { genres: GenreSeries[]; years: number[] }) {
  const max = Math.max(...genres.flatMap((g) => g.byYear.map((y) => y.count)), 1);
  const first = years[0];
  const last = years[years.length - 1];

  return (
    <div>
      <h3 className="mb-1 text-lg font-semibold">Genres over time</h3>
      <p className="mb-4 text-sm text-muted">
        Books per year in each Genre, sorted by total. Every chart shares one scale: the tallest column is{" "}
        {max} {max === 1 ? "book" : "books"}. A book with two Genres counts in both. The columns cover books
        with a recorded finish date; the number beside each name counts every book.
      </p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
        {genres.map((series) => {
          const counts = new Map(series.byYear.map((y) => [y.year, y.count]));
          const named = series.genre !== OTHER_GENRES;
          return (
            <li key={series.genre} className="min-w-0">
              <div className="mb-2 flex items-baseline justify-between gap-2 text-sm">
                {named ? (
                  <Link
                    href={`/books?genre=${encodeURIComponent(series.genre)}`}
                    className="truncate font-medium hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    title={`See ${series.genre} on /books`}
                  >
                    {series.genre}
                  </Link>
                ) : (
                  <span className="truncate font-medium">{series.genre}</span>
                )}
                <span className="shrink-0 tabular-nums text-muted">{series.total}</span>
              </div>
              <div
                role="img"
                aria-label={describeSeries(series)}
                className="grid h-16 items-end gap-px border-b border-border"
                style={yearGridStyle(years.length)}
              >
                {years.map((year) => {
                  const count = counts.get(year) ?? 0;
                  return (
                    <span
                      key={year}
                      className="block w-full rounded-t-[1px] bg-accent"
                      style={{ height: `${(count / max) * 100}%` }}
                    />
                  );
                })}
              </div>
              <div aria-hidden className="mt-1 flex justify-between text-[10px] tabular-nums text-muted">
                <span>{first}</span>
                <span>{last}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
