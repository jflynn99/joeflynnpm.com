// Sets the `tags:` field in each blog post's frontmatter from scripts/tags.json.
// Idempotent: replaces an existing tags block (inline array or multi-line list).
// Usage: node scripts/add-tags.mjs

import fs from "fs";
import path from "path";

const root = process.cwd();
const blogDir = path.join(root, "content/blog");
const tagsPath = path.join(root, "scripts/tags.json");

const tags = JSON.parse(fs.readFileSync(tagsPath, "utf8"));

let updated = 0;
const missingFiles = [];

for (const [slug, list] of Object.entries(tags)) {
  const filePath = path.join(blogDir, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) {
    missingFiles.push(slug);
    continue;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    console.error(`No frontmatter found: ${slug}`);
    continue;
  }

  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = match[1].split(/\r?\n/);
  const body = [];
  let inTagsBlock = false;
  for (const line of lines) {
    if (/^tags:/.test(line)) {
      // Multi-line list follows only when nothing else is on the tags: line
      inTagsBlock = /^tags:\s*$/.test(line);
      continue;
    }
    if (inTagsBlock) {
      if (/^\s+-\s/.test(line)) continue;
      inTagsBlock = false;
    }
    body.push(line);
  }
  body.push(`tags: [${list.map((t) => `"${t}"`).join(", ")}]`);

  const newRaw = raw.replace(match[0], `---${eol}${body.join(eol)}${eol}---`);
  fs.writeFileSync(filePath, newRaw);
  updated++;
}

// Posts on disk with no tag mapping
const unmapped = fs
  .readdirSync(blogDir)
  .filter((f) => f.endsWith(".mdx"))
  .map((f) => f.replace(/\.mdx$/, ""))
  .filter((slug) => !tags[slug]);

console.log(`Updated ${updated} posts.`);
if (missingFiles.length) console.log(`Mapped but no file: ${missingFiles.join(", ")}`);
if (unmapped.length) console.log(`On disk but unmapped: ${unmapped.join(", ")}`);
