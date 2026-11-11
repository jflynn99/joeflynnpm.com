import { test } from "node:test";
import assert from "node:assert/strict";
import { computeYearSoFar, formatAsOf, getYearSoFar } from "./yearSoFar.ts";
import { computeReadingStats, type StatsBook } from "./readingStats.ts";
import { getAllBooks } from "./books.ts";

function book(overrides: Partial<StatsBook> = {}): StatsBook {
  return { title: "Piranesi", author: "Susanna Clarke", rating: 4, dateRead: "2026-03-14", pages: 272, ...overrides };
}

test("Books and pages this year count Dated Books read in that year only", () => {
  const result = computeYearSoFar(
    2026,
    [
      book({ pages: 272 }),
      book({ title: "Circe", dateRead: "2026-09-01", pages: 393 }),
      book({ title: "Hamnet", dateRead: "2025-12-31", pages: 372 }),
      book({ title: "Old log", dateRead: "2026-01-05", undated: true, pages: 500 }),
      book({ title: "A podcast", dateRead: "2026-05-01", pages: 0, podcast: true }),
    ],
    null,
  );

  assert.equal(result.year, 2026);
  assert.equal(result.books, 2);
  assert.equal(result.pages, 665);
});

test("a year with no Books yet shows 0 Books and 0 pages", () => {
  const result = computeYearSoFar(2027, [book({ dateRead: "2026-12-30" })], null);

  assert.equal(result.books, 0);
  assert.equal(result.pages, 0);
});

const walk = { activity: "Walk", category: "Walk", minutes: 20, timeOfDay: null } as const;
const weights = { activity: "Weights", category: "Strength", minutes: 45, timeOfDay: "evening" } as const;

test("Session Days leave out walk-only days and carry the last date in the file", () => {
  const result = computeYearSoFar(2026, [], {
    "2026-01-02": [weights],
    "2026-10-11": [walk],
    "2026-03-05": [walk, weights],
    "2026-03-06": [],
  });

  assert.deepEqual(result.sessionDays, { count: 2, asOf: "2026-10-11" });
});

test("a missing workout file drops Session Days", () => {
  assert.equal(computeYearSoFar(2026, [], null).sessionDays, null);
});

test("an empty workout file drops Session Days too, as it has no date to show", () => {
  assert.equal(computeYearSoFar(2026, [], {}).sessionDays, null);
});

test("a year with no workout file on disk has Books but no Session Days", () => {
  const result = getYearSoFar(2099);

  assert.equal(result.year, 2099);
  assert.equal(result.books, 0);
  assert.equal(result.sessionDays, null);
});

test("the site's own data gives the same Books and pages as /analytics for that year", () => {
  const analytics = computeReadingStats(getAllBooks().map((book) => book.frontmatter));
  const year = analytics.byYear[analytics.byYear.length - 1].year;
  const result = getYearSoFar(year);
  const fromAnalytics = analytics.byYear.find((entry) => entry.year === year);

  assert.ok(result.books > 0);
  assert.equal(result.books, fromAnalytics?.books);
  assert.equal(result.pages, fromAnalytics?.pages);
});

test("2026 has a workout file, so Session Days come with a 2026 date", () => {
  const { sessionDays } = getYearSoFar(2026);

  assert.ok(sessionDays && sessionDays.count > 0);
  assert.match(sessionDays.asOf, /^2026-\d{2}-\d{2}$/);
});

test("the as-of date reads as day and month, with no timezone shift", () => {
  assert.equal(formatAsOf("2026-10-11"), "11 Oct");
  assert.equal(formatAsOf("2026-01-01"), "1 Jan");
});
