#!/usr/bin/env node
/**
 * One-off: copy page counts from the Goodreads export into book frontmatter,
 * and mark Books that have no real read date.
 *
 *   node scripts/backfill-pages.mjs [path/to/goodreads_library_export.csv]
 *
 * Why: reading stats on /analytics now come from content/books/*.mdx, so a
 * new Book shows up as soon as it is published. This script carried the
 * history across. It is idempotent and only ever adds two fields:
 *
 *   pages: 384        from "Number of Pages"
 *   undated: true     the export has the book as read but with no "Date Read",
 *                     so `dateRead` in the file is really the day it was
 *                     added to Goodreads
 *
 * Books are matched on the Goodreads Book Id in `goodreadsUrl`, then ISBN,
 * then title. Anything unmatched or without a page count is listed at the end.
 */
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { parse } from "csv-parse/sync";

const BOOKS_DIR = path.join(process.cwd(), "content/books");
const csvPath = process.argv[2] ?? "goodreads_library_export.csv";

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

const unmatched = [];
const noPages = [];
let pagesAdded = 0;
let undatedAdded = 0;

for (const file of fs.readdirSync(BOOKS_DIR).filter((f) => f.endsWith(".mdx"))) {
  const filePath = path.join(BOOKS_DIR, file);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data } = matter(raw);

  const bookId = /\/book\/show\/(\d+)/.exec(data.goodreadsUrl ?? "")?.[1];
  const row =
    (bookId && byId.get(bookId)) ||
    (data.isbn && byIsbn.get(String(data.isbn))) ||
    byTitle.get(norm(data.title));

  if (!row) {
    unmatched.push(file);
    if (data.pages === undefined) noPages.push(file);
    continue;
  }

  const additions = [];
  const pages = parseInt(row["Number of Pages"], 10);
  if (data.pages === undefined) {
    if (pages > 0) {
      additions.push(`pages: ${pages}`);
      pagesAdded++;
    } else {
      noPages.push(file);
    }
  }
  // Only trust a missing "Date Read" on the read shelf. A book that was still
  // to-read or in progress at export time has its real date in the file.
  const finishedInExport = row["Exclusive Shelf"] === "read";
  if (data.undated === undefined && finishedInExport && !row["Date Read"]) {
    additions.push("undated: true");
    undatedAdded++;
  }
  if (additions.length === 0) continue;

  // Insert after the dateRead line so the rest of the file is untouched.
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const updated = raw.replace(/^(dateRead:.*)$/m, `$1${eol}${additions.join(eol)}`);
  if (updated === raw) throw new Error(`No dateRead line in ${file}`);
  fs.writeFileSync(filePath, updated);
}

console.log(`pages added: ${pagesAdded}, marked undated: ${undatedAdded}`);
console.log(`not in the export (${unmatched.length}):`, unmatched);
console.log(`still without pages (${noPages.length}):`, noPages);
