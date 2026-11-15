// The library chatbot's eval suite: the shape of the questions file and the
// snapshots, and the exact checks for lookups and counts. Pure functions over
// plain Book data, so `npm test` can run them without the model.

import { z } from "zod";

export const EVAL_GROUPS = ["lookup", "count", "recommendation", "decline"] as const;

const checkSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("rating"), slug: z.string().min(1) }),
  z.strictObject({ kind: z.literal("readMonth"), slug: z.string().min(1) }),
  z.strictObject({ kind: z.literal("genreAndRating"), slug: z.string().min(1) }),
  z.strictObject({ kind: z.literal("titlesByAuthor"), author: z.string().min(1) }),
  z.strictObject({
    kind: z.literal("count"),
    genre: z.string().min(1).optional(),
    year: z.number().int().optional(),
    author: z.string().min(1).optional(),
    rating: z.number().int().min(1).max(5).optional(),
  }),
  z.strictObject({ kind: z.literal("topAuthor") }),
  z.strictObject({ kind: z.literal("rubric"), rubric: z.string().min(1) }),
]);

export type EvalCheck = z.infer<typeof checkSchema>;

const questionSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  group: z.enum(EVAL_GROUPS),
  question: z.string().min(1),
  check: checkSchema,
});

export type EvalQuestion = z.infer<typeof questionSchema>;

export const questionsFileSchema = z
  .strictObject({
    approved: z.iso.date(),
    questions: z.array(questionSchema).min(1),
  })
  .refine((file) => new Set(file.questions.map((q) => q.id)).size === file.questions.length, {
    message: "Question ids must be unique",
  })
  .refine(
    (file) =>
      file.questions.every((q) =>
        q.group === "lookup" || q.group === "count" ? q.check.kind !== "rubric" : q.check.kind === "rubric",
      ),
    { message: "Lookups and counts are checked exactly; recommendations and declines use a rubric" },
  );

const priceSchema = z.strictObject({
  input: z.number().nonnegative(),
  output: z.number().nonnegative(),
  cacheRead: z.number().nonnegative(),
  cacheWrite: z.number().nonnegative(),
});

const usageSchema = z.strictObject({
  inputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  cacheWriteTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
});

export type EvalUsage = z.infer<typeof usageSchema>;
export type EvalPrice = z.infer<typeof priceSchema>;

export const snapshotSchema = z.strictObject({
  date: z.iso.datetime(),
  model: z.string().min(1),
  graderModel: z.string().min(1),
  /** One line in Joe's words on what changed since the last run. Optional. */
  note: z.string().min(1).optional(),
  /** US dollars per million tokens, as published on the run date. */
  prices: z.record(z.string(), priceSchema),
  passed: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  passRate: z.number().min(0).max(1),
  cost: z.strictObject({
    usd: z.number().nonnegative(),
    chatbot: usageSchema,
    grader: usageSchema,
  }),
  results: z.array(
    z.strictObject({
      id: z.string(),
      group: z.enum(EVAL_GROUPS),
      question: z.string(),
      expected: z.string(),
      answer: z.string(),
      pass: z.boolean(),
      reason: z.string(),
      steps: z.number().int().nonnegative(),
      tools: z.array(z.string()),
    }),
  ),
});

export type EvalSnapshot = z.infer<typeof snapshotSchema>;

/** Dollar cost of some usage at a per-million-token price. */
export function costOf(usage: EvalUsage, price: EvalPrice): number {
  return (
    (usage.inputTokens * price.input +
      usage.cacheReadTokens * price.cacheRead +
      usage.cacheWriteTokens * price.cacheWrite +
      usage.outputTokens * price.output) /
    1_000_000
  );
}

// --- Exact checks ---------------------------------------------------------

export interface EvalBook {
  slug: string;
  frontmatter: {
    title: string;
    author: string;
    rating: number;
    dateRead: string;
    genres?: string[];
    undated?: boolean;
    podcast?: boolean;
  };
}

export interface CheckResult {
  expected: string;
  pass: boolean;
  reason: string;
}

const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
  "nineteen", "twenty",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ");
}

function numberPattern(n: number): string {
  const word = NUMBER_WORDS[n];
  return word ? `(?:${n}|${word})` : String(n);
}

/** Does the answer state the number on its own (not as part of a bigger number)? */
export function mentionsNumber(answer: string, n: number): boolean {
  return new RegExp(`(?<![\\d.])\\b${numberPattern(n)}\\b(?!\\d|\\.\\d)`, "i").test(normalise(answer));
}

/** Does the answer give this star rating ("4 stars", "4/5", "four out of five", "4-star")? */
export function mentionsRating(answer: string, rating: number): boolean {
  const n = numberPattern(rating);
  return new RegExp(
    `\\b${n}(?:\\s*/\\s*5|\\s*-?\\s*stars?|\\s+out\\s+of\\s+(?:5|five))`,
    "i",
  ).test(normalise(answer));
}

const DENIAL =
  /\b(?:didn't|did not|couldn't|could not|can't|cannot|don't|do not|wasn't able to|was not able to)\s+(?:find|see|locate|spot)\b|\bnot (?:on|in) (?:his|joe's|the) (?:shelf|library|reviews|list)\b|\b(?:hasn't|has not|never) read\b|\bno (?:sign|record|mention) of\b/i;

/** The answer with any clause that denies something removed ("I didn't find The Road"). */
export function withoutDenials(answer: string): string {
  return answer
    .split(/(?<=[.!?])\s+|\n+|;\s*|,?\s+(?:but|although|though|while|whereas)\s+(?!not\b)/i)
    .filter((clause) => !DENIAL.test(normalise(clause)))
    .join("\n");
}

/** A title as a person would write it: no series tag, no subtitle. */
export function shortTitle(title: string): string {
  return title
    .replace(/\s*\([^)]*\)\s*$/, "")
    .split(/[:]|,\s*or,?\s/i)[0]
    .trim();
}

