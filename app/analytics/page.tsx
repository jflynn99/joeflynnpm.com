import { Metadata } from "next";
import Link from "next/link";
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

      {/* #workouts: the heatmap opens on the Workout view when linked here. */}
      <section id="workouts" className="mb-12 scroll-mt-24">
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

      {/* The world's data rather than mine: a separate app on a subdomain. */}
      <section id="world" className="mb-12 scroll-mt-24">
        <h2 className="mb-4 text-xl font-semibold">Beyond my own numbers</h2>
        <div className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-accent/50 hover:bg-card-hover">
          <h3 className="text-lg font-semibold tracking-tight">
            <a
              href="https://explorer.joeflynnpm.com"
              className="transition-colors hover:text-accent"
            >
              Really Important Metrics ↗
            </a>
          </h3>
          <p className="mt-2 text-sm text-muted">
            Charts from Our World in Data: search any of them, put two on the
            same axes, or ask a question in plain English and get the chart
            back.{" "}
            <Link
              href="/projects/fun-with-fable-part-2-really-important-metrics"
              className="underline underline-offset-2 hover:text-accent"
            >
              How I built it
            </Link>
            .
          </p>
        </div>
      </section>
    </Container>
  );
}
