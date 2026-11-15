// Where a Dated Book sits in Joe's reading: the Dated Book read just before it
// and the one just after, by `dateRead`. Podcasts and undated Books are not
// part of the order. Books read on the same day keep a stable order by slug.

export interface ReadingOrderRef {
  slug: string;
  frontmatter: {
    title: string;
    dateRead: string;
    undated?: boolean;
    podcast?: boolean;
  };
}

export interface ReadingNeighbours<T extends ReadingOrderRef> {
  before?: T;
  after?: T;
}

function inOrder(book: ReadingOrderRef): boolean {
  const { undated, podcast, dateRead } = book.frontmatter;
  return !undated && !podcast && !Number.isNaN(Date.parse(dateRead));
}

/** The Dated Books, oldest first, ties broken by slug. */
export function readingOrder<T extends ReadingOrderRef>(books: T[]): T[] {
  return books.filter(inOrder).sort((a, b) => {
    const byDate = Date.parse(a.frontmatter.dateRead) - Date.parse(b.frontmatter.dateRead);
    return byDate !== 0 ? byDate : a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });
}

/**
 * The neighbours of one Book, or null when the Book is not in the order
 * (undated, a podcast, or not in the list at all).
 */
export function readingNeighbours<T extends ReadingOrderRef>(
  slug: string,
  books: T[],
): ReadingNeighbours<T> | null {
  const order = readingOrder(books);
  const index = order.findIndex((book) => book.slug === slug);
  if (index === -1) return null;
  return {
    ...(index > 0 && { before: order[index - 1] }),
    ...(index < order.length - 1 && { after: order[index + 1] }),
  };
}

/** "March 2024", read in UTC so the month never shifts with the build's zone. */
export function readMonth(dateRead: string): string {
  return new Date(dateRead).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
