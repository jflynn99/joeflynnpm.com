export interface PostLike {
  slug: string;
  /** ISO date string, as in post frontmatter. */
  date: string;
  content: string;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function longest<T extends PostLike>(posts: T[]): T | null {
  let best: T | null = null;
  let bestWords = -1;
  for (const post of posts) {
    const words = wordCount(post.content);
    if (words > bestWords) {
      best = post;
      bestWords = words;
    }
  }
  return best;
}

/**
 * The longest post (by word count) dated within the 12 months up to `now`.
 * If nothing falls in that window, falls back to the longest post overall, so
 * the specimen page always has something to show. Returns null only when there
 * are no posts at all.
 */
export function longestRecentPost<T extends PostLike>(
  posts: T[],
  now: Date,
): T | null {
  // Post dates are whole days, so the window starts at the beginning of the day.
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCFullYear(start.getUTCFullYear() - 1);
  const recent = posts.filter((p) => {
    const d = new Date(p.date);
    return d >= start && d <= now;
  });
  return longest(recent) ?? longest(posts);
}
