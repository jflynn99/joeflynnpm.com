// Up to six other Books that share a Genre with this one, for the foot of a
// Book page. Reviewed Books come first; then more Genres in common, then the
// higher rating, then the more recent read, then slug, so the pick is stable.

export const MAX_GENRE_NEIGHBOURS = 6;

export interface GenreNeighbourRef {
  slug: string;
  hasReview: boolean;
  frontmatter: { genres?: string[]; rating: number; dateRead: string };
}

export function genreNeighbours<T extends GenreNeighbourRef>(
  slug: string,
  books: T[],
  limit = MAX_GENRE_NEIGHBOURS,
): T[] {
  const self = books.find((book) => book.slug === slug);
  const genres = new Set(self?.frontmatter.genres ?? []);
  if (genres.size === 0) return [];

  const shared = (book: T) =>
    (book.frontmatter.genres ?? []).filter((genre) => genres.has(genre)).length;

  return books
    .filter((book) => book.slug !== slug && shared(book) > 0)
    .sort(
      (a, b) =>
        Number(b.hasReview) - Number(a.hasReview) ||
        shared(b) - shared(a) ||
        (b.frontmatter.rating ?? 0) - (a.frontmatter.rating ?? 0) ||
        (Date.parse(b.frontmatter.dateRead) || 0) - (Date.parse(a.frontmatter.dateRead) || 0) ||
        (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0),
    )
    .slice(0, limit);
}
