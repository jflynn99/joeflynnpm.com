#!/usr/bin/env node

/**
 * Fetch missing book covers from Google Books API.
 *
 * Usage:
 *   node scripts/fetch-missing-covers.mjs [--dry-run]
 *
 * This script:
 * 1. Scans all MDX files in content/books/
 * 2. Finds books without a coverImage in frontmatter
 * 3. Searches Google Books API by title + author
 * 4. Downloads the cover image to public/images/books/
 * 5. Updates the MDX frontmatter with the new coverImage path
 *
 * The Google Books API doesn't require an API key for basic searches
 * (limit ~1000 requests/day).
 */

import fs from "fs";
import path from "path";
import http from "http";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BOOKS_DIR = path.join(ROOT, "content", "books");
const IMAGES_DIR = path.join(ROOT, "public", "images", "books");

const DRY_RUN = process.argv.includes("--dry-run");

// Rate limit: wait between API requests to be polite
const DELAY_MS = 500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { frontmatter: {}, body: content };

  const frontmatterStr = match[1];
  const body = content.slice(match[0].length).trim();
  const frontmatter = {};

  for (const line of frontmatterStr.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();
    // Remove quotes
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\"/g, '"');
    }
    // Parse numbers
    if (/^\d+$/.test(value)) {
      value = parseInt(value, 10);
    }
    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

/**
 * Insert a coverImage line into the original frontmatter text, leaving
 * every other line byte-for-byte untouched. Rebuilding the frontmatter
 * from parsed values corrupts fields the naive parser can't round-trip
 * (YAML lists like genres, quoted ISBNs).
 */
function insertCoverImage(content, coverPath) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const lines = match[1].split("\n");
  // Place it after dateRead to keep the conventional field order
  let idx = lines.findIndex((l) => l.startsWith("dateRead:"));
  if (idx === -1) idx = lines.length - 1;
  lines.splice(idx + 1, 0, `coverImage: "${coverPath}"`);

  return content.replace(match[0], `---\n${lines.join("\n")}\n---`);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString()));
          } catch (e) {
            reject(e);
          }
        });
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const request = (url) => {
      const getter = url.startsWith("https") ? https : http;
      getter
        .get(url, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            request(res.headers.location);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => resolve(Buffer.concat(chunks)));
          res.on("error", reject);
        })
        .on("error", reject);
    };
    request(url);
  });
}

async function searchGoogleBooks(title, author) {
  // Build search query: intitle + inauthor for better accuracy
  const query = encodeURIComponent(`intitle:${title} inauthor:${author}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;

  try {
    const data = await fetchJson(url);
    if (!data.items || data.items.length === 0) return null;

    const book = data.items[0];
    const imageLinks = book.volumeInfo?.imageLinks;
    if (!imageLinks) return null;

    // Prefer larger images: extraLarge > large > medium > small > thumbnail
    const imageUrl =
      imageLinks.extraLarge ||
      imageLinks.large ||
      imageLinks.medium ||
      imageLinks.small ||
      imageLinks.thumbnail;

    if (!imageUrl) return null;

    // Google Books returns http URLs, upgrade to https and remove zoom/edge params for larger image
    return imageUrl
      .replace("http://", "https://")
      .replace("&edge=curl", "")
      .replace("zoom=1", "zoom=0");
  } catch (e) {
    if (e.message === "HTTP 429") {
      return { rateLimited: true };
    }
    return null;
  }
}

/**
 * Open Library cover lookup by ISBN — keyless, no rate limit for
 * reasonable use. ?default=false makes it 404 instead of returning a
 * 1px placeholder when no cover exists.
 */
function openLibraryCoverUrl(isbn) {
  if (!isbn) return null;
  const cleaned = String(isbn).replace(/[^0-9Xx]/g, "");
  if (cleaned.length !== 10 && cleaned.length !== 13) return null;
  return `https://covers.openlibrary.org/b/isbn/${cleaned}-L.jpg?default=false`;
}

/**
 * Open Library search by title + author. Returns a cover URL by CoverID,
 * which (unlike ISBN lookups) is not rate-limited. Catches books whose
 * specific edition ISBN has no cover, or that have no ISBN at all.
 */
async function searchOpenLibrary(title, author) {
  // Strip series suffixes like "(A Song of Ice and Fire, #4)" and
  // normalise author quirks ("AlanW.Watts", "Michael   Lewis")
  const cleanTitle = String(title).replace(/\s*\(.*?\)\s*$/, "").trim();
  const cleanAuthor = String(author)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\.([A-Z])/g, ". $1")
    .replace(/\s+/g, " ")
    .trim();

  const lookup = async (searchTitle) => {
    const url =
      `https://openlibrary.org/search.json?title=${encodeURIComponent(searchTitle)}` +
      `&author=${encodeURIComponent(cleanAuthor)}&limit=1&fields=cover_i`;
    try {
      const data = await fetchJson(url);
      const coverId = data.docs?.[0]?.cover_i;
      if (!coverId) return null;
      return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
    } catch {
      return null;
    }
  };

  let result = await lookup(cleanTitle);

  // Retry without the subtitle ("The Undoing Project: A Friendship that...")
  if (!result && cleanTitle.includes(":")) {
    result = await lookup(cleanTitle.split(":")[0].trim());
  }

  return result;
}

