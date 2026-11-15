import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {
  checkExactly,
  costOf,
  mentionsNumber,
  mentionsRating,
  questionsFileSchema,
  shortTitle,
  snapshotSchema,
  type EvalBook,
} from "./evals.ts";

function book(slug: string, extra: Partial<EvalBook["frontmatter"]> = {}): EvalBook {
  return {
    slug,
    frontmatter: { title: slug, author: "A", rating: 4, dateRead: "2023-05-01", genres: ["Sci-Fi"], ...extra },
  };
}

const evalsDir = path.join(process.cwd(), "evals/library");

function realBooks(): EvalBook[] {
  const dir = path.join(process.cwd(), "content/books");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => ({ slug: f.replace(/\.mdx$/, ""), frontmatter: matter(fs.readFileSync(path.join(dir, f), "utf8")).data as EvalBook["frontmatter"] }));
}

test("ratings are recognised however they are written", () => {
  for (const text of ["He gave it 5 stars.", "a 5-star read", "rated 5/5", "five out of five", "Five stars!"]) {
    assert.ok(mentionsRating(text, 5), text);
  }
  assert.equal(mentionsRating("He read 5 books and gave this 4 stars", 5), false);
});

test("a count must appear on its own, not inside a bigger number", () => {
  assert.ok(mentionsNumber("He read 17 books in 2025.", 17));
  assert.ok(mentionsNumber("Six of them.", 6));
  assert.equal(mentionsNumber("He read 170 books.", 17), false);
  assert.equal(mentionsNumber("rated 4.5", 4), false);
});

test("short titles drop the series tag and the subtitle", () => {
  assert.equal(shortTitle("A Clash of Kings  (A Song of Ice and Fire, #2)"), "A Clash of Kings");
  assert.equal(shortTitle("Blood Meridian, or, the Evening Redness in the West"), "Blood Meridian");
  assert.equal(shortTitle("Sapiens: A Brief History of Humankind"), "Sapiens");
});

test("counts are worked out from the Book data, so adding a Book moves the expected value", () => {
  const books = [book("a"), book("b"), book("c", { dateRead: "2024-01-01" }), book("d", { undated: true })];
  const check = { kind: "count", genre: "Sci-Fi", year: 2023 } as const;
  assert.equal(checkExactly(check, "Two.", books).expected, "2");
  assert.equal(checkExactly(check, "Three.", [...books, book("e")]).expected, "3");
});

test("podcasts never count", () => {
  const books = [book("a", { author: "Dan Carlin" }), book("b", { author: "Dan Carlin", podcast: true })];
  assert.equal(checkExactly({ kind: "count", author: "Dan Carlin" }, "1", books).expected, "1");
});

test("a tie for top author needs every tied name and the count", () => {
  const books = [book("a", { author: "Ann Lee" }), book("b", { author: "Ann Lee" }), book("c", { author: "Bo Ray" }), book("d", { author: "Bo Ray" })];
  assert.equal(checkExactly({ kind: "topAuthor" }, "Lee and Ray, 2 each", books).pass, true);
  assert.equal(checkExactly({ kind: "topAuthor" }, "Ann Lee, with 2", books).pass, false);
});

test("a lookup naming a slug that is not a Book throws", () => {
  assert.throws(() => checkExactly({ kind: "rating", slug: "nope" }, "", []), /nope/);
});

test("cost is tokens times the per-million price", () => {
  const usage = { inputTokens: 1_000_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 0, outputTokens: 100_000 };
  assert.equal(costOf(usage, { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 }), 3.1);
});

test("the questions file is well formed and every lookup names a real Book", () => {
  const file = questionsFileSchema.parse(JSON.parse(fs.readFileSync(path.join(evalsDir, "questions.json"), "utf8")));
  const books = realBooks();
  for (const q of file.questions) {
    if (q.check.kind !== "rubric") assert.doesNotThrow(() => checkExactly(q.check as never, "", books), q.id);
  }
});

test("every committed snapshot has the right shape and adds up", () => {
  const dir = path.join(evalsDir, "snapshots");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
  for (const f of files) {
    const s = snapshotSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
    assert.equal(s.total, s.results.length, f);
    assert.equal(s.passed, s.results.filter((r) => r.pass).length, f);
    assert.equal(s.passRate, Math.round((s.passed / s.total) * 1000) / 1000, f);
  }
});
