import { test } from "node:test";
import assert from "node:assert/strict";
import { readMonth, readingNeighbours, readingOrder } from "./readingOrder.ts";

function book(slug: string, dateRead: string, extra: Record<string, unknown> = {}) {
  return { slug, frontmatter: { title: slug.toUpperCase(), dateRead, ...extra } };
}

const books = [
  book("c", "2024-03-10"),
  book("a", "2024-01-05"),
  book("b", "2024-02-01"),
  book("d", "2024-04-20"),
];

test("a Book in the middle has the Books either side of it", () => {
  const n = readingNeighbours("b", books);
  assert.equal(n?.before?.slug, "a");
  assert.equal(n?.after?.slug, "c");
});

test("the earliest Dated Book has only a Book after it", () => {
  const n = readingNeighbours("a", books);
  assert.equal(n?.before, undefined);
  assert.equal(n?.after?.slug, "b");
});

test("the latest Dated Book has only a Book before it", () => {
  const n = readingNeighbours("d", books);
  assert.equal(n?.before?.slug, "c");
  assert.equal(n?.after, undefined);
});

test("an undated Book has no place in the order and is skipped as a neighbour", () => {
  const withUndated = [...books, book("u", "2024-02-15", { undated: true })];
  assert.equal(readingNeighbours("u", withUndated), null);
  assert.equal(readingNeighbours("b", withUndated)?.after?.slug, "c");
});

test("podcasts are skipped, both as the Book and as a neighbour", () => {
  const withPodcast = [...books, book("p", "2024-02-15", { podcast: true })];
  assert.equal(readingNeighbours("p", withPodcast), null);
  assert.equal(readingNeighbours("b", withPodcast)?.after?.slug, "c");
  assert.equal(readingNeighbours("c", withPodcast)?.before?.slug, "b");
});

test("Books read on the same day keep a stable order by slug, whatever order they arrive in", () => {
  const sameDay = [book("y", "2024-02-01"), book("x", "2024-02-01"), book("z", "2024-02-01")];
  assert.deepEqual(readingOrder(sameDay).map((b) => b.slug), ["x", "y", "z"]);
  assert.deepEqual(readingOrder([...sameDay].reverse()).map((b) => b.slug), ["x", "y", "z"]);
  const n = readingNeighbours("y", sameDay);
  assert.equal(n?.before?.slug, "x");
  assert.equal(n?.after?.slug, "z");
});

test("a lone Dated Book has no neighbours", () => {
  assert.deepEqual(readingNeighbours("a", [book("a", "2024-01-05")]), {});
});

test("the month is the month read, not shifted by time zone", () => {
  assert.equal(readMonth("2024-03-01"), "March 2024");
  assert.equal(readMonth("2024-03-31"), "March 2024");
});
