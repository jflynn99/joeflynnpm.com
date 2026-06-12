"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StarRating } from "./StarRating";

const RATE_LIMIT_KEY = "library-queries";
const RATE_LIMIT_MAX = 10;

const SUGGESTED_PROMPTS = [
  "What were Joe's five-star sci-fi reads?",
  "Did he like the Expanse series?",
  "Best history book he's read?",
  "What does Joe read about AI?",
];

interface CitedBook {
  slug: string;
  title: string;
  author: string;
  rating: number;
  coverImage?: string;
  hasReview: boolean;
}

function getRateLimitCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    if (!stored) return 0;
    const { count, date } = JSON.parse(stored);
    if (date !== new Date().toDateString()) return 0;
    return count;
  } catch {
    return 0;
  }
}

function incrementRateLimit() {
  const current = getRateLimitCount();
  localStorage.setItem(
    RATE_LIMIT_KEY,
    JSON.stringify({ count: current + 1, date: new Date().toDateString() })
  );
}

// Pull book cards out of an assistant message's tool results.
// get_review hits come first (the books actually read in full), then
// search/list results, deduped and capped so browse answers don't flood.
function extractCitedBooks(message: UIMessage, cap = 6): CitedBook[] {
  const fromReview: CitedBook[] = [];
  const fromSearch: CitedBook[] = [];

  for (const part of message.parts) {
    if (!part.type.startsWith("tool-")) continue;
    const p = part as unknown as { state?: string; output?: unknown };
    if (p.state && p.state !== "output-available") continue;
    const output = p.output as
      | {
          card?: CitedBook;
          results?: { card?: CitedBook }[];
          books?: { card?: CitedBook }[];
        }
      | undefined;
    if (!output) continue;

    if (output.card) fromReview.push(output.card);
    for (const hit of [...(output.results ?? []), ...(output.books ?? [])]) {
      if (hit.card) fromSearch.push(hit.card);
    }
  }

  const seen = new Set<string>();
  const cited: CitedBook[] = [];
  for (const book of [...fromReview, ...fromSearch]) {
    if (seen.has(book.slug)) continue;
    seen.add(book.slug);
    cited.push(book);
    if (cited.length >= cap) break;
  }
  return cited;
}

function CitedBookCard({ book }: { book: CitedBook }) {
  const inner = (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-2 pr-3 transition-colors hover:border-accent/50">
      <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-card">
        {book.coverImage ? (
          <Image
            src={book.coverImage}
            alt={book.title}
            fill
            className="object-cover"
            sizes="40px"
          />
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold">{book.title}</p>
        <p className="truncate text-xs text-muted">{book.author}</p>
        <StarRating rating={book.rating} size="sm" />
      </div>
    </div>
  );

  if (book.hasReview) {
    return (
      <Link href={`/books/${book.slug}`} className="block min-w-0">
        {inner}
      </Link>
    );
  }
  return <div className="min-w-0">{inner}</div>;
}

export function AskLibrary() {
  const [input, setInput] = useState("");
  const [rateLimitHit, setRateLimitHit] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/books/api/chat" }),
    []
  );

  const { messages, status, sendMessage } = useChat({
    transport,
    onFinish: () => {
      incrementRateLimit();
      setRateLimitHit(getRateLimitCount() >= RATE_LIMIT_MAX);
    },
    onError: (error) => {
      if (error.message?.includes("429") || error.message?.includes("limit")) {
        setRateLimitHit(true);
        setServerError(
          `Daily limit reached (${RATE_LIMIT_MAX} questions per day). Come back tomorrow!`
        );
      } else {
        setServerError("Something went wrong. Please try again later.");
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";
  const hasStarted = messages.length > 0;

  useEffect(() => {
    setRateLimitHit(getRateLimitCount() >= RATE_LIMIT_MAX);
  }, []);

  useEffect(() => {
    if (hasStarted) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages, hasStarted]);

  const ask = useCallback(
    (text: string) => {
      if (!text.trim() || isLoading || rateLimitHit) return;
      setServerError(null);
      setInput("");
      sendMessage({ text: text.trim() });
    },
    [isLoading, rateLimitHit, sendMessage]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      ask(input);
    },
    [ask, input]
  );

  return (
    <section className="mb-10 rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <svg
          className="h-5 w-5 text-accent"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
          />
        </svg>
        <h2 className="text-base font-semibold tracking-tight">
          Ask my library
        </h2>
        <span className="text-xs text-muted">
          AI answers, sourced from my reviews
        </span>
      </div>

      {/* Conversation */}
      {hasStarted && (
        <div className="mb-4 max-h-[28rem] space-y-4 overflow-y-auto pr-1">
          {messages.map((message) => {
            if (message.role === "user") {
              const text = message.parts
                .filter((p) => p.type === "text")
                .map((p) => (p as { text: string }).text)
                .join("");
              return (
                <div key={message.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-lg bg-accent px-3 py-2 text-sm text-background">
                    {text}
                  </p>
                </div>
              );
            }

            const text = message.parts
              .filter((p) => p.type === "text")
              .map((p) => (p as { text: string }).text)
              .join("")
              .trim();
            const cited = extractCitedBooks(message);

            return (
              <div key={message.id} className="space-y-3">
                {text && (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {text}
                  </p>
                )}
                {cited.length > 0 && !isLoading && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {cited.map((book) => (
                      <CitedBookCard key={book.slug} book={book} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>Checking the shelves…</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Error */}
      {serverError && (
        <p className="mb-3 text-sm text-red-500">{serverError}</p>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            hasStarted
              ? "Ask a follow-up..."
              : "What did Joe think of... ?"
          }
          aria-label="Ask a question about my books"
          disabled={rateLimitHit}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading || rateLimitHit}
          className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Ask
        </button>
      </form>

      {/* Suggested prompts */}
      {!hasStarted && !rateLimitHit && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => ask(prompt)}
              disabled={isLoading}
              className="rounded-full border border-border bg-transparent px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-accent/50 hover:text-foreground"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {rateLimitHit && !serverError && (
        <p className="mt-3 text-sm text-muted">
          Daily limit reached ({RATE_LIMIT_MAX} questions). Come back tomorrow!
        </p>
      )}
    </section>
  );
}
