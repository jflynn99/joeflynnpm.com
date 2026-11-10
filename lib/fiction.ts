// The one Fiction / Non-fiction rule for the site (see GLOSSARY.md).
// Browser-safe: no Node imports, so client components can use it.

export const FICTION_GENRES: ReadonlySet<string> = new Set([
  "Sci-Fi",
  "Fantasy",
  "Literary Fiction",
  "Historical Fiction",
  "Classics",
  "Crime & Thriller",
  "Horror",
]);

/**
 * A Book with a Fiction Genre is Fiction, except that when Classics is its
 * only Fiction Genre and it also carries a Non-fiction Genre, it is
 * Non-fiction. A Book with no Genres is Non-fiction.
 */
export function isFiction(genres: readonly string[] | undefined): boolean {
  const list = genres ?? [];
  const fiction = list.filter((g) => FICTION_GENRES.has(g));
  if (fiction.length === 0) return false;
  const onlyClassics = fiction.every((g) => g === "Classics");
  const hasNonFiction = list.some((g) => !FICTION_GENRES.has(g));
  return !(onlyClassics && hasNonFiction);
}
