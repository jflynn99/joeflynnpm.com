import Link from "next/link";
import { PostCard } from "@/components/blog";
import { WeightRampTitle } from "@/components/WeightRampTitle";
import type { Post } from "@/lib/posts";

interface LatestPostsProps {
  posts: Post[];
}

export function LatestPosts({ posts }: LatestPostsProps) {
  if (posts.length === 0) return null;

  return (
    <section className="py-12 sm:py-16">
      <div className="flex items-center justify-between mb-8">
        <WeightRampTitle
          as="h2"
          className="text-2xl tracking-tight sm:text-3xl"
          text="Latest Posts"
        />
        <Link
          href="/blog"
          className="text-sm text-accent hover:text-accent-hover transition-colors"
        >
          View all →
        </Link>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </section>
  );
}
