import { Metadata } from "next";
import { Container } from "@/components/layout";
import { WeightRampTitle } from "@/components/WeightRampTitle";
import { HabitHeatmap, ReadingStats } from "@/components/analytics";
import { getAllBooks } from "@/lib/books";
import { computeReadingStats } from "@/lib/readingStats";

export const metadata: Metadata = {
  title: "Analytics",
  description:
    "Personal metrics, habit tracking, and reading statistics visualisations.",
};

export default function AnalyticsPage() {
  const readingStats = computeReadingStats(
    getAllBooks().map((book) => book.frontmatter)
  );

  return (
    <Container width="wide">
      <div className="mb-8">
        <WeightRampTitle
          as="h1"
          className="text-3xl tracking-tight sm:text-4xl"
          text="Analytics"
        />
        <p className="mt-2 text-muted">
          Personal metrics and habit tracking visualisations.
        </p>
      </div>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">Habit Tracking</h2>
        <p className="mb-6 text-muted">
          A 365-day view of various habits, inspired by GitHub contribution
          graphs.
        </p>
        <HabitHeatmap />
      </section>

      {readingStats.totalBooks > 0 && (
        <section id="reading" className="mb-12 scroll-mt-24">
          <h2 className="mb-4 text-xl font-semibold">Reading</h2>
          <p className="mb-6 text-muted">
            Statistics from my reading history, worked out from the reviews on
            this site.
          </p>
          <ReadingStats stats={readingStats} />
        </section>
      )}
    </Container>
  );
}
