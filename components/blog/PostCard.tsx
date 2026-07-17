import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { TagBadge } from "./TagBadge";
import type { Post } from "@/lib/posts";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { slug, frontmatter, readingTime } = post;

  return (
    <article className="group reveal-up">
      <Link href={`/blog/${slug}`} className="block">
        {frontmatter.image && (
          <div className="relative mb-4 aspect-[16/9] overflow-hidden rounded-lg bg-card">
            <Image
              src={frontmatter.image}
              alt={frontmatter.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted">
            <time dateTime={frontmatter.date}>
              {formatDate(frontmatter.date)}
            </time>
            <span>·</span>
            <span>{readingTime}</span>
          </div>

          <h2 className="text-xl font-semibold tracking-tight transition-colors group-hover:text-accent">
            {frontmatter.title}
          </h2>

          <p className="text-muted line-clamp-2">{frontmatter.description}</p>

          {frontmatter.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {frontmatter.tags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
