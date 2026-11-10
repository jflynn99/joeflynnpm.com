import type { AuthorCount } from "@/lib/readingStats";
import { FICTION, NON_FICTION, Swatch } from "./FictionLegend";

/** "7 books · 4.3★", or just the count when none of the author's Books are rated. */
function summary(author: AuthorCount) {
  const count = `${author.count} ${author.count === 1 ? "book" : "books"}`;
  return author.averageRating === null ? count : `${count} · ${author.averageRating.toFixed(1)}★`;
}

/**
 * The most-read authors as a ranked list. Each bar is as long as the author's
 * Books read, relative to the top author, and split Fiction / Non-fiction.
 */
export function TopAuthors({ authors }: { authors: AuthorCount[] }) {
  const max = Math.max(...authors.map((a) => a.count), 1);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-lg font-semibold">Most-read authors</h3>
        <div className="flex gap-4 text-sm text-muted">
          <Swatch color={FICTION} label="Fiction" />
          <Swatch color={NON_FICTION} label="Non-fiction" />
        </div>
      </div>
      <ol className="space-y-2">
        {authors.map((a) => (
          <li
            key={a.author}
            className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-x-3 gap-y-1 text-sm sm:grid-cols-[11rem_1fr_9rem]"
          >
            <span className="truncate text-right text-muted" title={a.author}>
              {a.author}
            </span>
            <div
              role="img"
              aria-label={`${a.author}: ${a.fiction} Fiction, ${a.nonFiction} Non-fiction`}
              className="flex h-5 overflow-hidden rounded bg-card"
            >
              <div className="flex h-full gap-px" style={{ width: `${(a.count / max) * 100}%` }}>
                {a.fiction > 0 && <span className="h-full" style={{ flexGrow: a.fiction, background: FICTION }} />}
                {a.nonFiction > 0 && (
                  <span className="h-full" style={{ flexGrow: a.nonFiction, background: NON_FICTION }} />
                )}
              </div>
            </div>
            <span className="whitespace-nowrap tabular-nums text-muted-foreground">{summary(a)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
