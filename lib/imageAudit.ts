import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export interface ImageEntry {
  kind: "blog" | "project";
  title: string;
  /** ISO date, or null (most projects have none). */
  date: string | null;
  /** Path of the MDX file relative to the repo root, with forward slashes. */
  file: string;
  /** The `image:` frontmatter value, or null when the file has none. */
  image: string | null;
}

interface Dirs {
  blogDir: string;
  projectsDir: string;
  /** Repo root, used to make `file` relative. */
  root: string;
}

function read(dir: string, kind: ImageEntry["kind"], root: string) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".mdx"))
    .sort()
    .map((name) => {
      const full = path.join(dir, name);
      const { data } = matter(fs.readFileSync(full, "utf8"));
      const entry: ImageEntry = {
        kind,
        title: String(data.title ?? name.replace(/\.mdx$/, "")),
        date: data.date ? String(data.date) : null,
        file: path.relative(root, full).split(path.sep).join("/"),
        image: typeof data.image === "string" && data.image ? data.image : null,
      };
      return { entry, order: typeof data.order === "number" ? data.order : null };
    });
}

/**
 * Every blog post and project, in the order the site shows them: posts newest
 * first, then projects by `order` (lowest first). Files with no image are kept
 * (image: null) so nothing drops out of the audit.
 */
export function collectImageEntries({ blogDir, projectsDir, root }: Dirs): ImageEntry[] {
  const blog = read(blogDir, "blog", root)
    .map((r) => r.entry)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const projects = read(projectsDir, "project", root)
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    .map((r) => r.entry);
  return [...blog, ...projects];
}
