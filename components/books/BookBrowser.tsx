"use client";

import { useEffect, useMemo, useState } from "react";
import type { BookListItem } from "@/lib/books";
import { BookGrid } from "./BookGrid";

const FICTION_GENRES = new Set([
  "Sci-Fi",
  "Fantasy",
  "Literary Fiction",
  "Historical Fiction",
  "Classics",
  "Crime & Thriller",
  "Horror",
]);

type Scope = "all" | "fiction" | "non-fiction";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isFiction(book: BookListItem): boolean {
  return (book.frontmatter.genres ?? []).some((g) => FICTION_GENRES.has(g));
}

interface BookBrowserProps {
  books: BookListItem[];
}

export function BookBrowser({ books }: BookBrowserProps) {
  const [query, setQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [activeRating, setActiveRating] = useState<number | null>(null);
  const [scope, setScope] = useState<Scope>("all");

  // Apply any deep-linked filters after hydration (the page itself is static)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const genre = params.get("genre");
    const rating = parseInt(params.get("rating") ?? "", 10);
    const shelf = params.get("shelf");
    if (q) setQuery(q);
    if (genre) setActiveGenre(genre);
    if (rating >= 1 && rating <= 5) setActiveRating(rating);
    if (shelf === "fiction" || shelf === "non-fiction") setScope(shelf);
  }, []);

  // Keep the URL shareable as filters change
  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (activeGenre) params.set("genre", activeGenre);
      if (activeRating) params.set("rating", String(activeRating));
      if (scope !== "all") params.set("shelf", scope);
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        qs ? `${window.location.pathname}?${qs}` : window.location.pathname
      );
    }, 300);
    return () => clearTimeout(handle);
  }, [query, activeGenre, activeRating, scope]);

  const genreCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const book of books) {
      for (const genre of book.frontmatter.genres ?? []) {
        counts.set(genre, (counts.get(genre) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    );
  }, [books]);

  const ratingCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const book of books) {
      const r = book.frontmatter.rating;
      counts[r] = (counts[r] || 0) + 1;
    }
    return counts;
  }, [books]);

  const filtered = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    return books.filter((book) => {
      if (scope === "fiction" && !isFiction(book)) return false;
      if (scope === "non-fiction" && isFiction(book)) return false;
      if (activeGenre && !(book.frontmatter.genres ?? []).includes(activeGenre))
        return false;
      if (activeRating && book.frontmatter.rating !== activeRating) return false;
      if (tokens.length > 0) {
        const haystack = normalize(
          `${book.frontmatter.title} ${book.frontmatter.author}`
        );
        if (!tokens.every((t) => haystack.includes(t))) return false;
      }
      return true;
    });
  }, [books, query, scope, activeGenre, activeRating]);

  const isFiltered =
    query !== "" || scope !== "all" || activeGenre !== null || activeRating !== null;

  const clearAll = () => {
    setQuery("");
    setActiveGenre(null);
    setActiveRating(null);
    setScope("all");
  };

  const chipClass = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-accent text-background"
        : "bg-card text-muted hover:text-foreground"
    }`;

  const scopes: { value: Scope; label: string }[] = [
    { value: "all", label: "All" },
    { value: "fiction", label: "Fiction" },
    { value: "non-fiction", label: "Non-fiction" },
  ];

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
            />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles and authors..."
            aria-label="Search books"
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Fiction / non-fiction scope */}
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card p-1">
          {scopes.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setScope(value)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                scope === value
                  ? "bg-accent text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Rating chips */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveRating(null)}
          className={chipClass(activeRating === null)}
        >
          All ratings
        </button>
        {[5, 4, 3, 2, 1].map((rating) => (
          <button
            key={rating}
            onClick={() =>
              setActiveRating(activeRating === rating ? null : rating)
            }
            className={chipClass(activeRating === rating)}
          >
            {rating}&#9733; ({ratingCounts[rating] || 0})
          </button>
        ))}
      </div>

      {/* Genre chips */}
      <div className="mb-8 flex flex-wrap items-center gap-1.5">
        {genreCounts.map(([genre, count]) => {
          const active = activeGenre === genre;
          return (
            <button
              key={genre}
              onClick={() => setActiveGenre(active ? null : genre)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-accent bg-accent text-background"
                  : "border-border bg-transparent text-muted hover:border-accent/50 hover:text-foreground"
              }`}
            >
              {genre} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Result count */}
      {isFiltered && (
        <p className="mb-6 text-sm text-muted">
          Showing {filtered.length} of {books.length} books
          <button
            onClick={clearAll}
            className="ml-3 text-accent hover:text-accent-hover"
          >
            Clear filters
          </button>
        </p>
      )}

      <BookGrid books={filtered} />
    </>
  );
}
