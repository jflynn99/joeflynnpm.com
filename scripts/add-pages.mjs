#!/usr/bin/env node
/**
 * Fill in `pages:` and `published:` for Books that do not have them yet,
 * looked up by ISBN.
 *
 *   node scripts/add-pages.mjs            every Book missing either field
 *   node scripts/add-pages.mjs <slug>     just one Book
 *
 * Pages: Open Library first, then Google Books.
 * Published (original publication year): Open Library's first publish year
 * for the work. Google Books is not used for it, because it gives the
 * edition's date, and a 2006 Penguin Meditations is not a 2006 book.
 *
 * Anything it cannot resolve is listed at the end: ask Joe and add it by hand
 * (`pages: 0` for audio with no page count). Podcasts need neither field.
 * Idempotent; never overwrites.
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
    return { value: openLibrary.number_of_pages, source: "Open Library" };
  }
  const google = await getJson(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
  const pageCount = google?.items?.[0]?.volumeInfo?.pageCount;
  if (pageCount > 0) return { value: pageCount, source: "Google Books" };
  return null;
}

async function lookUpPublished(isbn) {
  const search = await getJson(
    `https://openlibrary.org/search.json?isbn=${isbn}&fields=first_publish_year&limit=1`
  );
  const year = search?.docs?.[0]?.first_publish_year;
  return Number.isInteger(year) ? { value: year, source: "Open Library" } : null;
}

const unresolved = [];
/** Open Library's first publish year is the earliest edition it knows, which can be late. */
const checkByEye = [];

for (const file of fs.readdirSync(BOOKS_DIR).filter((f) => f.endsWith(".mdx"))) {
  const slug = file.replace(/\.mdx$/, "");
  if (only && slug !== only) continue;

  const filePath = path.join(BOOKS_DIR, file);
  let raw = fs.readFileSync(filePath, "utf8");
  const { data } = matter(raw);
  const needPages = data.pages === undefined;
  const needPublished = data.published === undefined && !data.podcast;
  if (!needPages && !needPublished) continue;

  const isbn = data.isbn ? String(data.isbn) : null;
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";

  /** Look a field up and write it on the line after `after`, or note it for Joe. */
  async function fill(field, what, lookUp, after) {
    const found = isbn ? await lookUp(isbn) : null;
    if (!found) {
      unresolved.push(`${slug}: ${what}${isbn ? "" : " (no isbn)"}`);
      return;
    }
    raw = raw.replace(new RegExp(`^(${after}:.*)$`, "m"), `$1${eol}${field}: ${found.value}`);
    console.log(`${slug}: ${field} ${found.value} (${found.source})`);
    if (field === "published") checkByEye.push(`${slug}: ${found.value}`);
  }

  // pages goes after dateRead, and published after pages.
  if (needPages) await fill("pages", "page count", lookUpPages, "dateRead");
  if (needPublished) {
    await fill("published", "publication year", lookUpPublished, /^pages:/m.test(raw) ? "pages" : "dateRead");
  }
  fs.writeFileSync(filePath, raw);
}

if (checkByEye.length > 0) {
  console.log("\nPublication years from Open Library can be a later edition's. Check these look right:");
  for (const line of checkByEye) console.log(`  - ${line}`);
}

if (unresolved.length > 0) {
  console.log(`\nNot found for ${unresolved.length}. Ask Joe:`);
  for (const line of unresolved) console.log(`  - ${line}`);
  process.exitCode = 1;
}
