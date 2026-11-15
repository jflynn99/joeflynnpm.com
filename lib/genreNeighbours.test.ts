import { test } from "node:test";
import assert from "node:assert/strict";
import { genreNeighbours } from "./genreNeighbours.ts";

function book(slug: string, genres: string[], extra: Record<string, unknown> = {}) {
  return {
    slug,
    hasReview: false,
    frontmatter: { genres, rating: 3, dateRead: "2024-01-01" },
    ...extra,
  };
}

test("only Books sharing a Genre come back, never the Book itself", () => {
  const books = [book("self", ["Sci-Fi"]), book("a", ["Sci-Fi"]), book("b", ["History"])];
  assert.deepEqual(genreNeighbours("self", books).map((b) => b.slug), ["a"]);
});

test("reviewed Books come before unreviewed ones", () => {
  const books = [
    book("self", ["Sci-Fi"]),
    book("plain", ["Sci-Fi"], { frontmatter: { genres: ["Sci-Fi"], rating: 5, dateRead: "2024-01-01" } }),
    book("reviewed", ["Sci-Fi"], { hasReview: true }),
  ];
  assert.deepEqual(genreNeighbours("self", books).map((b) => b.slug), ["reviewed", "plain"]);
});

test("more Genres in common ranks higher, then rating", () => {
  const books = [
    book("self", ["Sci-Fi", "Horror"]),
    book("one", ["Sci-Fi"], { frontmatter: { genres: ["Sci-Fi"], rating: 5, dateRead: "2024-01-01" } }),
    book("two", ["Sci-Fi", "Horror"]),
  ];
  assert.deepEqual(genreNeighbours("self", books).map((b) => b.slug), ["two", "one"]);
});

test("at most six come back", () => {
  const books = [book("self", ["Sci-Fi"]), ...Array.from({ length: 9 }, (_, i) => book(`b${i}`, ["Sci-Fi"]))];
  assert.equal(genreNeighbours("self", books).length, 6);
});

test("a Book with no Genres has no neighbours", () => {
  assert.deepEqual(genreNeighbours("self", [book("self", []), book("a", ["Sci-Fi"])]), []);
});
