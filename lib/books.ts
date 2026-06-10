import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface BookFrontmatter {
  title: string;
  author: string;
  rating: number;
  dateRead: string;
  coverImage?: string;
  isbn?: string;
  goodreadsUrl?: string;
  genres?: string[];
}

// A book stripped of its review content, safe to send to client components
export interface BookListItem {
  slug: string;
  frontmatter: BookFrontmatter;
  hasReview: boolean;
}

export interface Book {
  slug: string;
  frontmatter: BookFrontmatter;
  content: string;
  hasReview: boolean;
}

const booksDirectory = path.join(process.cwd(), "content/books");

export function getBookSlugs(): string[] {
  if (!fs.existsSync(booksDirectory)) {
    return [];
  }
  return fs
    .readdirSync(booksDirectory)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

export function getBookBySlug(slug: string): Book | null {
  const fullPath = path.join(booksDirectory, `${slug}.mdx`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  const frontmatter = data as BookFrontmatter;
  const hasReview = content.trim().length > 0;

  return {
    slug,
    frontmatter,
    content,
    hasReview,
  };
}

export function getAllBooks(): Book[] {
  const slugs = getBookSlugs();
  return slugs
    .map((slug) => getBookBySlug(slug))
    .filter((book): book is Book => book !== null)
    .sort((a, b) => {
      const dateA = new Date(a.frontmatter.dateRead);
      const dateB = new Date(b.frontmatter.dateRead);
      return dateB.getTime() - dateA.getTime();
    });
}

export function getBookListItems(): BookListItem[] {
  return getAllBooks().map(({ slug, frontmatter, hasReview }) => ({
    slug,
    frontmatter,
    hasReview,
  }));
}
