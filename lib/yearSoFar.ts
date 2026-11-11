// The year-so-far numbers in the home page "Right now" strip. Books and pages reuse the
// /analytics reading stats, and Session Days reuse summariseYear, so the two pages agree.

import fs from "fs";
import path from "path";
import { getAllBooks } from "./books.ts";
import { MONTHS } from "./currentReads.ts";
import { computeReadingStats, type StatsBook } from "./readingStats.ts";
import { summariseYear, type Session } from "./workoutDay.ts";

export interface YearSoFar {
  year: number;
  /** Dated Books read this year, podcasts excluded. */
  books: number;
  pages: number;
  /**
   * Null when the year has no workout file (or an empty one). The file is converted by hand
   * and can be weeks old, so the count always travels with the last date it covers.
   */
  sessionDays: { count: number; asOf: string } | null;
}

/** "2026-10-11" → "11 Oct". Parsed by hand so no timezone can shift the day. */
export function formatAsOf(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1]}`;
}

export function computeYearSoFar(
  year: number,
  books: StatsBook[],
  workouts: Record<string, Session[]> | null,
): YearSoFar {
  const thisYear = computeReadingStats(books).byYear.find((entry) => entry.year === year);
  const dates = Object.keys(workouts ?? {}).sort();
  return {
    year,
    books: thisYear?.books ?? 0,
    pages: thisYear?.pages ?? 0,
    sessionDays:
      workouts && dates.length > 0
        ? { count: summariseYear(workouts).sessionDays, asOf: dates[dates.length - 1] }
        : null,
  };
}

/** The numbers for one year from the site's own files. Read at build time by the home page. */
export function getYearSoFar(year: number): YearSoFar {
  const workoutsFile = path.join(process.cwd(), `public/data/workouts-${year}.json`);
  const workouts = fs.existsSync(workoutsFile)
    ? (JSON.parse(fs.readFileSync(workoutsFile, "utf8")) as Record<string, Session[]>)
    : null;
  return computeYearSoFar(year, getAllBooks().map((book) => book.frontmatter), workouts);
}
