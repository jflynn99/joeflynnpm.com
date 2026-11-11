# Personal Website Notes

## Setup Info

**What we set up:**
- Git repo: https://github.com/jflynn99/joeflynnpm.com
- Live site: https://joeflynnpm.com (hosted on Vercel)
- Auto-deploy: every push to main deploys to production; every PR gets a
  preview deployment

**Workflow going forward:**
1. Branch, make changes locally, test with `npm run dev`
2. Open a PR. CI (`.github/workflows/ci.yml`) runs lint, types, and tests;
   Vercel builds a preview
3. Merge to main and it goes live automatically

## Modern CSS polish — remaining phases (2026-07-17)

Phases 1-2 (`981a2c9` scroll polish, `006136a` OKLCH tokens) are pushed and
LIVE on joeflynnpm.com since 2026-07-17 (verified in production). Phase 3
(`adf5a98`) is also merged.
Inspiration: https://jovial-kayak-tysa.here.now/ — the full take/leave
analysis and OWID plan live in `../owid-explorer/POLISH-PLAN.md`.

**Phase 3 — DONE (2026-07-18):**
- Hero title rise: `rise` prop on WeightRampTitle wraps each segment in a
  `.title-mask` / `.title-rise` row (globals.css) — slide-up from behind an
  `overflow: clip` mask with 4° rotate and 120ms per-row stagger. Each
  segment becomes its own row; since #41 the home hero title is a single
  segment ("Joe Flynn."), so it rises as one row.
- View-transition filtering: `withViewTransition()` helper in
  `lib/view-transition.ts` (flushSync inside `document.startViewTransition`,
  plain update where unsupported or reduced-motion). Applied to all /books
  filter clicks (scope toggle, rating + genre chips, clear) and the blog tag
  filter. Blog filtering moved client-side (`BlogBrowser.tsx`) because the
  old router.push round-trip updates the DOM after the snapshot — /blog is
  now fully static, `?tag=` deep links still work, and each PostCard carries
  a `view-transition-name` so surviving cards slide to their new position.
  /books deliberately keeps the plain root cross-fade: 334 per-card names
  would mean 334 snapshot layers per toggle.
- Mobile menu: now always rendered, animates open/closed via
  `interpolate-size: allow-keywords` + `transition-behavior: allow-discrete`
  + `@starting-style` (Chromium); other engines snap as before.

**Open decision (separate from Phase 3):** adopt a display serif for headings
(Fraunces or similar, via next/font like the existing Inter). Biggest visual
character upgrade available, but an identity change — prototype on a branch
first; possibly belongs in the joeflynn-site rebuild instead.

**Gotchas:** on Next 16 `npm run build` no longer breaks a running dev
server (dev output now lives in its own `.next/dev` folder). Reduced-motion
kill-switch sits at the end of globals.css — new animations need an override
there if they shouldn't simply freeze.
