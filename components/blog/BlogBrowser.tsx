"use client";

import { useEffect, useMemo, useState } from "react";
import type { PostListItem } from "@/lib/posts";
import { withViewTransition } from "@/lib/view-transition";
import { PostList } from "./PostList";
import { TagFilter } from "./TagFilter";

interface BlogBrowserProps {
  posts: PostListItem[];
  tags: string[];
}

export function BlogBrowser({ posts, tags }: BlogBrowserProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Apply a deep-linked ?tag= after hydration (the page itself is static)
  useEffect(() => {
    // One-off read of the URL on mount. The page is prerendered without
    // search params, so this cannot happen during render without a
    // hydration mismatch; the extra render the rule warns about is intended.
    /* eslint-disable react-hooks/set-state-in-effect */
    const tag = new URLSearchParams(window.location.search).get("tag");
    if (tag) setActiveTag(tag);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Keep the URL shareable as the filter changes. Debounced so the mount
  // run (activeTag still null) is superseded before it strips a deep link.
  useEffect(() => {
    const handle = setTimeout(() => {
      window.history.replaceState(
        null,
        "",
        activeTag
          ? `${window.location.pathname}?tag=${encodeURIComponent(activeTag)}`
          : window.location.pathname
      );
    }, 300);
    return () => clearTimeout(handle);
  }, [activeTag]);

  const filtered = useMemo(() => {
    if (!activeTag) return posts;
    return posts.filter((post) =>
      post.frontmatter.tags.some(
        (t) => t.toLowerCase() === activeTag.toLowerCase()
      )
    );
  }, [posts, activeTag]);

  const selectTag = (tag: string | null) =>
    withViewTransition(() => setActiveTag(tag));

  return (
    <>
      <TagFilter tags={tags} activeTag={activeTag} onSelect={selectTag} />
      {activeTag && (
        <p className="mb-6 text-muted">
          Showing posts tagged with{" "}
          <span className="text-accent">{activeTag}</span>
        </p>
      )}
      <PostList posts={filtered} />
    </>
  );
}
