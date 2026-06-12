import { getAllBooks, type Book } from "@/lib/books";

// Fiction set mirrors components/books/BookBrowser.tsx
const FICTION_GENRES = new Set([
  "Sci-Fi",
  "Fantasy",
  "Literary Fiction",
  "Historical Fiction",
  "Classics",
  "Crime & Thriller",
  "Horror",
]);

// A book as exposed to the chat model and the chat UI. `card` carries
// everything the client needs to render a BookCard without another fetch.
export interface BookHit {
  slug: string;
  title: string;
  author: string;
  rating: number;
  genres: string[];
  dateRead: string;
  hasReview: boolean;
  snippet?: string;
  card: {
    slug: string;
    title: string;
    author: string;
    rating: number;
    coverImage?: string;
    hasReview: boolean;
  };
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function stripMarkup(content: string): string {
  return content
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isFiction(book: Book): boolean {
  return (book.frontmatter.genres ?? []).some((g) => FICTION_GENRES.has(g));
}

function toHit(book: Book, snippet?: string): BookHit {
  const { slug, frontmatter, hasReview } = book;
  return {
    slug,
    title: frontmatter.title,
    author: frontmatter.author,
    rating: frontmatter.rating,
    genres: frontmatter.genres ?? [],
    dateRead: frontmatter.dateRead,
    hasReview,
    snippet,
    card: {
      slug,
      title: frontmatter.title,
      author: frontmatter.author,
      rating: frontmatter.rating,
      coverImage: frontmatter.coverImage,
      hasReview,
    },
  };
}

// Books rarely change within a server process; load once.
let cache: Book[] | null = null;

function loadBooks(): Book[] {
  if (!cache) {
    cache = getAllBooks();
  }
  return cache;
}

function makeSnippet(text: string, tokens: string[], length = 220): string {
  const lower = normalize(text);
  let start = 0;
  for (const t of tokens) {
    const idx = lower.indexOf(t);
    if (idx >= 0) {
      start = Math.max(0, idx - 60);
      break;
    }
  }
  const raw = text.slice(start, start + length);
  const prefix = start > 0 ? "…" : "";
  const suffix = start + length < text.length ? "…" : "";
  return prefix + raw + suffix;
}

export function searchReviews(query: string, limit = 6): BookHit[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const scored = loadBooks().map((book) => {
    const title = normalize(book.frontmatter.title);
    const author = normalize(book.frontmatter.author);
    const genres = normalize((book.frontmatter.genres ?? []).join(" "));
    const review = stripMarkup(book.content);
    const reviewNorm = normalize(review);

    let score = 0;
    for (const t of tokens) {
      if (title.includes(t)) score += 10;
      if (author.includes(t)) score += 8;
      if (genres.includes(t)) score += 4;
      // Count occurrences in the review body, capped so one chatty review
      // doesn't drown out title matches elsewhere
      let idx = reviewNorm.indexOf(t);
      let occurrences = 0;
      while (idx >= 0 && occurrences < 5) {
        occurrences++;
        idx = reviewNorm.indexOf(t, idx + t.length);
      }
      score += occurrences;
    }
    return { book, review, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ book, review }) =>
      toHit(book, book.hasReview ? makeSnippet(review, tokens) : undefined)
    );
}

export function getReview(
  slug: string
): (BookHit & { review: string }) | null {
  const book = loadBooks().find((b) => b.slug === slug);
  if (!book) return null;
  return { ...toHit(book), review: stripMarkup(book.content) };
}

export interface ListFilters {
  genre?: string;
  minRating?: number;
  scope?: "fiction" | "non-fiction";
  limit?: number;
}

export function listBooks(filters: ListFilters): {
  total: number;
  books: BookHit[];
} {
  const { genre, minRating, scope, limit = 20 } = filters;
  const matches = loadBooks().filter((book) => {
    if (genre) {
      const want = normalize(genre);
      const has = (book.frontmatter.genres ?? []).some((g) =>
        normalize(g).includes(want)
      );
      if (!has) return false;
    }
    if (minRating && book.frontmatter.rating < minRating) return false;
    if (scope === "fiction" && !isFiction(book)) return false;
    if (scope === "non-fiction" && isFiction(book)) return false;
    return true;
  });
  return {
    total: matches.length,
    books: matches.slice(0, limit).map((b) => toHit(b)),
  };
}

export function getAllGenres(): { genre: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const book of loadBooks()) {
    for (const g of book.frontmatter.genres ?? []) {
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([genre, count]) => ({ genre, count }));
}
