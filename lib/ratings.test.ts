import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { isValidRating, starBucket } from "./ratings.ts";

test("a quarter rating goes under the whole star below it", () => {
  assert.equal(starBucket(3), 3);
  assert.equal(starBucket(3.25), 3);
  assert.equal(starBucket(3.5), 3);
  assert.equal(starBucket(3.75), 3);
  assert.equal(starBucket(5), 5);
});

test("unrated stays 0 and anything rated under 1 counts as a 1★", () => {
  assert.equal(starBucket(0), 0);
  assert.equal(starBucket(0.5), 1);
});

test("ratings are 0 to 5 in quarter steps", () => {
  for (const ok of [0, 1, 3.25, 3.5, 3.75, 5]) assert.equal(isValidRating(ok), true, String(ok));
  for (const bad of [3.3, -1, 5.25, "4", undefined]) assert.equal(isValidRating(bad), false, String(bad));
});

test("every Book in content/books has a valid rating", () => {
  const dir = path.join(process.cwd(), "content/books");
  const bad = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .filter((file) => !isValidRating(matter(fs.readFileSync(path.join(dir, file), "utf8")).data.rating));
  assert.deepEqual(bad, []);
});
