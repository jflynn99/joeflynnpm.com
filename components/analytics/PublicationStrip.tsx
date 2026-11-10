"use client";

import { useState } from "react";
import type { PublishedBook } from "@/lib/readingStats";

/** Books before this share one "Earlier" row, so antiquity doesn't stretch the scale. */
const EARLIER_BEFORE = 1800;

const formatYear = (year: number) => (year < 0 ? `${-year} BCE` : String(year));

interface Row {
  label: string;
  books: PublishedBook[];
}

/** One row per decade from 1800 to the latest Book, every decade shown, plus "Earlier". */
function decadeRows(books: PublishedBook[]): Row[] {
  if (books.length === 0) return [];
  const earlier = books.filter((b) => b.year < EARLIER_BEFORE);
  const latest = Math.max(...books.map((b) => b.year));
  const rows: Row[] = earlier.length > 0 ? [{ label: "Earlier", books: earlier }] : [];
  for (let decade = EARLIER_BEFORE; decade <= latest; decade += 10) {
    rows.push({
      label: `${decade}s`,
      books: books.filter((b) => b.year >= decade && b.year < decade + 10),
    });
  }
  return rows;
}

/**
 * Publication year as a strip of dots, one per Book, a row per decade (oldest
 * first). Hover or tap a dot for its Book.
 */
export function PublicationStrip({ books }: { books: PublishedBook[] }) {
  const [active, setActive] = useState<PublishedBook | null>(null);
  const rows = decadeRows(books);

  // Keyboard: the strip takes focus once, and the arrow keys step through
  // the Books oldest to newest, so the readout works without a mouse.
  const step = (e: React.KeyboardEvent) => {
    const keys: Record<string, (i: number) => number> = {
      ArrowRight: (i) => i + 1,
      ArrowDown: (i) => i + 1,
      ArrowLeft: (i) => i - 1,
      ArrowUp: (i) => i - 1,
      Home: () => 0,
      End: () => books.length - 1,
    };
    const move = keys[e.key];
    if (!move || books.length === 0) return;
    e.preventDefault();
    const current = active ? books.indexOf(active) : -1;
    const next = current === -1 && e.key !== "End" ? 0 : move(current);
    setActive(books[Math.min(Math.max(next, 0), books.length - 1)]);
  };

  return (
    <div>
      <h3 className="mb-1 text-lg font-semibold">When the books were published</h3>
      <p className="mb-4 text-sm text-muted">
        Each dot is one of {books.length} books, by the decade it first came out.
        Books from before {EARLIER_BEFORE} share the first row.
      </p>

      <p className="mb-3 min-h-5 text-sm" aria-live="polite">
        {active ? (
          <>
            <span className="font-semibold">{active.title}</span>
            <span className="text-muted">
              {" · "}
              {active.author} · {formatYear(active.year)}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Hover over or tap a dot to see the book.</span>
        )}
      </p>

      {/* The dots are hidden from screen readers: the list below carries the
          same information as text, and the readout announces keyboard steps. */}
      <div
        role="group"
        tabIndex={0}
        aria-label="Publication strip. Use the arrow keys to step through the books, oldest first."
        className="space-y-px rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        onKeyDown={step}
        onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
      >
        {rows.map((row) => (
          <div key={row.label} aria-hidden className="flex items-start gap-3">
            <span className="w-12 shrink-0 text-right text-[10px] leading-3 tabular-nums text-muted">
              {row.label}
            </span>
            <div className="flex min-h-3 flex-1 flex-wrap border-l border-border pl-1">
              {row.books.map((book) => {
                const isActive = active === book;
                return (
                  <span
                    key={`${book.title}-${book.author}`}
                    className="flex h-3 w-3 cursor-pointer items-center justify-center"
                    onPointerEnter={(e) => e.pointerType === "mouse" && setActive(book)}
                    onClick={() => setActive(book)}
                  >
                    <span
                      className={`block h-1.5 w-1.5 rounded-full ${isActive ? "scale-150 bg-accent" : "bg-muted-foreground"}`}
                    />
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <ul className="sr-only">
        {rows
          .filter((row) => row.books.length > 0)
          .map((row) => (
            <li key={row.label}>
              {row.label}, {row.books.length} {row.books.length === 1 ? "book" : "books"}:{" "}
              {row.books.map((b) => `${b.title} (${formatYear(b.year)})`).join(", ")}
            </li>
          ))}
      </ul>
    </div>
  );
}
