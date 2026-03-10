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

## Development Gotchas

- **MDX plugins:** When adding remark/rehype plugins, ensure they are configured in BOTH `next.config` AND any `MDXRemote` component options. Always verify rendering after plugin changes.

## Verification

- Always run `npm run build` after making content or config changes to catch build failures early
- Check the dev server (`npm run dev`) for visual regressions when changing layouts or components

## Custom Skills

- **`/publish`** — Validates frontmatter, checks for common content issues, runs the build, and commits. Use for all new blog posts and project pages.

## Git

- Remote: https://github.com/jflynn99/personal-website-.git
- Branch: main
