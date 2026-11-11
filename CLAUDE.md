# personal-website

Personal blog and portfolio site.

## Project Context

- **Domain:** joeflynnpm.com (NOT joeflynn.io)
- **Hosted on:** Vercel
- **Content format:** MDX/Markdown

## Tech Stack

- Next.js 16 (Turbopack), React 19
- MDX for blog posts
- Tailwind CSS + Typography plugin
- Vercel Analytics

## Blog Post Tags

When creating a new post MDX in `content/blog/`, always include a `tags:` line in the frontmatter using only tags from this controlled vocabulary (do not invent new tags):

AI, Books, ChatGPT, Claude Code, Family, Finance, Health & Fitness, Personal, Philosophy, Product, Science, Work

Example: `tags: ["AI", "Claude Code", "Product"]`

Also add the same slug → tags entry to `scripts/tags.json` (the canonical mapping; `node scripts/add-tags.mjs` re-applies it to all frontmatter and is idempotent, and reports any post on disk that is missing from the mapping).

If a post genuinely doesn't fit the vocabulary, propose a new tag to Joe rather than adding it silently — a tag should only exist if it will apply to 2+ posts.

## Project Pages

For MDX files in `content/projects/`:

- `tech:` is 2–5 entries, actual tools and frameworks only (e.g. Claude Code, Next.js, Streamlit) — no concept words like "AI", "Agent", or "Vibe Coding"
- Every project needs `featured:` and a unique `order:` (lower = higher on the page)
- `description:` should say what was built and with what, not just repeat the post's first sentence — it feeds the card and meta tags

## Adding a New Book

When creating a new book MDX in `content/books/`, always include a `genres:` line in the frontmatter with 1-2 genres from this controlled vocabulary (do not invent new genres):

Sci-Fi, Fantasy, Literary Fiction, Historical Fiction, Classics, Crime & Thriller, Horror, History, Science, Philosophy, Psychology, AI & Tech, Business & Product, Politics & Economics, Biography & Memoir, Health & Habits, Parenting, True Crime, Sport, Travel

Example: `genres: ["Sci-Fi", "Horror"]`

Also add the same slug → genres entry to `scripts/genres.json` (the canonical mapping; `node scripts/add-genres.mjs` re-applies it to all frontmatter and is idempotent).

Every book also needs a `pages:` line (a whole number, placed after `dateRead:`) and a `published:` line (the original publication year, placed after `pages:`; negative for BCE). To fill them in:

1. Run `node scripts/add-pages.mjs <slug>`. It looks both up by `isbn` and writes them into the frontmatter: pages from Open Library, then Google Books; publication year from Open Library's first publish year for the work.
2. If it reports either one not found, ask Joe rather than guessing, and add it by hand. For `published:`, it is the year the work first came out, not the edition's year (a 2006 Penguin Meditations is still `published: 180`).
3. For a podcast series, use `pages: 0` and add `podcast: true`, and leave out `published:`. It keeps its page on /books but is left out of every reading stat.

`npm test` fails if any book is missing `pages`, or any non-podcast book is missing `published`, and CI runs it on every PR and push to main.

Do not add `undated: true` to a new book. It marks the older books that were logged without a real read date, which keeps them out of the per-year charts.

Notes:
- Fiction vs Non-fiction derives from genres, via the one shared rule in `lib/fiction.ts` (used by the /books toggle, the books chat search, and the reading stats). Fiction genres are: Sci-Fi, Fantasy, Literary Fiction, Historical Fiction, Classics, Crime & Thriller, Horror. A book with any Fiction genre is Fiction, except that when Classics is its only Fiction genre and it also has a Non-fiction genre (e.g. `["Classics", "Philosophy"]`), it is Non-fiction. A book with no genres is treated as non-fiction and appears under no genre chip.
- Reading stats on /analytics come from the book MDX frontmatter (`lib/readingStats.ts`), so a new book shows in the stats as soon as it is published. `goodreads_library_export.csv` is no longer read by the site.

## Current Reads

The "Right now" strip on the home page lists what Joe is reading, from `content/current-reads.json`. A Current Read is not a Book (see `GLOSSARY.md`), so it never appears on /books or in the reading stats.

To add one, append an entry:

```json
{
  "title": "A Thousand Moons",
  "author": "Sebastian Barry",
  "started": "2026-11",
  "coverImage": "/images/books/a-thousand-moons.jpg",
  "relatedBook": "days-without-end-days-without-end-1"
}
```

- `title` and `author` are required. `started`, `coverImage`, and `relatedBook` are optional. `started` is the month (`"2026-11"`) or a full date (`"2026-11-03"`); the strip shows it as "Started Nov 2026".
- Save the cover under `public/images/books/`. The cover script only reads book MDX, so fetch it by hand, e.g. look up `cover_i` with `https://openlibrary.org/search.json?title=...&author=...` and download `https://covers.openlibrary.org/b/id/<cover_i>-L.jpg`.
- `relatedBook` is the slug of a Book already on the site (say, the earlier book in a series). If that Book has a review, the strip links to it.

To remove one, delete its entry. When Joe finishes it, add it as a Book through the normal flow above; its cover file can be reused as the Book's `coverImage`. An empty list hides the reading cards, but the strip stays for the year so far.

The strip also shows the year so far (`lib/yearSoFar.ts`): Books finished and pages read, from the same stats as /analytics, and Session Days from `public/data/workouts-<year>.json`. That file is converted by hand and can be weeks old, so Session Days always shows "as of" the last date in it, and drops out when the year has no file. The year is the build year.

`npm test` fails on a malformed entry (including an unknown key, so watch for typos), a `relatedBook` that is not a Book, or a missing cover file. The home page loads the file at build time, so a bad entry also fails `npm run build` rather than shipping a broken strip.

## Social Cards

Blog posts, book reviews, and projects can render a branded 1200×630 share card
instead of using their own image for `og:image`. Add `ogCard: true` to the
frontmatter — that is the whole opt-in, for new and existing content alike.

- The card is generated on request by `app/og/route.tsx`; nothing is stored in
  the repo, so restyling every card is a single edit to that file.
- `image` / `coverImage` stays the page hero. The card only replaces the
  **share** image, and only when `ogCard: true` is set.
- Without the flag, sharing behaviour is unchanged — the page's own image is
  used, as before.
- Colours in the card are the `globals.css` OKLCH tokens hand-resolved to sRGB,
  since Satori has no OKLCH support. **If `--hue` changes in `globals.css`,
  update `COLORS` in `app/og/route.tsx` to match** or the cards will drift from
  the site palette.
- The route is an Edge Function with a **1 MB bundle limit** on this plan. The
  fonts in `assets/fonts/` are deliberately subset to stay under it — read the
  README there before swapping in or adding a face.
- Check a card by hitting the route directly, e.g.
  `/og?title=Hello&kicker=BLOG&sub=Someone&img=/images/books/x.jpg`.
  Only same-origin `img` paths are rendered.

## Development Gotchas

- **MDX plugins:** When adding remark/rehype plugins, ensure they are configured in BOTH `next.config` AND any `MDXRemote` component options. Always verify rendering after plugin changes.

## Verification

- Always run `npm run build` after making content or config changes to catch build failures early
- Check the dev server (`npm run dev`) for visual regressions when changing layouts or components

## Custom Skills

- **`/publish`** — Validates frontmatter, checks for common content issues, runs the build, and commits. Use for all new blog posts and project pages.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on jflynn99/joeflynnpm.com (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`, created lazily. See `docs/agents/domain.md`.

## Git

- Remote: https://github.com/jflynn99/joeflynnpm.com.git
- Branch: main
