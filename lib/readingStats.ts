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

/** One dot on the average-rating-per-year plot. */
export interface YearRating {
  year: number;
  /** Mean of the year's rated Dated Books, to 2 places. */
  average: number;
  /** How many rated Dated Books the average is over. */
  rated: number;
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

/** How many Genres get their own chart in Genres over time; the rest group as Other. */
const TOP_GENRES = 8;
/** The name of the grouped series. Not one of the Genres, so it never links to /books. */
export const OTHER_GENRES = "Other";

/** One mini chart in Genres over time. */
export interface GenreSeries {
  genre: string;
  /** All Books carrying the Genre, Dated or not; this is what orders the charts. */
  total: number;
  /** Dated Books per year, only the years with at least one. */
  byYear: { year: number; count: number }[];
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
  /** Dated Books only; a year with no rated Books has no entry. Oldest first. */
  ratingByYear: YearRating[];
  topAuthors: AuthorCount[];
  genresOverTime: GenreSeries[];
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

/** The year a Dated Book was read, or null when it is not Dated. */
function datedYear(book: StatsBook): number | null {
  const year = parseInt(String(book.dateRead ?? "").slice(0, 4), 10);
  return book.undated || Number.isNaN(year) ? null : year;
}

/** A running count for one Genre (or Other): every Book, and the Dated ones by year. */
interface GenreTally {
  total: number;
  years: Map<number, number>;
}

const newTally = (): GenreTally => ({ total: 0, years: new Map() });

function addBook(tally: GenreTally, book: StatsBook) {
  tally.total += 1;
  const year = datedYear(book);
  if (year !== null) tally.years.set(year, (tally.years.get(year) ?? 0) + 1);
}

function toSeries(genre: string, tally: GenreTally): GenreSeries {
  return {
    genre,
    total: tally.total,
    byYear: Array.from(tally.years.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year),
  };
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
    const year = datedYear(book);
    if (year === null) continue;
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

  // Average rating per year: Dated Books only, unrated Books left out, so a
  // year with nothing rated has no entry rather than an average of zero.
  const yearTallies = new Map<number, { sum: number; count: number }>();
  for (const book of rated) {
    const year = datedYear(book);
    if (year === null) continue;
    const tally = yearTallies.get(year) ?? { sum: 0, count: 0 };
    tally.sum += book.rating;
    tally.count += 1;
    yearTallies.set(year, tally);
  }
  const ratingByYear: YearRating[] = Array.from(yearTallies.entries())
    .map(([year, t]) => ({ year, average: Math.round((t.sum / t.count) * 100) / 100, rated: t.count }))
    .sort((a, b) => a.year - b.year);

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

  // Genres over time: ordered by all Books, counted by Dated Books only.
  const genreTallies = new Map<string, GenreTally>();
  for (const book of books) {
    for (const genre of new Set(book.genres ?? [])) {
      const tally = genreTallies.get(genre) ?? newTally();
      addBook(tally, book);
      genreTallies.set(genre, tally);
    }
  }
  const ranked = Array.from(genreTallies.entries()).sort(
    (a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0])
  );
  const topGenres = ranked.slice(0, TOP_GENRES);
  const genresOverTime: GenreSeries[] = topGenres.map(([genre, tally]) => toSeries(genre, tally));

  // Other: a Book with any Genre outside the top eight counts once here.
  const named = new Set(topGenres.map(([genre]) => genre));
  const other = newTally();
  for (const book of books) {
    if ((book.genres ?? []).some((genre) => !named.has(genre))) addBook(other, book);
  }
  if (other.total > 0) genresOverTime.push(toSeries(OTHER_GENRES, other));

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
    ratingByYear,
    topAuthors,
    genresOverTime,
    publicationYears,
  };
}
