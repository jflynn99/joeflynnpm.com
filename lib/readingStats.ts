import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

export interface YearStats {
  year: number;
  books: number;
  pages: number;
}

export interface RatingCount {
  rating: number;
  count: number;
}

export interface AuthorCount {
  author: string;
  count: number;
}

export interface ReadingStats {
  totalBooks: number;
  totalPages: number;
  averageRating: number;
  datedBooks: number;
  byYear: YearStats[];
  ratings: RatingCount[];
  topAuthors: AuthorCount[];
}

interface GoodreadsRow {
  Title: string;
  Author: string;
  "My Rating": string;
  "Number of Pages": string;
  "Date Read": string;
  "Exclusive Shelf": string;
}

const CSV_PATH = path.join(process.cwd(), "goodreads_library_export.csv");

export function getReadingStats(): ReadingStats | null {
  if (!fs.existsSync(CSV_PATH)) {
    return null;
  }

  const rows: GoodreadsRow[] = parse(fs.readFileSync(CSV_PATH), {
    columns: true,
    skip_empty_lines: true,
  });

  const read = rows.filter((r) => r["Exclusive Shelf"] === "read");

  const totalBooks = read.length;
  const totalPages = read.reduce(
    (sum, r) => sum + (parseInt(r["Number of Pages"], 10) || 0),
    0
  );

  const rated = read.filter((r) => parseInt(r["My Rating"], 10) > 0);
  const averageRating =
    rated.reduce((sum, r) => sum + parseInt(r["My Rating"], 10), 0) /
    (rated.length || 1);

  // Books and pages per year (only books with a Date Read)
  const yearMap = new Map<number, { books: number; pages: number }>();
  let datedBooks = 0;
  for (const r of read) {
    const dateRead = r["Date Read"];
    if (!dateRead) continue;
    datedBooks++;
    const year = parseInt(dateRead.slice(0, 4), 10);
    const entry = yearMap.get(year) ?? { books: 0, pages: 0 };
    entry.books += 1;
    entry.pages += parseInt(r["Number of Pages"], 10) || 0;
    yearMap.set(year, entry);
  }
  const byYear: YearStats[] = Array.from(yearMap.entries())
    .map(([year, v]) => ({ year, ...v }))
    .sort((a, b) => a.year - b.year);

  // Ratings distribution (1-5)
  const ratings: RatingCount[] = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: read.filter((r) => parseInt(r["My Rating"], 10) === rating).length,
  }));

  // Most-read authors
  const authorMap = new Map<string, number>();
  for (const r of read) {
    const author = r.Author?.trim();
    if (!author) continue;
    authorMap.set(author, (authorMap.get(author) ?? 0) + 1);
  }
  const topAuthors: AuthorCount[] = Array.from(authorMap.entries())
    .map(([author, count]) => ({ author, count }))
    .sort((a, b) => b.count - a.count || a.author.localeCompare(b.author))
    .slice(0, 8);

  return {
    totalBooks,
    totalPages,
    averageRating: Math.round(averageRating * 100) / 100,
    datedBooks,
    byYear,
    ratings,
    topAuthors,
  };
}
