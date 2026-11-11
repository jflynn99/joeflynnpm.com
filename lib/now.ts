// The /now page: what Joe is doing at the moment, in his own words.
// Its text and "last updated" date live in content/now.mdx.

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { z } from "zod";

const LONG_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const nowFrontmatterSchema = z.strictObject({
  /** ISO date the text was last revised, e.g. "2026-11-11". */
  updated: z.iso.date(),
});

export interface NowPage {
  updated: string;
  /** The MDX body: Joe's text. */
  content: string;
}

/** Validate the raw file. Throws on missing or malformed frontmatter, or an empty body. */
export function parseNow(raw: string): NowPage {
  const { data, content } = matter(raw);
  const { updated } = nowFrontmatterSchema.parse(data);
  if (!content.trim()) throw new Error("content/now.mdx has no text");
  return { updated, content };
}

/** "2026-11-11" → "11 November 2026". Parsed by hand so no timezone can shift the day. */
export function formatUpdated(updated: string): string {
  const [year, month, day] = updated.split("-");
  return `${Number(day)} ${LONG_MONTHS[Number(month) - 1]} ${year}`;
}

const nowFile = path.join(process.cwd(), "content/now.mdx");

export function getNow(): NowPage {
  return parseNow(fs.readFileSync(nowFile, "utf8"));
}
