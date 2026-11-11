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
  assert.deepEqual(stats.topAuthors, [
    { author: "Dan Carlin", count: 1, fiction: 0, nonFiction: 1, averageRating: 4 },
  ]);
});

test("average rating ignores unrated Books and rounds to 2 places", () => {
  const stats = computeReadingStats([book({ rating: 5 }), book({ rating: 4 }), book({ rating: 4 }), book({ rating: 0 })]);
  assert.equal(stats.averageRating, 4.33);
  assert.deepEqual(
    stats.ratings.map((r) => r.count),
    [0, 0, 0, 2, 1]
  );
});

test("average rating per year is the mean of that year's rated Dated Books, to 2 places", () => {
  const stats = computeReadingStats([
    book({ dateRead: "2023-03-01", rating: 5 }),
    book({ dateRead: "2023-09-01", rating: 4 }),
    book({ dateRead: "2023-12-01", rating: 4 }),
    book({ dateRead: "2025-01-15", rating: 3 }),
  ]);
  assert.deepEqual(stats.ratingByYear, [
    { year: 2023, average: 4.33, rated: 3 },
    { year: 2025, average: 3, rated: 1 },
  ]);
});

test("average rating per year leaves unrated Books out of the mean", () => {
  const stats = computeReadingStats([
    book({ dateRead: "2024-02-01", rating: 5 }),
    book({ dateRead: "2024-06-01", rating: 3 }),
    book({ dateRead: "2024-08-01", rating: 0 }),
  ]);
  assert.deepEqual(stats.ratingByYear, [{ year: 2024, average: 4, rated: 2 }]);
});

test("average rating per year leaves undated Books out, however well they are rated", () => {
  const stats = computeReadingStats([
    book({ dateRead: "2024-02-01", rating: 3 }),
    // Logged in bulk in 2018: its date is not a read date.
    book({ dateRead: "2018-02-21", rating: 5, undated: true }),
  ]);
  assert.deepEqual(stats.ratingByYear, [{ year: 2024, average: 3, rated: 1 }]);
});

test("a year with no rated Books has no average, not a zero", () => {
  const stats = computeReadingStats([
    book({ dateRead: "2023-02-01", rating: 4 }),
    // 2024 has a Dated Book, but it is unrated.
    book({ dateRead: "2024-02-01", rating: 0 }),
    book({ dateRead: "2025-02-01", rating: 2 }),
  ]);
  assert.deepEqual(
    stats.ratingByYear.map((y) => y.year),
    [2023, 2025]
  );
  assert.equal(stats.byYear.length, 3);
});

test("no Dated Books means no yearly averages", () => {
  const stats = computeReadingStats([book({ undated: true }), book({ rating: 0 })]);
  assert.deepEqual(stats.ratingByYear, []);
});

test("podcasts stay out of the yearly averages and the ratings distribution", () => {
  const stats = computeReadingStats([
    book({ dateRead: "2024-02-01", rating: 2 }),
    book({ dateRead: "2024-03-01", rating: 5, podcast: true }),
  ]);
  assert.deepEqual(stats.ratingByYear, [{ year: 2024, average: 2, rated: 1 }]);
  assert.deepEqual(
    stats.ratings.map((r) => r.count),
    [0, 1, 0, 0, 0]
  );
});

test("the ratings distribution counts undated Books too", () => {
  const stats = computeReadingStats([
    book({ rating: 4 }),
    book({ rating: 4, undated: true, dateRead: "2018-02-21" }),
    book({ rating: 0 }),
  ]);
  assert.deepEqual(
    stats.ratings.map((r) => r.count),
    [0, 0, 0, 2, 0]
  );
});

test("average rating per year comes out oldest first whatever order the Books arrive in", () => {
  const stats = computeReadingStats([
    book({ dateRead: "2026-01-10", rating: 4 }),
    book({ dateRead: "2019-05-02", rating: 3 }),
    book({ dateRead: "2023-07-19", rating: 5 }),
  ]);
  assert.deepEqual(
    stats.ratingByYear.map((y) => y.year),
    [2019, 2023, 2026]
  );
});

