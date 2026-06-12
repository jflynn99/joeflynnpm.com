import { tool } from "ai";
import { z } from "zod";
import {
  searchReviews,
  getReview,
  listBooks,
  getAllGenres,
} from "./search";

export const libraryTools = {
  search_reviews: tool({
    description:
      "Search Joe's book reviews by keyword. Matches titles, authors, genres, and review text. Call this first for any question about a specific book, author, series, or topic. Returns up to 6 matches with a snippet of the review.",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "Keywords to search for, e.g. a title, author, series name, or topic"
        ),
    }),
    execute: async ({ query }) => {
      const results = searchReviews(query);
      if (results.length === 0) {
        return {
          results: [],
          note: "No matches. Joe may not have read this book, or it may be shelved under a different title. Try alternative keywords (author surname, series name) before concluding he hasn't read it.",
        };
      }
      return { results };
    },
  }),

  get_review: tool({
    description:
      "Get Joe's full review of one book by its slug (from search_reviews or list_books results). Use this before quoting or summarising what Joe thought — snippets alone can be misleading.",
    inputSchema: z.object({
      slug: z.string().describe("The book's slug"),
    }),
    execute: async ({ slug }) => {
      const result = getReview(slug);
      if (!result) {
        return { error: `No book found with slug "${slug}".` };
      }
      return result;
    },
  }),

  list_books: tool({
    description:
      "List Joe's books with structured filters: genre, minimum rating, and fiction/non-fiction. Call this for browse-style questions like 'best sci-fi', 'five-star history books', or 'what non-fiction has Joe read'. Valid genres can be discovered with no filters via the genres field.",
    inputSchema: z.object({
      genre: z
        .string()
        .optional()
        .describe(
          "Genre filter, e.g. Sci-Fi, History, Philosophy, AI & Tech, Biography & Memoir"
        ),
      minRating: z
        .number()
        .int()
        .min(1)
        .max(5)
        .optional()
        .describe("Only books rated at or above this (1-5)"),
      scope: z
        .enum(["fiction", "non-fiction"])
        .optional()
        .describe("Restrict to fiction or non-fiction"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe("Max books to return (default 20)"),
    }),
    execute: async ({ genre, minRating, scope, limit }) => {
      const { total, books } = listBooks({ genre, minRating, scope, limit });
      if (total === 0) {
        return {
          total: 0,
          books: [],
          genres: getAllGenres(),
          note: "No books matched. The genres field lists every valid genre and its count.",
        };
      }
      return { total, books };
    },
  }),
};
