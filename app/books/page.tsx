import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout";
import { BookGrid, RatingFilter } from "@/components/books";
import { getAllBooks, getBooksByRating } from "@/lib/books";

export const metadata: Metadata = {
  title: "Books",
  description: "Books I've read, rated, and reviewed.",
};

interface BooksPageProps {
  searchParams: { rating?: string };
}

function BooksContent({ rating }: { rating?: string }) {
  const allBooks = getAllBooks();
  const ratingNum = rating ? parseInt(rating, 10) : null;
  const books = ratingNum ? getBooksByRating(ratingNum) : allBooks;

  const counts: Record<number, number> = {};
  for (const book of allBooks) {
    const r = book.frontmatter.rating;
    counts[r] = (counts[r] || 0) + 1;
  }

  return (
    <>
      <RatingFilter counts={counts} total={allBooks.length} />
      {ratingNum && (
        <p className="mb-6 text-muted">
          Showing {books.length} book{books.length !== 1 ? "s" : ""} rated{" "}
          <span className="text-accent">{ratingNum}&#9733;</span>
        </p>
      )}
      <BookGrid books={books} />
    </>
  );
}

export default function BooksPage({ searchParams }: BooksPageProps) {
  return (
    <Container>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Books</h1>
        <p className="mt-2 text-muted">
          Books I&apos;ve read, rated, and reviewed. It should be noted I am a generous
          and enthusiastic reviewer, and some books may be downgraded if I read them
          again now.
        </p>
        <Link
          href="/analytics#reading"
          className="mt-3 inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover"
        >
          View my reading stats
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="py-12 text-center text-muted">Loading...</div>
        }
      >
        <BooksContent rating={searchParams.rating} />
      </Suspense>
    </Container>
  );
}