async function downloadCover(imageUrl, slug) {
  try {
    const data = await fetchImage(imageUrl);
    // Skip tiny placeholder images
    if (data.length < 1000) return null;

    const imagePath = path.join(IMAGES_DIR, `${slug}.jpg`);
    fs.writeFileSync(imagePath, data);
    return `/images/books/${slug}.jpg`;
  } catch {
    return null;
  }
}

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN - no files will be modified\n" : "");

  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const files = fs.readdirSync(BOOKS_DIR).filter((f) => f.endsWith(".mdx"));
  const missing = [];

  // Find books without covers
  for (const file of files) {
    const filePath = path.join(BOOKS_DIR, file);
    const content = fs.readFileSync(filePath, "utf8");
    const { frontmatter } = parseFrontmatter(content);

    if (!frontmatter.coverImage) {
      const slug = file.replace(".mdx", "");
      missing.push({ file, filePath, slug, frontmatter });
    }
  }

  console.log(`Found ${missing.length} books without covers.\n`);

  let found = 0;
  let notFound = 0;

  for (let i = 0; i < missing.length; i++) {
    const { file, filePath, slug, frontmatter } = missing[i];
    const { title, author } = frontmatter;

    process.stdout.write(
      `[${i + 1}/${missing.length}] "${title}" by ${author}... `
    );

    const googleResult = await searchGoogleBooks(title, author);
    const googleRateLimited =
      typeof googleResult === "object" && googleResult?.rateLimited;

    let imageUrl = typeof googleResult === "string" ? googleResult : null;
    let source = imageUrl ? "Google Books" : null;

    // Fallback: Open Library cover by ISBN (keyless)
    if (!imageUrl) {
      const olUrl = openLibraryCoverUrl(frontmatter.isbn);
      if (olUrl) {
        try {
          const data = await fetchImage(olUrl);
          // Skip tiny placeholder images
          if (data.length >= 1000) {
            imageUrl = olUrl;
            source = "Open Library";
          }
        } catch {
          // 404 = no cover for this ISBN
        }
      }
    }

    // Fallback: Open Library search by title + author
    if (!imageUrl) {
      const olSearchUrl = await searchOpenLibrary(title, author);
      if (olSearchUrl) {
        imageUrl = olSearchUrl;
        source = "Open Library search";
      }
    }

    if (!imageUrl) {
      const googleNote = googleRateLimited
        ? "Google Books rate-limited (429)"
        : "not on Google Books";
      console.log(`❌ not found (${googleNote}, no Open Library match)`);
      notFound++;
      await sleep(DELAY_MS);
      continue;
    }

    if (DRY_RUN) {
      console.log(`✅ found via ${source}: ${imageUrl}`);
      found++;
      await sleep(DELAY_MS);
      continue;
    }

    const coverPath = await downloadCover(imageUrl, slug);

    if (!coverPath) {
      console.log("❌ download failed");
      notFound++;
      await sleep(DELAY_MS);
      continue;
    }

    // Update MDX file with new coverImage
    const newContent = insertCoverImage(fs.readFileSync(filePath, "utf8"), coverPath);
    if (!newContent) {
      console.log("❌ could not parse frontmatter");
      notFound++;
      await sleep(DELAY_MS);
      continue;
    }

    fs.writeFileSync(filePath, newContent, "utf8");
    console.log(`✅ saved (via ${source})`);
    found++;

    await sleep(DELAY_MS);
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Done! Found covers for ${found}/${missing.length} books.`);
  if (notFound > 0) {
    console.log(`${notFound} books still need covers (try Open Library or manual search).`);
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
