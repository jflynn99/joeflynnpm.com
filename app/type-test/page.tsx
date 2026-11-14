import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import { Container } from "@/components/layout";
import { getAllPosts } from "@/lib/posts";
import { longestRecentPost } from "@/lib/typeTest";
import { mdxOptions } from "@/lib/mdxOptions";
import { mdxComponents } from "@/components/mdx";
import { fontVariables } from "./fonts";
import { TypeSwitcher } from "./TypeSwitcher";

// A throwaway specimen page: not linked, not indexed, not in the sitemap.
export const metadata: Metadata = {
  title: "Type test",
  robots: { index: false, follow: false },
};

export default function TypeTestPage() {
  const posts = getAllPosts().map((p) => ({ ...p, date: p.frontmatter.date }));
  const post = longestRecentPost(posts, new Date());

  if (!post) {
    return (
      <Container width="narrow">
        <p>No posts to show.</p>
      </Container>
    );
  }

  return (
    <article className={fontVariables}>
      <Container width="narrow">
        <header className="mb-8">
          <p className="text-sm text-muted mb-4">
            Typeface specimen: {post.slug}
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
            {post.frontmatter.title}
          </h1>
        </header>
        <TypeSwitcher>
          <MDXRemote
            source={post.content}
            components={mdxComponents}
            options={mdxOptions}
          />
        </TypeSwitcher>
      </Container>
    </article>
  );
}
