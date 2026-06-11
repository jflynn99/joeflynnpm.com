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

## Adding a New Book

When creating a new book MDX in `content/books/`, always include a `genres:` line in the frontmatter with 1-2 genres from this controlled vocabulary (do not invent new genres):

Sci-Fi, Fantasy, Literary Fiction, Historical Fiction, Classics, Crime & Thriller, Horror, History, Science, Philosophy, Psychology, AI & Tech, Business & Product, Politics & Economics, Biography & Memoir, Health & Habits, Parenting, True Crime, Sport, Travel

Example: `genres: ["Sci-Fi", "Horror"]`

Also add the same slug → genres entry to `scripts/genres.json` (the canonical mapping; `node scripts/add-genres.mjs` re-applies it to all frontmatter and is idempotent).

Notes:
- The Fiction/Non-fiction toggle on /books derives from genres. Fiction genres are: Sci-Fi, Fantasy, Literary Fiction, Historical Fiction, Classics, Crime & Thriller, Horror. A book with no genres is treated as non-fiction and appears under no genre chip.
- Reading stats on /analytics come from `goodreads_library_export.csv`, not the MDX files — a new book won't show in stats until Joe drops in a fresh Goodreads export.

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
