import { test } from "node:test";
import assert from "node:assert/strict";
import { longestRecentPost } from "./typeTest.ts";

const NOW = new Date("2026-11-13T12:00:00Z");

function post(slug: string, date: string, words: number) {
  return { slug, date, content: Array(words).fill("word").join(" ") };
}

test("picks the longest post dated within the last 12 months", () => {
  const posts = [
    post("short", "2026-10-01", 100),
    post("long", "2026-03-01", 900),
    post("middling", "2026-06-01", 400),
  ];
  assert.equal(longestRecentPost(posts, NOW)?.slug, "long");
});

test("ignores a longer post that is older than 12 months", () => {
  const posts = [
    post("ancient-epic", "2025-11-12", 5000),
    post("recent", "2026-01-01", 200),
  ];
  assert.equal(longestRecentPost(posts, NOW)?.slug, "recent");
});

test("a post dated exactly 12 months ago is still in the window", () => {
  const posts = [post("edge", "2025-11-13", 300), post("recent", "2026-01-01", 200)];
  assert.equal(longestRecentPost(posts, NOW)?.slug, "edge");
});

test("ignores posts dated after now", () => {
  const posts = [post("future", "2027-01-01", 5000), post("recent", "2026-01-01", 200)];
  assert.equal(longestRecentPost(posts, NOW)?.slug, "recent");
});

test("with nothing in the window, falls back to the longest post overall", () => {
  const posts = [post("a", "2020-01-01", 100), post("b", "2021-01-01", 700)];
  assert.equal(longestRecentPost(posts, NOW)?.slug, "b");
});

test("with no posts at all, returns null", () => {
  assert.equal(longestRecentPost([], NOW), null);
});

test("length is counted in words, not characters", () => {
  const posts = [
    { slug: "few-long-words", date: "2026-05-01", content: "extraordinarily ".repeat(50) },
    { slug: "many-short-words", date: "2026-05-02", content: "a ".repeat(60) },
  ];
  assert.equal(longestRecentPost(posts, NOW)?.slug, "many-short-words");
});
