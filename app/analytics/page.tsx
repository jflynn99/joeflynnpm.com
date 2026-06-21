import { Metadata } from "next";
import { Container } from "@/components/layout";
import { WeightRampTitle } from "@/components/WeightRampTitle";
import { HabitHeatmap, ReadingStats } from "@/components/analytics";
import { getReadingStats } from "@/lib/readingStats";

export const metadata: Metadata = {
  title: "Analytics",
  description:
    "Personal metrics, habit tracking, and reading statistics visualisations.",
};

export default function AnalyticsPage() {
  const readingStats = getReadingStats();

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

      {readingStats && (
        <section id="reading" className="mb-12 scroll-mt-24">
          <h2 className="mb-4 text-xl font-semibold">Reading</h2>
          <p className="mb-6 text-muted">
            Statistics from my reading history, exported from Goodreads.
          </p>
          <ReadingStats stats={readingStats} />
        </section>
      )}
    </Container>
  );
}
