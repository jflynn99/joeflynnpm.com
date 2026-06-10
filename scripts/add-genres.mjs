// Adds a `genres:` field to each book's frontmatter from scripts/genres.json.
// Idempotent: replaces an existing genres line if one is already present.
// Usage: node scripts/add-genres.mjs

import fs from "fs";
import path from "path";

const root = process.cwd();
const booksDir = path.join(root, "content/books");
const genresPath = path.join(root, "scripts/genres.json");

const genres = JSON.parse(fs.readFileSync(genresPath, "utf8"));

let updated = 0;
const missingFiles = [];

for (const [slug, list] of Object.entries(genres)) {
  const filePath = path.join(booksDir, `${slug}.mdx`);
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
  const body = match[1]
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("genres:"));
  body.push(`genres: [${list.map((g) => `"${g}"`).join(", ")}]`);

  const newRaw = raw.replace(match[0], `---${eol}${body.join(eol)}${eol}---`);
  fs.writeFileSync(filePath, newRaw);
  updated++;
}

// Books on disk with no genre mapping
const unmapped = fs
  .readdirSync(booksDir)
  .filter((f) => f.endsWith(".mdx"))
  .map((f) => f.replace(/\.mdx$/, ""))
  .filter((slug) => !genres[slug]);

console.log(`Updated ${updated} books.`);
if (missingFiles.length) console.log(`Mapped but no file: ${missingFiles.join(", ")}`);
if (unmapped.length) console.log(`On disk but unmapped: ${unmapped.join(", ")}`);
