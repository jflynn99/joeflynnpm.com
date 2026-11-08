import rehypePrettyCode, { type Options as PrettyCodeOptions } from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import type { Element, Root } from "hast";

/**
 * Syntax highlighting for fenced code blocks, via rehype-pretty-code + Shiki.
 * Both themes are emitted as CSS variables (--shiki-dark / --shiki-light) and
 * globals.css picks one based on the light/dark toggle. Backgrounds come from
 * the site's own pre styling, not the theme.
 */
export const prettyCodeOptions: PrettyCodeOptions = {
  theme: { dark: "github-dark-dimmed", light: "github-light" },
  keepBackground: false,
};

function isMermaidPre(node: Element): boolean {
  if (node.tagName !== "pre") return false;
  const code = node.children[0];
  if (code?.type !== "element" || code.tagName !== "code") return false;
  const cls = code.properties?.className;
  return Array.isArray(cls) && cls.includes("language-mermaid");
}

function collectMermaid(node: Root | Element, out: Element[]) {
  for (const child of node.children) {
    if (child.type !== "element") continue;
    if (isMermaidPre(child)) out.push(child);
    else collectMermaid(child, out);
  }
}

/**
 * rehype-pretty-code, minus ```mermaid fences. Those must reach the `pre`
 * component in MDXComponents untouched (pre > code.language-mermaid with a
 * plain string child) so they can be rendered to SVG at build time. They are
 * hidden from the highlighter by renaming the tag for the duration of the pass.
 */
export function rehypeCode() {
  const highlight = rehypePrettyCode(prettyCodeOptions) as (tree: Root) => Promise<void>;
  return async (tree: Root) => {
    const mermaid: Element[] = [];
    collectMermaid(tree, mermaid);
    for (const el of mermaid) el.tagName = "mermaid-pre";
    try {
      await highlight(tree);
    } finally {
      for (const el of mermaid) el.tagName = "pre";
    }
  };
}

/** Shared MDXRemote options for blog posts, projects, and books. */
export const mdxOptions = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeCode],
  },
};
