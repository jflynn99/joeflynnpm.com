import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getCurrentReads, parseCurrentReads } from "./currentReads.ts";

function currentRead(overrides: Record<string, unknown> = {}) {
  return { title: "A Thousand Moons", author: "Sebastian Barry", ...overrides };
}

const daysWithoutEnd = {
  slug: "days-without-end-days-without-end-1",
  title: "Days Without End",
  hasReview: true,
};

test("an empty list of Current Reads is fine", () => {
  assert.deepEqual(parseCurrentReads([], []), []);
});

test("a well-formed Current Read comes back with its title, author, and cover", () => {
  const reads = parseCurrentReads(
    [{ title: "Piranesi", author: "Susanna Clarke", coverImage: "/images/books/piranesi.jpg" }],
    [],
  );
  assert.equal(reads.length, 1);
  assert.equal(reads[0].title, "Piranesi");
  assert.equal(reads[0].author, "Susanna Clarke");
  assert.equal(reads[0].coverImage, "/images/books/piranesi.jpg");
});

test("a Current Read with no author fails", () => {
  assert.throws(() => parseCurrentReads([{ title: "Piranesi" }], []));
});

test("a Current Read whose started date is not an ISO date fails", () => {
  assert.throws(() => parseCurrentReads([currentRead({ started: "last Tuesday" })], []));
});

test("a relatedBook slug that is not a Book on the site fails", () => {
  assert.throws(
    () => parseCurrentReads([currentRead({ relatedBook: "no-such-book" })], [daysWithoutEnd]),
    /no-such-book/,
  );
});

test("a relatedBook with a review links to that review", () => {
  const [read] = parseCurrentReads([currentRead({ relatedBook: daysWithoutEnd.slug })], [daysWithoutEnd]);
  assert.deepEqual(read.relatedReview, {
    href: "/books/days-without-end-days-without-end-1",
    title: "Days Without End",
  });
});

test("a relatedBook without a review gets no link", () => {
  const [read] = parseCurrentReads(
    [currentRead({ relatedBook: daysWithoutEnd.slug })],
    [{ ...daysWithoutEnd, hasReview: false }],
  );
  assert.equal(read.relatedReview, undefined);
});

test("the review link drops the series suffix from the Book's title", () => {
  const [read] = parseCurrentReads(
    [currentRead({ relatedBook: daysWithoutEnd.slug })],
    [{ ...daysWithoutEnd, title: "Days Without End (Days Without End, #1)" }],
  );
  assert.equal(read.relatedReview?.title, "Days Without End");
});

test("content/current-reads.json loads, with every relatedBook a real Book and every cover on disk", () => {
  // getCurrentReads throws on a malformed entry or an unknown relatedBook.
  for (const read of getCurrentReads()) {
    if (read.coverImage) {
      assert.ok(fs.existsSync(path.join("public", read.coverImage)), `missing cover ${read.coverImage}`);
    }
  }
});