test("top authors are ranked by Books read, ties alphabetical, capped at 10", () => {
  const authors = ["Zed", "Abe", "Abe", "Cy", "Cy", "Cy", "D", "E", "F", "G", "H", "I", "J", "K"];
  const stats = computeReadingStats(authors.map((author) => book({ author })));
  assert.deepEqual(
    stats.topAuthors.map(({ author, count }) => ({ author, count })),
    [
      { author: "Cy", count: 3 },
      { author: "Abe", count: 2 },
      // One Book each, alphabetical: Zed is last and falls off the list.
      { author: "D", count: 1 },
      { author: "E", count: 1 },
      { author: "F", count: 1 },
      { author: "G", count: 1 },
      { author: "H", count: 1 },
      { author: "I", count: 1 },
      { author: "J", count: 1 },
      { author: "K", count: 1 },
    ]
  );
});

test("each author's Books split into Fiction and Non-fiction by the site's rule", () => {
  const stats = computeReadingStats([
    book({ author: "Iain Banks", genres: ["Sci-Fi"] }),
    book({ author: "Iain Banks", genres: ["Sci-Fi"] }),
    book({ author: "Iain Banks", genres: ["Classics", "Philosophy"] }), // Non-fiction
    book({ author: "Iain Banks", genres: [] }), // Non-fiction: no Genres
    book({ author: "Mary Beard", genres: ["History"] }),
    // Left out: a podcast.
    book({ author: "Mary Beard", genres: ["Horror"], podcast: true }),
  ]);
  const banks = stats.topAuthors.find((a) => a.author === "Iain Banks");
  const beard = stats.topAuthors.find((a) => a.author === "Mary Beard");
  assert.deepEqual(
    { count: banks?.count, fiction: banks?.fiction, nonFiction: banks?.nonFiction },
    { count: 4, fiction: 2, nonFiction: 2 }
  );
  assert.deepEqual(
    { count: beard?.count, fiction: beard?.fiction, nonFiction: beard?.nonFiction },
    { count: 1, fiction: 0, nonFiction: 1 }
  );
});

