import Link from "next/link";
import { Container } from "@/components/layout";
import { FiveStarPick } from "@/components/books";
import { getFiveStarPicks } from "@/lib/fiveStarPicks";

export default function NotFound() {
  const picks = getFiveStarPicks();

  return (
    <Container>
      <div className="flex min-h-[50vh] flex-col items-center justify-center py-12 text-center">
        <p className="text-6xl font-bold text-accent">404</p>
        <h1 className="mt-4 text-2xl font-semibold">This page doesn&apos;t exist.</h1>

        {picks.length > 0 && (
          <>
            <p className="mt-2 mb-6 text-muted">
              Here&apos;s a book that does, and I gave it five stars.
            </p>
            <FiveStarPick picks={picks} />
          </>
        )}

        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to home
        </Link>
      </div>
    </Container>
  );
}
