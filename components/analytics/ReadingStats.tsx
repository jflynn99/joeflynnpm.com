import type { ReadingStats as Stats } from "@/lib/readingStats";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  display,
  wideLabel = false,
}: {
  label: string;
  value: number;
  max: number;
  display: string;
  wideLabel?: boolean;
}) {
  const width = max > 0 ? Math.max((value / max) * 100, 1) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span
        className={`${wideLabel ? "w-36 sm:w-44" : "w-24"} shrink-0 truncate text-right text-muted`}
        title={label}
      >
        {label}
      </span>
      <div className="h-5 flex-1 overflow-hidden rounded bg-card">
        <div
          className="h-full rounded bg-accent transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="w-16 shrink-0 tabular-nums text-muted-foreground">
        {display}
      </span>
    </div>
  );
}

export function ReadingStats({ stats }: { stats: Stats }) {
  const maxBooks = Math.max(...stats.byYear.map((y) => y.books), 1);
  const maxPages = Math.max(...stats.byYear.map((y) => y.pages), 1);
  const maxRating = Math.max(...stats.ratings.map((r) => r.count), 1);
  const maxAuthor = Math.max(...stats.topAuthors.map((a) => a.count), 1);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Books read" value={stats.totalBooks.toLocaleString()} />
        <StatCard label="Pages read" value={stats.totalPages.toLocaleString()} />
        <StatCard label="Average rating" value={`${stats.averageRating}★`} />
        <StatCard
          label="Books per year (avg)"
          value={
            stats.byYear.length > 0
              ? Math.round(stats.datedBooks / stats.byYear.length).toString()
              : "—"
          }
        />
      </div>

      <div>
        <h3 className="mb-1 text-lg font-semibold">Books per year</h3>
        <p className="mb-4 text-sm text-muted">
          Based on the {stats.datedBooks} books with a recorded finish date —
          earlier reads were logged without one.
        </p>
        <div className="space-y-2">
          {stats.byYear.map((y) => (
            <BarRow
              key={y.year}
              label={String(y.year)}
              value={y.books}
              max={maxBooks}
              display={String(y.books)}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-lg font-semibold">Pages per year</h3>
        <p className="mb-4 text-sm text-muted">
          Same caveat as above — only books with a finish date are counted.
        </p>
        <div className="space-y-2">
          {stats.byYear.map((y) => (
            <BarRow
              key={y.year}
              label={String(y.year)}
              value={y.pages}
              max={maxPages}
              display={y.pages.toLocaleString()}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Ratings distribution</h3>
        <div className="space-y-2">
          {[...stats.ratings].reverse().map((r) => (
            <BarRow
              key={r.rating}
              label={"★".repeat(r.rating)}
              value={r.count}
              max={maxRating}
              display={String(r.count)}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Most-read authors</h3>
        <div className="space-y-2">
          {stats.topAuthors.map((a) => (
            <BarRow
              key={a.author}
              label={a.author}
              value={a.count}
              max={maxAuthor}
              display={String(a.count)}
              wideLabel
            />
          ))}
        </div>
      </div>
    </div>
  );
}
