import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { BookListItem } from "./books.ts";
import { getFiveStarPicks, toFiveStarPicks } from "./fiveStarPicks.ts";

function book(slug: string, rating: number, hasReview: boolean): BookListItem {
  return {
    slug,
    hasReview,
    frontmatter: {
      title: `Title ${slug}`,
      author: "Ted Chiang",
      rating,
      dateRead: "2026-01-01",
      coverImage: `/images/books/${slug}.jpg`,
      isbn: "123",
      genres: ["Sci-Fi"],
    },
  };
}

test("only five-star Books with a review are picks", () => {
  const picks = toFiveStarPicks([
    book("five-reviewed", 5, true),
    book("five-no-review", 5, false),
    book("four-reviewed", 4, true),
  ]);
  assert.deepEqual(picks.map((pick) => pick.slug), ["five-reviewed"]);
});

test("a pick carries only what the card shows", () => {
  const [pick] = toFiveStarPicks([book("stories", 5, true)]);
  assert.deepEqual(pick, {
    slug: "stories",
    title: "Title stories",
    author: "Ted Chiang",
    coverImage: "/images/books/stories.jpg",
  });
});

test("a pick's title drops the Goodreads series suffix", () => {
  const series = book("way-of-kings", 5, true);
  series.frontmatter.title = "The Way of Kings (The Stormlight Archive, #1)";
  assert.equal(toFiveStarPicks([series])[0].title, "The Way of Kings");
});

test("the site has five-star picks, and every one has a review page and a cover on disk", () => {
  const picks = getFiveStarPicks();
  assert.ok(picks.length > 0);
  for (const pick of picks) {
    assert.ok(fs.existsSync(path.join("content/books", `${pick.slug}.mdx`)), pick.slug);
    if (pick.coverImage) {
      assert.ok(fs.existsSync(path.join("public", pick.coverImage)), pick.coverImage);
    }
  }
});
