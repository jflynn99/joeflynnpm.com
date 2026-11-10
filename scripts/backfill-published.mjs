#!/usr/bin/env node
/**
 * One-off: copy each Book's original publication year from the Goodreads
 * export into its frontmatter.
 *
 *   node scripts/backfill-published.mjs [--dry-run] [path/to/goodreads_library_export.csv]
 *
 * Why: the publication year strip on /analytics reads `published:` from
 * content/books/*.mdx, so new Books get it from `scripts/add-pages.mjs` and
 * this script carries the history across. It only uses "Original Publication
 * Year", never the edition's "Year Published", since a 2006 Penguin Meditations
 * is not a 2006 book. Idempotent; it only ever adds `published:` after `pages:`.
 *
 * Books are matched on the Goodreads Book Id in `goodreadsUrl`, then ISBN,
 * then title, as in backfill-pages.mjs. Anything left over is listed at the
 * end for `node scripts/add-pages.mjs`, then Joe.
 */
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { parse } from "csv-parse/sync";

const BOOKS_DIR = path.join(process.cwd(), "content/books");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const csvPath = args.find((a) => !a.startsWith("--")) ?? "goodreads_library_export.csv";

const rows = parse(fs.readFileSync(csvPath), { columns: true, skip_empty_lines: true });
const cleanIsbn = (v) => (v ?? "").replace(/[="]/g, "");
const norm = (v) => (v ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const byId = new Map(rows.map((r) => [r["Book Id"], r]));
const byIsbn = new Map();
const byTitle = new Map();
for (const r of rows) {
  for (const isbn of [cleanIsbn(r.ISBN13), cleanIsbn(r.ISBN)]) if (isbn) byIsbn.set(isbn, r);
  byTitle.set(norm(r.Title), r);
}

const missing = [];
const added = [];

for (const file of fs.readdirSync(BOOKS_DIR).filter((f) => f.endsWith(".mdx"))) {
  const filePath = path.join(BOOKS_DIR, file);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data } = matter(raw);
  if (data.published !== undefined || data.podcast) continue;

  const bookId = /\/book\/show\/(\d+)/.exec(data.goodreadsUrl ?? "")?.[1];
  const row =
    (bookId && byId.get(bookId)) ||
    (data.isbn && byIsbn.get(String(data.isbn))) ||
    byTitle.get(norm(data.title));

  const year = Number(row?.["Original Publication Year"]);
  if (!row || !row["Original Publication Year"] || !Number.isInteger(year)) {
    missing.push(`${file.replace(/\.mdx$/, "")}${row ? "" : " (not in the export)"}`);
    continue;
  }

  added.push({ file, year });
  if (dryRun) continue;

  // Insert after the pages line so the rest of the file is untouched.
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const updated = raw.replace(/^(pages:.*)$/m, `$1${eol}published: ${year}`);
  if (updated === raw) throw new Error(`No pages line in ${file}`);
  fs.writeFileSync(filePath, updated);
}

const years = added.map((a) => a.year).sort((a, b) => a - b);
console.log(`${dryRun ? "would add" : "added"} published: ${added.length}`);
if (years.length) {
  console.log(`range ${years[0]} to ${years.at(-1)}, before 1800: ${years.filter((y) => y < 1800).length}`);
  console.log("earliest:", added.filter((a) => a.year < 1900).sort((a, b) => a.year - b.year).map((a) => `${a.year} ${a.file}`));
}
console.log(`still without a year (${missing.length}):`, missing);
