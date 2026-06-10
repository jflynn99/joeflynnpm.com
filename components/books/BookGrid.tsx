import { BookCard } from "./BookCard";
import type { BookListItem } from "@/lib/books";

interface BookGridProps {
  books: BookListItem[];
}

export function BookGrid({ books }: BookGridProps) {
  if (books.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted">No books found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {books.map((book) => (
        <BookCard key={book.slug} book={book} />
      ))}
    </div>
  );
}
