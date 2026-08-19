import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

export interface PostFrontmatter {
  title: string;
  date: string;
  description: string;
  image?: string;
  tags: string[];
  published?: boolean;
  /** Opt in to a generated social card instead of `image` for og:image. */
  ogCard?: boolean;
}

export interface Post {
  slug: string;
  frontmatter: PostFrontmatter;
  content: string;
  readingTime: string;
}

/** A post without its body — safe to pass to client components. */
export type PostListItem = Omit<Post, "content">;

const postsDirectory = path.join(process.cwd(), "content/blog");

export function getPostSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }
  return fs
    .readdirSync(postsDirectory)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

export function getPostBySlug(slug: string): Post | null {
  const fullPath = path.join(postsDirectory, `${slug}.mdx`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  const frontmatter = data as PostFrontmatter;

  // Skip unpublished posts in production
  if (frontmatter.published === false && process.env.NODE_ENV === "production") {
    return null;
  }

  return {
    slug,
    frontmatter,
    content,
    readingTime: readingTime(content).text,
  };
}

export function getAllPosts(): Post[] {
  const slugs = getPostSlugs();
  const posts = slugs
    .map((slug) => getPostBySlug(slug))
    .filter((post): post is Post => post !== null)
    .sort((a, b) => {
      const dateA = new Date(a.frontmatter.date);
      const dateB = new Date(b.frontmatter.date);
      return dateB.getTime() - dateA.getTime();
    });

  return posts;
}

export function getAllPostListItems(): PostListItem[] {
  return getAllPosts().map(({ slug, frontmatter, readingTime }) => ({
    slug,
    frontmatter,
    readingTime,
  }));
}

export function getPostsByTag(tag: string): Post[] {
  return getAllPosts().filter((post) =>
    post.frontmatter.tags.some(
      (t) => t.toLowerCase() === tag.toLowerCase()
    )
  );
}

export function getAllTags(): string[] {
  const posts = getAllPosts();
  const tagsSet = new Set<string>();

  posts.forEach((post) => {
    post.frontmatter.tags.forEach((tag) => {
      tagsSet.add(tag);
    });
  });

  return Array.from(tagsSet).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
}

export function getLatestPosts(count: number = 5): Post[] {
  return getAllPosts().slice(0, count);
}