function mentionsTitle(answer: string, title: string): boolean {
  return normalise(answer).includes(normalise(shortTitle(title)));
}

function inScope(book: EvalBook): boolean {
  return !book.frontmatter.podcast;
}

function countBooks(books: EvalBook[], check: Extract<EvalCheck, { kind: "count" }>): number {
  return books.filter((book) => {
    const { genres = [], dateRead, undated, author, rating } = book.frontmatter;
    if (!inScope(book)) return false;
    if (check.genre && !genres.includes(check.genre)) return false;
    if (check.author && author !== check.author) return false;
    if (check.rating !== undefined && rating !== check.rating) return false;
    if (check.year !== undefined && (undated || !dateRead.startsWith(`${check.year}-`))) return false;
    return true;
  }).length;
}

function bookFor(books: EvalBook[], slug: string): EvalBook {
  const book = books.find((b) => b.slug === slug);
  if (!book) throw new Error(`Eval question refers to "${slug}", which is not a Book`);
  return book;
}

/** Grade an answer exactly against the Book data. Expected values are worked out now, not stored. */
export function checkExactly(
  check: Exclude<EvalCheck, { kind: "rubric" }>,
  answer: string,
  books: EvalBook[],
): CheckResult {
  switch (check.kind) {
    case "rating": {
      const { rating, title } = bookFor(books, check.slug).frontmatter;
      const pass = mentionsRating(answer, rating);
      return {
        expected: `${shortTitle(title)}: ${rating} stars`,
        pass,
        reason: pass ? `States the ${rating}-star rating.` : `Does not state the ${rating}-star rating.`,
      };
    }
    case "readMonth": {
      const { dateRead, title } = bookFor(books, check.slug).frontmatter;
      const [year, month] = dateRead.split("-");
      const monthName = MONTHS[Number(month) - 1];
      const text = normalise(answer);
      const hasMonth = text.includes(monthName.toLowerCase()) || text.includes(dateRead);
      const pass = hasMonth && text.includes(year);
      return {
        expected: `${shortTitle(title)}: read ${monthName} ${year}`,
        pass,
        reason: pass ? `Gives ${monthName} ${year}.` : `Does not give ${monthName} ${year}.`,
      };
    }
    case "genreAndRating": {
      const { genres = [], rating, title } = bookFor(books, check.slug).frontmatter;
      const text = normalise(answer);
      const missingGenres = genres.filter((g) => {
        const forms = [g, g.replace("-", " "), g.replace("Sci-Fi", "science fiction")];
        return !forms.some((form) => text.includes(normalise(form)));
      });
      const hasRating = mentionsRating(answer, rating);
      const pass = missingGenres.length === 0 && hasRating;
      return {
        expected: `${shortTitle(title)}: ${genres.join(", ")}; ${rating} stars`,
        pass,
        reason: pass
          ? "Gives the Genre and the rating."
          : [
              missingGenres.length > 0 && `Missing Genre: ${missingGenres.join(", ")}.`,
              !hasRating && `Does not state the ${rating}-star rating.`,
            ]
              .filter(Boolean)
              .join(" "),
      };
    }
    case "titlesByAuthor": {
      const titles = books
        .filter((b) => inScope(b) && b.frontmatter.author === check.author)
        .map((b) => shortTitle(b.frontmatter.title));
      const unique = [...new Set(titles)];
      const affirmed = withoutDenials(answer);
      const missing = unique.filter((t) => !mentionsTitle(affirmed, t));
      return {
        expected: unique.join("; "),
        pass: missing.length === 0,
        reason: missing.length === 0 ? `Names all ${unique.length}.` : `Missing: ${missing.join("; ")}.`,
      };
    }
    case "count": {
      const n = countBooks(books, check);
      const pass = mentionsNumber(withoutDenials(answer), n);
      return {
        expected: String(n),
        pass,
        reason: pass ? `States ${n}.` : `Does not state ${n}.`,
      };
    }
    case "topAuthor": {
      const counts = new Map<string, number>();
      for (const b of books.filter(inScope)) {
        counts.set(b.frontmatter.author, (counts.get(b.frontmatter.author) ?? 0) + 1);
      }
      const max = Math.max(...counts.values());
      const top = [...counts].filter(([, n]) => n === max).map(([name]) => name).sort();
      const affirmed = withoutDenials(answer);
      const text = normalise(affirmed);
      const surname = (name: string) => normalise(name.split(" ").at(-1) ?? name);
      const missing = top.filter((name) => !text.includes(surname(name)));
      const pass = missing.length === 0 && mentionsNumber(affirmed, max);
      return {
        expected: `${top.join(" and ")} (${max}${top.length > 1 ? " each" : ""})`,
        pass,
        reason: pass
          ? "Names every top author with the count."
          : [missing.length > 0 && `Missing: ${missing.join(", ")}.`, !mentionsNumber(affirmed, max) && `Does not state ${max}.`]
              .filter(Boolean)
              .join(" "),
      };
    }
  }
}
