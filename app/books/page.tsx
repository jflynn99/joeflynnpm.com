import { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout";
import { BookBrowser } from "@/components/books";
import { getBookListItems } from "@/lib/books";

export const metadata: Metadata = {
  title: "Books",
  description: "Books I've read, rated, and reviewed.",
};

export default function BooksPage() {
  const books = getBookListItems();

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

      <BookBrowser books={books} />
    </Container>
  );
}
