import { Metadata } from "next";
import { Container } from "@/components/layout";
import { WeightRampTitle } from "@/components/WeightRampTitle";
import { BlogBrowser } from "@/components/blog";
import { getAllPostListItems, getAllTags } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Blog",
  description: "Thoughts on product management, AI, technology, and more.",
};

export default function BlogPage() {
  const posts = getAllPostListItems();
  const tags = getAllTags();

  return (
    <Container>
      <div className="mb-8">
        <WeightRampTitle as="h1" className="text-3xl tracking-tight sm:text-4xl" text="Blog" />
        <p className="mt-2 text-muted">
          Thoughts on product management, AI, technology, and more.
        </p>
      </div>

      <BlogBrowser posts={posts} tags={tags} />
    </Container>
  );
}
