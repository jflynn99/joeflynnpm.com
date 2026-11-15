import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { bookExtrasErrors, countWords } from "./bookExtras.ts";
import { isBookInSitemap, parseBook } from "./books.ts";

function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
}

test("a Book with a One-liner and the Favourite flag passes", () => {
  assert.deepEqual(
    bookExtrasErrors([{ slug: "dune", frontmatter: { oneLiner: "Sand.", favourite: true } }]),
    [],
  );
});

test("a Book with neither field passes", () => {
  assert.deepEqual(bookExtrasErrors([{ slug: "dune", frontmatter: {} }]), []);
});

test("a 21st Favourite fails with the count and the limit", () => {
  const books = Array.from({ length: 21 }, (_, i) => ({
    slug: `book-${i}`,
    frontmatter: { oneLiner: "Good.", favourite: true },
  }));
  assert.deepEqual(bookExtrasErrors(books), [
    "21 Books have favourite: true; the limit is 20",
  ]);
  assert.deepEqual(bookExtrasErrors(books.slice(0, 20)), []);
});

test("a Favourite without a One-liner fails", () => {
  assert.deepEqual(bookExtrasErrors([{ slug: "dune", frontmatter: { favourite: true } }]), [
    "dune: a Favourite needs a oneLiner",
  ]);
});

test("a One-liner of 41 words fails and one of 40 passes", () => {
  assert.deepEqual(bookExtrasErrors([{ slug: "dune", frontmatter: { oneLiner: words(41) } }]), [
    "dune: oneLiner is 41 words; the limit is 40",
  ]);
  assert.deepEqual(bookExtrasErrors([{ slug: "dune", frontmatter: { oneLiner: words(40) } }]), []);
});

test("an empty One-liner fails", () => {
  assert.deepEqual(bookExtrasErrors([{ slug: "dune", frontmatter: { oneLiner: "  " } }]), [
    "dune: oneLiner is empty",
  ]);
});

test("words are counted on whitespace, however much of it", () => {
  assert.equal(countWords("  one   two\nthree "), 3);
});

test("every Book in content/books keeps to the One-liner and Favourite rules", () => {
  const dir = path.join(process.cwd(), "content/books");
  const books = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => ({
      slug: file.replace(/\.mdx$/, ""),
      frontmatter: matter(fs.readFileSync(path.join(dir, file), "utf8")).data,
    }));
  assert.deepEqual(bookExtrasErrors(books), []);
});

test("a Book loads with its One-liner and Favourite flag", () => {
  const book = parseBook(
    "dune",
    '---\ntitle: "Dune"\nauthor: "Frank Herbert"\nrating: 5\ndateRead: "2020-01-01"\noneLiner: "Sand."\nfavourite: true\n---\n',
  );
  assert.equal(book.frontmatter.oneLiner, "Sand.");
  assert.equal(book.frontmatter.favourite, true);
});

test("an unreviewed Book joins the sitemap only once it has a One-liner", () => {
  assert.equal(isBookInSitemap({ hasReview: false, frontmatter: {} }), false);
  assert.equal(isBookInSitemap({ hasReview: false, frontmatter: { oneLiner: "Sand." } }), true);
  assert.equal(isBookInSitemap({ hasReview: true, frontmatter: {} }), true);
});
