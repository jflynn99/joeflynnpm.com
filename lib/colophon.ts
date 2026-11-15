// The facts behind /colophon, all read from the repo at build time so the
// page cannot drift: the decisions in docs/adr, the colour tokens in
// app/globals.css, and every "broke" entry from every project's Build Trail.

import fs from "fs";
import path from "path";
import type { BrokeEntry } from "./buildTrail.ts";

export interface Decision {
  file: string;
  title: string;
  summary: string;
}

/** An ADR's title (its first `# ` heading) and summary (its first paragraph). */
export function parseDecision(file: string, markdown: string): Decision {
  const lines = markdown.split(/\r?\n/);
  const titleIndex = lines.findIndex((line) => line.startsWith("# "));
  const title = titleIndex === -1 ? file.replace(/\.md$/, "") : lines[titleIndex].slice(2).trim();
  const rest = lines.slice(titleIndex + 1);
  const start = rest.findIndex((line) => line.trim() !== "" && !line.startsWith("#"));
  const summaryLines: string[] = [];
  for (const line of start === -1 ? [] : rest.slice(start)) {
    if (line.trim() === "" || line.startsWith("#")) break;
    summaryLines.push(line.trim());
  }
  return { file, title, summary: summaryLines.join(" ") };
}

const adrDirectory = path.join(process.cwd(), "docs/adr");

export function getDecisions(): Decision[] {
  const dir = adrDirectory;
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => parseDecision(file, fs.readFileSync(path.join(dir, file), "utf8")));
}

export interface ColourToken {
  name: string;
  dark: string;
  light?: string;
}

function declarations(block: string): Map<string, string> {
  const out = new Map<string, string>();
  const withoutComments = block.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of withoutComments.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out.set(match[1], match[2].replace(/\s+/g, " ").trim());
  }
  return out;
}

function ruleBody(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return "";
  const open = css.indexOf("{", start);
  return css.slice(open + 1, css.indexOf("\n}", open));
}

/** Every colour token (an `oklch()` value) in `:root`, with its light-mode value if it has one. */
export function parseColourTokens(css: string): ColourToken[] {
  const dark = declarations(ruleBody(css, ":root"));
  const light = declarations(ruleBody(css, ":root.light"));
  return [...dark]
    .filter(([, value]) => value.startsWith("oklch("))
    .map(([name, value]) => ({
      name,
      dark: value,
      ...(light.has(name) && { light: light.get(name) }),
    }));
}

export function getColourTokens(): ColourToken[] {
  return parseColourTokens(fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8"));
}

export interface BrokeWithProject extends BrokeEntry {
  project: { slug: string; title: string; href?: string };
}

interface ProjectRef {
  slug: string;
  hasDetailPage: boolean;
  frontmatter: { title: string; buildTrail?: { broke?: BrokeEntry[] } };
}

/** Every "broke" entry from every project, in project order, each tied to its project. */
export function collectBroke(projects: ProjectRef[]): BrokeWithProject[] {
  return projects.flatMap(({ slug, hasDetailPage, frontmatter }) =>
    (frontmatter.buildTrail?.broke ?? []).map((entry) => ({
      ...entry,
      project: {
        slug,
        title: frontmatter.title,
        ...(hasDetailPage && { href: `/projects/${slug}` }),
      },
    })),
  );
}
