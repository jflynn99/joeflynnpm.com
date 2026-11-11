// Current Reads: books Joe has started and not finished (see GLOSSARY.md).
// They are not Books, so they live in their own file and never reach /books
// or the reading stats.

import fs from "fs";
import path from "path";
import { z } from "zod";
import { getBookListItems } from "./books.ts";

const currentReadSchema = z.strictObject({
  title: z.string().min(1),
  author: z.string().min(1),
  /** ISO month ("2026-09") or full date ("2026-09-14"). */
  started: z.union([z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), z.iso.date()]).optional(),
  coverImage: z.string().startsWith("/").optional(),
  /** Slug of a Book already on the site, e.g. the earlier book in a series. */
  relatedBook: z.string().min(1).optional(),
});

/** The parts of a Book a Current Read needs to link to it. */
export interface RelatedBookRef {
  slug: string;
  title: string;
  hasReview: boolean;
}

export type CurrentRead = z.infer<typeof currentReadSchema> & {
  /** Set only when `relatedBook` has a review to read. */
  relatedReview?: { href: string; title: string };
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09" or "2026-09-14" → "Sep 2026". Parsed by hand so no timezone can shift the month. */
export function formatStarted(started: string): string {
  const [year, month] = started.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

/** "Days Without End (Days Without End, #1)" → "Days Without End". Goodreads-style series suffix. */
function withoutSeries(title: string): string {
  return title.replace(/\s*\([^()]*#\d+[^()]*\)$/, "");
}

/** Validate the raw list against the Books on the site. Throws on anything wrong. */
export function parseCurrentReads(raw: unknown, books: RelatedBookRef[]): CurrentRead[] {
  const bySlug = new Map(books.map((book) => [book.slug, book]));

  return z
    .array(currentReadSchema)
    .parse(raw)
    .map((read) => {
      if (!read.relatedBook) return read;
      const book = bySlug.get(read.relatedBook);
      if (!book) {
        throw new Error(
          `Current Read "${read.title}" has relatedBook "${read.relatedBook}", which is not a Book on the site`,
        );
      }
      return book.hasReview
        ? { ...read, relatedReview: { href: `/books/${book.slug}`, title: withoutSeries(book.title) } }
        : read;
    });
}

const currentReadsFile = path.join(process.cwd(), "content/current-reads.json");

export function getCurrentReads(): CurrentRead[] {
  if (!fs.existsSync(currentReadsFile)) return [];
  const raw = JSON.parse(fs.readFileSync(currentReadsFile, "utf8"));
  const books = getBookListItems().map(({ slug, frontmatter, hasReview }) => ({
    slug,
    title: frontmatter.title,
    hasReview,
  }));
  return parseCurrentReads(raw, books);
}
