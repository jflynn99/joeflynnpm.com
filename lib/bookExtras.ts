// The rules for the two optional pieces of Book data, One-liner and Favourite
// (both defined in GLOSSARY.md). `npm test` runs them over content/books.

export const MAX_FAVOURITES = 20;
export const MAX_ONE_LINER_WORDS = 40;

export interface BookExtrasRef {
  slug: string;
  frontmatter: { oneLiner?: unknown; favourite?: unknown };
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Every problem with the Books' One-liners and Favourites, as plain messages. */
export function bookExtrasErrors(books: BookExtrasRef[]): string[] {
  const errors: string[] = [];
  const favourites: string[] = [];

  for (const { slug, frontmatter } of books) {
    const { oneLiner, favourite } = frontmatter;

    if (oneLiner !== undefined) {
      if (typeof oneLiner !== "string") {
        errors.push(`${slug}: oneLiner must be a string`);
      } else if (oneLiner.trim() === "") {
        errors.push(`${slug}: oneLiner is empty`);
      } else {
        const words = countWords(oneLiner);
        if (words > MAX_ONE_LINER_WORDS) {
          errors.push(
            `${slug}: oneLiner is ${words} words; the limit is ${MAX_ONE_LINER_WORDS}`,
          );
        }
      }
    }

    if (favourite !== undefined && typeof favourite !== "boolean") {
      errors.push(`${slug}: favourite must be true or false`);
    }

    if (favourite === true) {
      favourites.push(slug);
      if (typeof oneLiner !== "string" || oneLiner.trim() === "") {
        errors.push(`${slug}: a Favourite needs a oneLiner`);
      }
    }
  }

  if (favourites.length > MAX_FAVOURITES) {
    errors.push(
      `${favourites.length} Books have favourite: true; the limit is ${MAX_FAVOURITES}`,
    );
  }

  return errors;
}
