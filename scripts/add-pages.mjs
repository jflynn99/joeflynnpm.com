#!/usr/bin/env node
/**
 * Fill in `pages:` for Books that do not have it yet, looked up by ISBN.
 *
 *   node scripts/add-pages.mjs            every Book missing `pages`
 *   node scripts/add-pages.mjs <slug>     just one Book
 *
 * Tries Open Library first, then Google Books. A Book it cannot resolve is
 * listed at the end: ask Joe for the page count and add `pages: <n>` by hand
 * (`pages: 0` for audio with no page count). Idempotent; never overwrites.
 */
import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BOOKS_DIR = path.join(process.cwd(), "content/books");
const only = process.argv[2]?.replace(/\.mdx$/, "");

async function getJson(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function lookUpPages(isbn) {
  const openLibrary = await getJson(`https://openlibrary.org/isbn/${isbn}.json`);
  if (openLibrary?.number_of_pages > 0) {
    return { pages: openLibrary.number_of_pages, source: "Open Library" };
  }
  const google = await getJson(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
  const pageCount = google?.items?.[0]?.volumeInfo?.pageCount;
  if (pageCount > 0) return { pages: pageCount, source: "Google Books" };
  return null;
}

const unresolved = [];

for (const file of fs.readdirSync(BOOKS_DIR).filter((f) => f.endsWith(".mdx"))) {
  const slug = file.replace(/\.mdx$/, "");
  if (only && slug !== only) continue;

  const filePath = path.join(BOOKS_DIR, file);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data } = matter(raw);
  if (data.pages !== undefined) continue;

  const found = data.isbn ? await lookUpPages(String(data.isbn)) : null;
  if (!found) {
    unresolved.push(`${slug}${data.isbn ? "" : " (no isbn)"}`);
    continue;
  }

  // Insert after the dateRead line so the rest of the file is untouched.
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  fs.writeFileSync(filePath, raw.replace(/^(dateRead:.*)$/m, `$1${eol}pages: ${found.pages}`));
  console.log(`${slug}: ${found.pages} pages (${found.source})`);
}

if (unresolved.length > 0) {
  console.log(`\nNo page count found for ${unresolved.length}. Ask Joe:`);
  for (const slug of unresolved) console.log(`  - ${slug}`);
  process.exitCode = 1;
}