test("an author's average rating leaves out unrated Books and rounds to 1 place", () => {
  const stats = computeReadingStats([
    book({ author: "A", rating: 5 }),
    book({ author: "A", rating: 4 }),
    book({ author: "A", rating: 4 }),
    book({ author: "A", rating: 0 }), // unrated: still a Book read, not in the average
    book({ author: "B", rating: 0 }), // only unrated: no average
    book({ author: "C", rating: 3 }),
    book({ author: "C", rating: 4 }), // exactly 3.5
  ]);
  const byAuthor = Object.fromEntries(stats.topAuthors.map((a) => [a.author, a]));
  assert.equal(byAuthor.A.count, 4);
  assert.equal(byAuthor.A.averageRating, 4.3); // (5 + 4 + 4) / 3 = 4.333
  assert.equal(byAuthor.B.count, 1);
  assert.equal(byAuthor.B.averageRating, null);
  assert.equal(byAuthor.C.averageRating, 3.5);
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

test("Genres over time: a Book with two Genres counts once in each, sorted by total", () => {
  const stats = computeReadingStats([
    book({ dateRead: "2024-01-10", genres: ["History", "Biography & Memoir"] }),
    book({ dateRead: "2024-06-10", genres: ["History"] }),
    book({ dateRead: "2025-02-10", genres: ["History", "Sci-Fi"] }),
    book({ dateRead: "2025-03-10", genres: ["Sci-Fi"] }),
  ]);
  assert.deepEqual(
    stats.genresOverTime.map(({ genre, total, byYear }) => ({ genre, total, byYear })),
    [
      {
        genre: "History",
        total: 3,
        byYear: [
          { year: 2024, count: 2 },
          { year: 2025, count: 1 },
        ],
      },
      {
        genre: "Sci-Fi",
        total: 2,
        byYear: [{ year: 2025, count: 2 }],
      },
      {
        genre: "Biography & Memoir",
        total: 1,
        byYear: [{ year: 2024, count: 1 }],
      },
    ]
  );
});

test("Genres over time: the top eight stay named, the rest group as Other, last", () => {
  // Genres G1..G9 with 9..1 Books each, all in 2024; Books carry one Genre.
  const books = [];
  for (let n = 1; n <= 9; n++) {
    for (let i = 0; i < 10 - n; i++) books.push(book({ genres: [`G${n}`] }));
  }
  // A Book with a top-eight Genre and a minor one counts in both groups.
  books.push(book({ genres: ["G1", "Y"] }));
  // A Book with two minor Genres counts once in Other.
  books.push(book({ genres: ["Y", "Z"] }));
  const stats = computeReadingStats(books);

  assert.deepEqual(
    stats.genresOverTime.map((s) => [s.genre, s.total]),
    [
      ["G1", 10],
      ["G2", 8],
      ["G3", 7],
      ["G4", 6],
      ["G5", 5],
      ["G6", 4],
      ["G7", 3],
      ["G8", 2],
      // The lone G9 Book, the G1 + Y Book, and the Y + Z Book: three Books.
      ["Other", 3],
    ]
  );
});

test("Genres over time: ties in the top eight break alphabetically", () => {
  // Nine Genres with one Book each: Travel is last alphabetically, so it falls to Other.
  const stats = computeReadingStats([
    book({ genres: ["Travel"] }),
    book({ genres: ["Sport"] }),
    book({ genres: ["Horror"] }),
    book({ genres: ["Science"] }),
    book({ genres: ["History"] }),
    book({ genres: ["Fantasy"] }),
    book({ genres: ["Parenting"] }),
    book({ genres: ["Philosophy"] }),
    book({ genres: ["Psychology"] }),
  ]);
  assert.deepEqual(
    stats.genresOverTime.map((s) => s.genre),
    ["Fantasy", "History", "Horror", "Parenting", "Philosophy", "Psychology", "Science", "Sport", "Other"]
  );
});

test("Genres over time: Other's yearly counts use Dated Books only and leave podcasts out", () => {
  // Eight Genres with 2 Books each in 2024, then minor Genres that land in Other.
  const books = ["A", "B", "C", "D", "E", "F", "G", "H"].flatMap((g) => [
    book({ dateRead: "2024-01-01", genres: [g] }),
    book({ dateRead: "2024-02-01", genres: [g] }),
  ]);
  books.push(
    book({ dateRead: "2024-03-01", genres: ["A", "Travel"] }), // Dated, also in A
    book({ dateRead: "2025-03-01", genres: ["Sport"] }), // Dated
    book({ dateRead: "2018-02-21", genres: ["Sport"], undated: true }), // counts in the total only
    book({ dateRead: "2025-04-01", genres: ["Travel"], podcast: true }) // left out entirely
  );
  const other = computeReadingStats(books).genresOverTime.at(-1);
  assert.deepEqual(other, {
    genre: "Other",
    total: 3,
    byYear: [
      { year: 2024, count: 1 },
      { year: 2025, count: 1 },
    ],
  });
});

test("Genres over time: no Other group when every Genre is in the top eight", () => {
  const stats = computeReadingStats([book({ genres: ["History"] }), book({ genres: ["Sci-Fi"] })]);
  assert.deepEqual(
    stats.genresOverTime.map((s) => s.genre),
    ["History", "Sci-Fi"]
  );
});

test("Genres over time: yearly counts use Dated Books only, the order uses all Books", () => {
  const stats = computeReadingStats([
    book({ dateRead: "2024-03-01", genres: ["History"] }),
    book({ dateRead: "2018-02-21", genres: ["Sci-Fi"], undated: true }),
    book({ dateRead: "2018-02-21", genres: ["Sci-Fi"], undated: true }),
    book({ dateRead: "2025-03-01", genres: ["Sci-Fi"] }),
    book({ dateRead: "2025-04-01", genres: ["Horror"], podcast: true }),
  ]);
  assert.deepEqual(stats.genresOverTime, [
    { genre: "Sci-Fi", total: 3, byYear: [{ year: 2025, count: 1 }] },
    { genre: "History", total: 1, byYear: [{ year: 2024, count: 1 }] },
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
