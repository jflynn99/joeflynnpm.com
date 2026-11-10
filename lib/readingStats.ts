// Reading stats for /analytics, worked out from Book frontmatter
// (content/books/*.mdx). They used to come from a Goodreads export, which
// went stale between exports; now a Book counts as soon as it is published.

import { isFiction } from "./fiction.ts";

export interface YearStats {
  year: number;
  books: number;
  pages: number;
  /** `fiction + nonFiction === books`. */
  fiction: number;
  nonFiction: number;
}

export interface RatingCount {
  rating: number;
  count: number;
}

export interface AuthorCount {
  author: string;
  count: number;
  /** `fiction + nonFiction === count`. */
  fiction: number;
  nonFiction: number;
  /** Mean of the rated Books, to 1 place; null when none are rated. */
  averageRating: number | null;
}

/** One dot on the publication strip. */
export interface PublishedBook {
  title: string;
  author: string;
  /** Original publication year; negative for BCE. */
  year: number;
}

export interface ReadingStats {
  totalBooks: number;
  totalPages: number;
  averageRating: number;
  /** All Books (not podcasts), split by the site's Fiction rule. */
  fictionBooks: number;
  nonFictionBooks: number;
  datedBooks: number;
  byYear: YearStats[];
  ratings: RatingCount[];
  topAuthors: AuthorCount[];
  /** All Books with a publication year, Dated or not, oldest first. */
  publicationYears: PublishedBook[];
}

/** The frontmatter fields the stats read. */
export interface StatsBook {
  title: string;
  author: string;
  /** Original publication year (not the edition's). */
  published?: number;
  rating: number;
  dateRead: string;
  /** 0 or absent means no page count (audio, for example). */
  pages?: number;
  /**
   * True when `dateRead` is not a real read date: the Book was read before
   * Joe logged dates, and the date is when it was added to Goodreads.
   */
  undated?: boolean;
  /** True for a podcast series: it keeps its page on /books but is not a read. */
  podcast?: boolean;
  genres?: string[];
}

export function computeReadingStats(allBooks: StatsBook[]): ReadingStats {
  const books = allBooks.filter((book) => !book.podcast);
  const pagesOf = (book: StatsBook) => book.pages ?? 0;

  const totalPages = books.reduce((sum, book) => sum + pagesOf(book), 0);

  const rated = books.filter((book) => book.rating > 0);
  const averageRating =
    rated.reduce((sum, book) => sum + book.rating, 0) / (rated.length || 1);

  const fictionBooks = books.filter((book) => isFiction(book.genres)).length;

  // Books and pages per year: Dated Books only.
  const yearMap = new Map<number, Omit<YearStats, "year">>();
  let datedBooks = 0;
  for (const book of books) {
    const year = parseInt(String(book.dateRead ?? "").slice(0, 4), 10);
    if (book.undated || Number.isNaN(year)) continue;
    datedBooks++;
    const entry = yearMap.get(year) ?? { books: 0, pages: 0, fiction: 0, nonFiction: 0 };
    entry.books += 1;
    entry.pages += pagesOf(book);
    if (isFiction(book.genres)) entry.fiction += 1;
    else entry.nonFiction += 1;
    yearMap.set(year, entry);
  }
  const byYear: YearStats[] = Array.from(yearMap.entries())
    .map(([year, v]) => ({ year, ...v }))
    .sort((a, b) => a.year - b.year);

  // Ratings distribution (1-5)
  const ratings: RatingCount[] = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: books.filter((book) => book.rating === rating).length,
  }));

  // Most-read authors: the top 10, each split Fiction / Non-fiction.
  const authorMap = new Map<string, { fiction: number; nonFiction: number; ratingSum: number; rated: number }>();
  for (const book of books) {
    const author = book.author?.trim();
    if (!author) continue;
    const entry = authorMap.get(author) ?? { fiction: 0, nonFiction: 0, ratingSum: 0, rated: 0 };
    if (isFiction(book.genres)) entry.fiction += 1;
    else entry.nonFiction += 1;
    if (book.rating > 0) {
      entry.ratingSum += book.rating;
      entry.rated += 1;
    }
    authorMap.set(author, entry);
  }
  const topAuthors: AuthorCount[] = Array.from(authorMap.entries())
    .map(([author, v]) => ({
      author,
      count: v.fiction + v.nonFiction,
      fiction: v.fiction,
      nonFiction: v.nonFiction,
      averageRating: v.rated > 0 ? Math.round((v.ratingSum / v.rated) * 10) / 10 : null,
    }))
    .sort((a, b) => b.count - a.count || a.author.localeCompare(b.author))
    .slice(0, 10);

  // Publication strip: every Book with a year, undated ones included.
  const publicationYears: PublishedBook[] = books
    .filter((book): book is StatsBook & { published: number } => Number.isInteger(book.published))
    .map((book) => ({ title: book.title, author: book.author, year: book.published }))
    .sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));

  return {
    totalBooks: books.length,
    totalPages,
    averageRating: Math.round(averageRating * 100) / 100,
    fictionBooks,
    nonFictionBooks: books.length - fictionBooks,
    datedBooks,
    byYear,
    ratings,
    topAuthors,
    publicationYears,
  };
}
