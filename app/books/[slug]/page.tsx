import { notFound } from "next/navigation";
import { ogCardUrl } from "@/lib/ogCard";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout";
import { GenreNeighbours, StarRating } from "@/components/books";
import { getBookBySlug, getBookListItems, getBookSlugs, type BookListItem } from "@/lib/books";
import { withoutSeries } from "@/lib/currentReads";
import { genreNeighbours } from "@/lib/genreNeighbours";
import { readMonth, readingNeighbours } from "@/lib/readingOrder";
import { MDXRemote } from "next-mdx-remote/rsc";
import { LongFormBody } from "@/components/LongFormBody";
import { mdxOptions } from "@/lib/mdxOptions";
import { mdxComponents } from "@/components/mdx";

interface BookPageProps {
  params: Promise<{ slug: string }>;
}

// Only slugs that exist at build time are served. Anything else 404s without
// the slug ever reaching a filesystem path.
export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = getBookSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BookPageProps): Promise<Metadata> {
  const book = getBookBySlug((await params).slug);

  if (!book) {
    return { title: "Book Not Found" };
  }

  const { frontmatter } = book;

  // A generated card wins when the book opts in; otherwise the portrait
  // cover stays the share image, exactly as before.
  const card = ogCardUrl({
    ogCard: frontmatter.ogCard,
    title: frontmatter.title,
    kicker: book.hasReview ? "BOOK REVIEW" : "BOOK",
    sub: [frontmatter.author],
    img: frontmatter.coverImage,
  });

  const title = `${frontmatter.title} by ${frontmatter.author}`;
  const description = book.hasReview
    ? `Review of ${frontmatter.title} by ${frontmatter.author} — ${frontmatter.rating}/5 stars.`
    : (frontmatter.oneLiner ??
      `${frontmatter.title} by ${frontmatter.author}, rated ${frontmatter.rating}/5 by Joe.`);
  const shareImage = card ?? frontmatter.coverImage;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: card
        ? [{ url: card, width: 1200, height: 630 }]
        : frontmatter.coverImage
          ? [{ url: frontmatter.coverImage, width: 600, height: 900 }]
          : [],
    },
    twitter: {
      // A portrait cover gets cropped badly in the wide layout, so only the
      // generated 1200×630 card uses it.
      card: card ? "summary_large_image" : "summary",
      title,
      description,
      images: shareImage ? [shareImage] : [],
      // Child metadata replaces the root twitter object wholesale.
      site: "@AiBabysteps",
      creator: "@AiBabysteps",
    },
  };
}

function BookLink({ book }: { book: BookListItem }) {
  return (
    <Link href={`/books/${book.slug}`} className="text-foreground underline decoration-border underline-offset-2 hover:text-accent hover:decoration-accent transition-colors">
      {withoutSeries(book.frontmatter.title)}
    </Link>
  );
}

/** "Read in March 2024, between X and Y", or nothing for a Book outside the order. */
function ReadingOrderLine({ book, books }: { book: BookListItem; books: BookListItem[] }) {
  const neighbours = readingNeighbours(book.slug, books);
  if (!neighbours) return null;
  const { before, after } = neighbours;
  const month = readMonth(book.frontmatter.dateRead);

  return (
    <p className="mt-2 text-sm text-muted">
      Read in {month}
      {before && after ? (
        <>
          , between <BookLink book={before} /> and <BookLink book={after} />
        </>
      ) : before ? (
        <>
          , after <BookLink book={before} />
        </>
      ) : after ? (
        <>
          , followed by <BookLink book={after} />
        </>
      ) : null}
      .
    </p>
  );
}

export default async function BookPage({ params }: BookPageProps) {
  const book = getBookBySlug((await params).slug);

  if (!book) {
    notFound();
  }

  const { frontmatter, content } = book;
  const allBooks = getBookListItems();
  const listItem = { slug: book.slug, frontmatter, hasReview: book.hasReview };
  const neighbours = genreNeighbours(book.slug, allBooks);

  return (
    <article>
      {book.hasReview && <div className="reading-progress" aria-hidden="true" />}
      <Container width="narrow">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted mb-6">
          <Link
            href="/books"
            className="hover:text-accent transition-colors"
          >
            Books
          </Link>
          <span>/</span>
          <span className="line-clamp-1">{frontmatter.title}</span>
        </div>

        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row gap-6">
          {frontmatter.coverImage && (
            <div className="relative w-32 sm:w-40 flex-shrink-0 aspect-[2/3] overflow-hidden rounded-lg">
              <Image
                src={frontmatter.coverImage}
                alt={frontmatter.title}
                fill
                className="object-cover"
                priority
                sizes="160px"
                unoptimized
              />
            </div>
          )}

          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {frontmatter.title}
            </h1>
            <p className="mt-1 text-lg text-muted">{frontmatter.author}</p>
            <div className="mt-3">
              <StarRating rating={frontmatter.rating} size="lg" />
            </div>
            <ReadingOrderLine book={listItem} books={allBooks} />
            {frontmatter.genres && frontmatter.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {frontmatter.genres.map((genre) => (
                  <Link
                    key={genre}
                    href={`/books?genre=${encodeURIComponent(genre)}`}
                    className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-accent/50 hover:text-foreground"
                  >
                    {genre}
                  </Link>
                ))}
              </div>
            )}
            {frontmatter.goodreadsUrl && (
              <a
                href={frontmatter.goodreadsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm text-muted hover:text-accent transition-colors"
              >
                View on Goodreads →
              </a>
            )}
          </div>
        </header>

        {frontmatter.oneLiner && (
          <p className="mb-8 border-l-2 border-accent pl-4 text-lg italic">
            {frontmatter.oneLiner}
          </p>
        )}

        {/* Review content */}
        {book.hasReview && (
          <LongFormBody>
            <MDXRemote source={content} components={mdxComponents} options={mdxOptions} />
          </LongFormBody>
        )}

        <GenreNeighbours books={neighbours} />

        {/* Footer */}
        <footer className={`${neighbours.length > 0 ? "mt-8" : "mt-12 pt-8 border-t border-border"}`}>
          <Link
            href="/books"
            className="inline-flex items-center gap-2 text-accent hover:text-accent-hover transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to all books
          </Link>
        </footer>
      </Container>
    </article>
  );
}
