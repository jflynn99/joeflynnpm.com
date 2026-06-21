import { Suspense } from "react";
import { Metadata } from "next";
import { Container } from "@/components/layout";
import { WeightRampTitle } from "@/components/WeightRampTitle";
import { PostList, TagFilter } from "@/components/blog";
import { getAllPosts, getAllTags, getPostsByTag } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Blog",
  description: "Thoughts on product management, AI, technology, and more.",
};

interface BlogPageProps {
  searchParams: { tag?: string };
}

function BlogContent({ tag }: { tag?: string }) {
  const posts = tag ? getPostsByTag(tag) : getAllPosts();
  const tags = getAllTags();

  return (
    <>
      <TagFilter tags={tags} />
      {tag && (
        <p className="mb-6 text-muted">
          Showing posts tagged with <span className="text-accent">{tag}</span>
        </p>
      )}
      <PostList posts={posts} />
    </>
  );
}

export default function BlogPage({ searchParams }: BlogPageProps) {
  return (
    <Container>
      <div className="mb-8">
        <WeightRampTitle as="h1" className="text-3xl tracking-tight sm:text-4xl" text="Blog" />
        <p className="mt-2 text-muted">
          Thoughts on product management, AI, technology, and more.
        </p>
      </div>

      <Suspense fallback={<div className="py-12 text-center text-muted">Loading...</div>}>
        <BlogContent tag={searchParams.tag} />
      </Suspense>
    </Container>
  );
}
