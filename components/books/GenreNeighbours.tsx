import Image from "next/image";
import Link from "next/link";
import type { BookListItem } from "@/lib/books";
import { withoutSeries } from "@/lib/currentReads";

interface GenreNeighboursProps {
  books: BookListItem[];
}

/** Up to six Books sharing a Genre, as small linked covers. */
export function GenreNeighbours({ books }: GenreNeighboursProps) {
  if (books.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-border" aria-labelledby="genre-neighbours">
      <h2 id="genre-neighbours" className="text-lg font-semibold tracking-tight">
        More in the same genres
      </h2>
      <ul className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-6">
        {books.map(({ slug, frontmatter }) => {
          const title = withoutSeries(frontmatter.title);
          return (
            <li key={slug} className="min-w-0">
              <Link href={`/books/${slug}`} className="group block">
                <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-card">
                  {frontmatter.coverImage ? (
                    <Image
                      src={frontmatter.coverImage}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 30vw, 110px"
                      unoptimized
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-end p-2 text-xs font-medium text-foreground/70 line-clamp-4">
                      {title}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs font-semibold leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                  {title}
                </p>
                <p className="text-xs text-muted line-clamp-1">{frontmatter.author}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
