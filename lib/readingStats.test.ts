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
    { year: 2024, books: 2, pages: 400, fiction: 0, nonFiction: 2 },
    { year: 2026, books: 1, pages: 464, fiction: 0, nonFiction: 1 },
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
  assert.deepEqual(stats.byYear, [{ year: 2024, books: 1, pages: 288, fiction: 0, nonFiction: 1 }]);
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

test("Fiction and Non-fiction totals follow the site's Fiction rule", () => {
  const stats = computeReadingStats([
    book({ genres: ["Sci-Fi"] }), // Fiction
    book({ genres: ["Classics"] }), // Fiction: Classics alone
    book({ genres: ["Classics", "Literary Fiction"] }), // Fiction
    // Classics is the only Fiction Genre and there is a Non-fiction one.
    book({ genres: ["Classics", "Philosophy"] }), // Non-fiction
    book({ genres: ["Fantasy", "History"] }), // Fiction: one of each
    book({ genres: [] }), // Non-fiction: no Genres
    book({ genres: undefined }), // Non-fiction: no Genres
    book({ genres: ["Science"] }), // Non-fiction
  ]);
  assert.equal(stats.fictionBooks, 4);
  assert.equal(stats.nonFictionBooks, 4);
});

test("Fiction and Non-fiction totals leave podcasts out", () => {
  const stats = computeReadingStats([
    book({ genres: ["History"] }),
    book({ genres: ["History"], podcast: true }),
    book({ genres: ["Horror"], podcast: true }),
  ]);
  assert.equal(stats.fictionBooks, 0);
  assert.equal(stats.nonFictionBooks, 1);
});

test("each year splits its Dated Books into Fiction and Non-fiction", () => {
  const stats = computeReadingStats([
    book({ dateRead: "2024-02-01", genres: ["Sci-Fi"] }),
    book({ dateRead: "2024-06-01", genres: ["Classics", "Literary Fiction"] }),
    book({ dateRead: "2024-09-01", genres: ["Classics", "Philosophy"] }),
    book({ dateRead: "2025-03-01", genres: ["History"] }),
    book({ dateRead: "2025-04-01" }), // no Genres: Non-fiction
    // Left out of the years: undated, and a podcast.
    book({ dateRead: "2018-02-21", genres: ["Fantasy"], undated: true }),
    book({ dateRead: "2025-05-01", genres: ["Horror"], podcast: true }),
  ]);
  assert.deepEqual(
    stats.byYear.map(({ year, books, fiction, nonFiction }) => ({ year, books, fiction, nonFiction })),
    [
      { year: 2024, books: 3, fiction: 2, nonFiction: 1 },
      { year: 2025, books: 2, fiction: 0, nonFiction: 2 },
    ]
  );
});

test("the publication strip has every Book with a year, oldest first, undated Books included", () => {
  const stats = computeReadingStats([
    book({ title: "Neuromancer", author: "William Gibson", published: 1984 }),
    book({ title: "Phaedo", author: "Plato", published: -380, undated: true, dateRead: "2018-02-24" }),
    book({ title: "Red Country", author: "Joe Abercrombie", published: 2012 }),
    book({ title: "Count Zero", author: "William Gibson", published: 1984 }),
    // Left off: a podcast, and a Book with no year yet.
    book({ title: "Blueprint for Armageddon", author: "Dan Carlin", published: 2014, podcast: true }),
    book({ title: "No Year", published: undefined }),
  ]);
  assert.deepEqual(stats.publicationYears, [
    { title: "Phaedo", author: "Plato", year: -380 },
    { title: "Count Zero", author: "William Gibson", year: 1984 },
    { title: "Neuromancer", author: "William Gibson", year: 1984 },
    { title: "Red Country", author: "Joe Abercrombie", year: 2012 },
  ]);
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

// The original publication year, for the strip on /analytics. Podcasts are
// not Books in the stats, so they need none.
test("every Book in content/books has a publication year, podcasts excepted", () => {
  const dir = path.join(process.cwd(), "content/books");
  const missing = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .filter((file) => {
      const { published, podcast } = matter(fs.readFileSync(path.join(dir, file), "utf8")).data;
      return !podcast && !Number.isInteger(published);
    });
  assert.deepEqual(missing, [], "run `node scripts/add-pages.mjs`, or ask Joe for the year");
});
