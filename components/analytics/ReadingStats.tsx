import type { ReadingStats as Stats } from "@/lib/readingStats";
import { BooksPerYear } from "./BooksPerYear";
import { GenresOverTime } from "./GenresOverTime";
import { PublicationStrip } from "./PublicationStrip";
import { Ratings } from "./Ratings";
import { TopAuthors } from "./TopAuthors";
import { yearRange } from "./YearAxis";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}

export function ReadingStats({ stats }: { stats: Stats }) {
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Books read" value={stats.totalBooks.toLocaleString()} />
        <StatCard label="Pages read" value={stats.totalPages.toLocaleString()} />
        <StatCard label="Average rating" value={`${stats.averageRating}★`} />
        <StatCard
          label="Fiction / Non-fiction"
          value={`${stats.fictionBooks} / ${stats.nonFictionBooks}`}
        />
      </div>

      <BooksPerYear byYear={stats.byYear} datedBooks={stats.datedBooks} />

      <GenresOverTime genres={stats.genresOverTime} years={yearRange(stats.byYear.map((y) => y.year))} />

      <PublicationStrip books={stats.publicationYears} />

      <Ratings
        ratings={stats.ratings}
        ratingByYear={stats.ratingByYear}
        years={yearRange(stats.byYear.map((y) => y.year))}
      />

      <TopAuthors authors={stats.topAuthors} />
    </div>
  );
}
