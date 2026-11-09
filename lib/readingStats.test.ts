import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { computeReadingStats } from "./readingStats.ts";

function book(overrides: Record<string, unknown> = {}) {
  return {
    title: "A Book",
    author: "An Author",
    rating: 4,
    dateRead: "2024-05-01",
    pages: 300,
    ...overrides,
  };
}

test("totals count every Book, dated or not", () => {
  const stats = computeReadingStats([
    book({ pages: 300 }),
    book({ pages: 200, undated: true, dateRead: "2018-02-21" }),
  ]);
  assert.equal(stats.totalBooks, 2);
  assert.equal(stats.totalPages, 500);
});

test("a Book without a page count adds no pages but still counts", () => {
  const stats = computeReadingStats([book({ pages: 300 }), book({ pages: 0 }), book({ pages: undefined })]);
  assert.equal(stats.totalBooks, 3);
  assert.equal(stats.totalPages, 300);
});

test("only Dated Books appear on the charts over time", () => {
  const stats = computeReadingStats([
    book({ dateRead: "2024-05-01", pages: 300 }),
    book({ dateRead: "2024-11-30", pages: 100 }),
    book({ dateRead: "2026-10-31", pages: 464 }),
    // Logged in bulk in 2018 with no real read date.
    book({ dateRead: "2018-02-21", pages: 900, undated: true }),
  ]);
  assert.deepEqual(stats.byYear, [
    { year: 2024, books: 2, pages: 400 },
    { year: 2026, books: 1, pages: 464 },
  ]);
  assert.equal(stats.datedBooks, 3);
});

test("podcasts stay out of every stat, even with a page count", () => {
  const stats = computeReadingStats([
    book({ author: "Dan Carlin", pages: 288 }),
    book({ author: "Dan Carlin", pages: 690, rating: 5, podcast: true }),
  ]);
  assert.equal(stats.totalBooks, 1);
  assert.equal(stats.totalPages, 288);
  assert.equal(stats.averageRating, 4);
  assert.deepEqual(stats.byYear, [{ year: 2024, books: 1, pages: 288 }]);
  assert.deepEqual(stats.topAuthors, [{ author: "Dan Carlin", count: 1 }]);
});

test("average rating ignores unrated Books and rounds to 2 places", () => {
  const stats = computeReadingStats([book({ rating: 5 }), book({ rating: 4 }), book({ rating: 4 }), book({ rating: 0 })]);
  assert.equal(stats.averageRating, 4.33);
  assert.deepEqual(
    stats.ratings.map((r) => r.count),
    [0, 0, 0, 2, 1]
  );
});

test("top authors are ranked by Books read, ties alphabetical, capped at 8", () => {
  const authors = ["Zed", "Abe", "Abe", "Cy", "Cy", "Cy", "D", "E", "F", "G", "H", "I"];
  const stats = computeReadingStats(authors.map((author) => book({ author })));
  assert.deepEqual(stats.topAuthors.slice(0, 3), [
    { author: "Cy", count: 3 },
    { author: "Abe", count: 2 },
    { author: "D", count: 1 },
  ]);
  assert.equal(stats.topAuthors.length, 8);
});

// The stats are only as good as the frontmatter, so hold the content to it.
// `pages: 0` is the explicit "no page count" for audio.
test("every Book in content/books has a page count", () => {
  const dir = path.join(process.cwd(), "content/books");
  const missing = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .filter((file) => {
      const { pages } = matter(fs.readFileSync(path.join(dir, file), "utf8")).data;
      return !Number.isInteger(pages) || pages < 0;
    });
  assert.deepEqual(missing, [], "run `node scripts/add-pages.mjs`, or ask Joe for the count");
});
