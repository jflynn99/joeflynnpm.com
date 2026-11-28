// Ratings run from 0 (unrated) to 5 in quarter steps, as Goodreads now allows:
// 3, 3.25, 3.5, 3.75. Whole-star views (the /books chips and the /analytics
// distribution) put a quarter rating under the whole star below it.

/** The whole-star group a rating belongs to: 3.75 is a 3★, 0 means unrated. */
export function starBucket(rating: number): number {
  if (!(rating > 0)) return 0;
  return Math.min(5, Math.max(1, Math.floor(rating)));
}

/** True for 0 (unrated) through 5 in steps of 0.25. */
export function isValidRating(rating: unknown): boolean {
  return (
    typeof rating === "number" &&
    rating >= 0 &&
    rating <= 5 &&
    Number.isInteger(rating * 4)
  );
}
