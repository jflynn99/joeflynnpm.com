// The Books the 404 page can offer instead: five stars, with a review to link
// to (so the link can never 404 itself). Only what the card shows is kept, as
// the list is sent to the browser.

import { getBookListItems, type BookListItem } from "./books.ts";
import { withoutSeries } from "./currentReads.ts";

export interface FiveStarPick {
  slug: string;
  title: string;
  author: string;
  coverImage?: string;
}

export function toFiveStarPicks(books: BookListItem[]): FiveStarPick[] {
  return books
    .filter((book) => book.frontmatter.rating === 5 && book.hasReview)
    .map(({ slug, frontmatter: { title, author, coverImage } }) => ({
      slug,
      title: withoutSeries(title),
      author,
      ...(coverImage && { coverImage }),
    }));
}

export function getFiveStarPicks(): FiveStarPick[] {
  return toFiveStarPicks(getBookListItems());
}
