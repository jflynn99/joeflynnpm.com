import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface ProjectFrontmatter {
  title: string;
  description: string;
  image?: string;
  tech: string[];
  liveUrl?: string;
  githubUrl?: string;
  featured?: boolean;
  order?: number;
  /** Opt in to a generated social card instead of `image` for og:image. */
  ogCard?: boolean;
}

export interface Project {
  slug: string;
  frontmatter: ProjectFrontmatter;
  content: string;
  hasDetailPage: boolean;
}

const projectsDirectory = path.join(process.cwd(), "content/projects");

export function getProjectSlugs(): string[] {
  if (!fs.existsSync(projectsDirectory)) {
    return [];
  }
  return fs
    .readdirSync(projectsDirectory)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

export function getProjectBySlug(slug: string): Project | null {
  const fullPath = path.join(projectsDirectory, `${slug}.mdx`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  const frontmatter = data as ProjectFrontmatter;

  // Check if content is substantial enough for a detail page
  const hasDetailPage = content.trim().length > 100;

  return {
    slug,
    frontmatter,
    content,
    hasDetailPage,
  };
}

export function getAllProjects(): Project[] {
  const slugs = getProjectSlugs();
  const projects = slugs
    .map((slug) => getProjectBySlug(slug))
    .filter((project): project is Project => project !== null)
    .sort((a, b) => {
      // Sort by order if specified, otherwise by featured status
      if (a.frontmatter.order !== undefined && b.frontmatter.order !== undefined) {
        return a.frontmatter.order - b.frontmatter.order;
      }
      if (a.frontmatter.featured && !b.frontmatter.featured) return -1;
      if (!a.frontmatter.featured && b.frontmatter.featured) return 1;
      return 0;
    });

  return projects;
}

export function getFeaturedProjects(): Project[] {
  return getAllProjects().filter((project) => project.frontmatter.featured);
}

export function getProjectsByTech(tech: string): Project[] {
  return getAllProjects().filter((project) =>
    project.frontmatter.tech.some(
      (t) => t.toLowerCase() === tech.toLowerCase()
    )
  );
}
