import Link from "next/link";
import Image from "next/image";
import type { BookListItem } from "@/lib/books";
import { StarRating } from "./StarRating";

interface BookCardProps {
  book: BookListItem;
}

export function BookCard({ book }: BookCardProps) {
  const { slug, frontmatter, hasReview } = book;

  const card = (
    <div className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-accent/50 hover:bg-card-hover">
      {frontmatter.coverImage ? (
        <div className="relative aspect-[2/3] overflow-hidden bg-background">
          <Image
            src={frontmatter.coverImage}
            alt={frontmatter.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        </div>
      ) : (
        <div className="relative aspect-[2/3] overflow-hidden bg-gradient-to-br from-card via-background to-border flex items-end p-3">
          <span className="text-sm font-medium text-foreground/70 line-clamp-4 leading-tight">
            {frontmatter.title}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-semibold tracking-tight line-clamp-2">
          {frontmatter.title}
        </h3>
        <p className="mt-1 text-xs text-muted line-clamp-1">
          {frontmatter.author}
        </p>

        <div className="mt-auto flex items-center justify-between pt-3">
          <StarRating rating={frontmatter.rating} size="sm" />
          {hasReview && (
            <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
              Review
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (hasReview) {
    return (
      <Link href={`/books/${slug}`} className="block h-full">
        {card}
      </Link>
    );
  }

  return <div className="h-full">{card}</div>;
}
