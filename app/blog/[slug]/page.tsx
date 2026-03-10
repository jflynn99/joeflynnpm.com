import { notFound } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout";
import { TagBadge } from "@/components/blog";
import { getPostBySlug, getPostSlugs } from "@/lib/posts";
import { formatDate } from "@/lib/utils";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { mdxComponents } from "@/components/mdx";

interface BlogPostPageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = getPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const post = getPostBySlug(params.slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  const { frontmatter } = post;

  return {
    title: frontmatter.title,
    description: frontmatter.description,
    openGraph: {
      title: frontmatter.title,
      description: frontmatter.description,
      type: "article",
      publishedTime: frontmatter.date,
      images: frontmatter.image
        ? [{ url: frontmatter.image, width: 1200, height: 630 }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: frontmatter.title,
      description: frontmatter.description,
      images: frontmatter.image ? [frontmatter.image] : [],
    },
  };
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const { frontmatter, content, readingTime } = post;

  return (
    <article>
      <Container width="narrow">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted mb-4">
            <Link
              href="/blog"
              className="hover:text-accent transition-colors"
            >
              Blog
            </Link>
            <span>/</span>
            <span>Article</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
            {frontmatter.title}
          </h1>

          <p className="text-lg text-muted mb-4">{frontmatter.description}</p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
            <time dateTime={frontmatter.date}>
              {formatDate(frontmatter.date)}
            </time>
            <span>·</span>
            <span>{readingTime}</span>
          </div>

          {frontmatter.tags && frontmatter.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {frontmatter.tags.map((tag) => (
                <TagBadge
                  key={tag}
                  tag={tag}
                  href={`/blog?tag=${encodeURIComponent(tag)}`}
                  size="md"
                />
              ))}
            </div>
          )}
        </header>

        {/* Hero Image */}
        {frontmatter.image && (
          <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-lg">
            <Image
              src={frontmatter.image}
              alt={frontmatter.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <MDXRemote source={content} components={mdxComponents} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-border">
          <Link
            href="/blog"
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
            Back to all posts
          </Link>
        </footer>
      </Container>
    </article>
  );
}
