# personal-website

Personal blog and portfolio site.

## Project Context

- **Domain:** joeflynnpm.com (NOT joeflynn.io)
- **Hosted on:** Vercel
- **Content format:** MDX/Markdown

## Tech Stack

- Next.js 14, React 18
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

Notes:
- The Fiction/Non-fiction toggle on /books derives from genres. Fiction genres are: Sci-Fi, Fantasy, Literary Fiction, Historical Fiction, Classics, Crime & Thriller, Horror. A book with no genres is treated as non-fiction and appears under no genre chip.
- Reading stats on /analytics come from `goodreads_library_export.csv`, not the MDX files — a new book won't show in stats until Joe drops in a fresh Goodreads export.

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

## Git

- Remote: https://github.com/jflynn99/joeflynnpm.com.git
- Branch: main
