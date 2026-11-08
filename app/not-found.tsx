import Link from "next/link";
import { Container } from "@/components/layout";

export default function NotFound() {
  return (
    <Container>
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h1 className="text-6xl font-bold text-accent">404</h1>
        <h2 className="mt-4 text-2xl font-semibold">Page Not Found</h2>
        <p className="mt-2 text-muted">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-accent-hover"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Home
        </Link>
      </div>
    </Container>
  );
}
