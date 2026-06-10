import { notFound } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout";
import { StarRating } from "@/components/books";
import { getBookBySlug, getBookSlugs } from "@/lib/books";
import { formatDate } from "@/lib/utils";
import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/components/mdx";

interface BookPageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = getBookSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BookPageProps): Promise<Metadata> {
  const book = getBookBySlug(params.slug);

  if (!book) {
    return { title: "Book Not Found" };
  }

  const { frontmatter } = book;

  return {
    title: `${frontmatter.title} by ${frontmatter.author}`,
    description: `Review of ${frontmatter.title} by ${frontmatter.author} — ${frontmatter.rating}/5 stars.`,
    openGraph: {
      title: `${frontmatter.title} by ${frontmatter.author}`,
      description: `Review of ${frontmatter.title} by ${frontmatter.author} — ${frontmatter.rating}/5 stars.`,
      images: frontmatter.coverImage
        ? [{ url: frontmatter.coverImage, width: 600, height: 900 }]
        : [],
    },
  };
}

export default function BookPage({ params }: BookPageProps) {
  const book = getBookBySlug(params.slug);

  if (!book || !book.hasReview) {
    notFound();
  }

  const { frontmatter, content } = book;

  return (
    <article>
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
            <p className="mt-2 text-sm text-muted">
              Read {formatDate(frontmatter.dateRead)}
            </p>
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

        {/* Review content */}
        <div className="prose prose-lg max-w-none">
          <MDXRemote source={content} components={mdxComponents} />
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-border">
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
