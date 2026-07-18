# Personal Website Notes

## Setup Info

**What we set up:**
- Git repo: https://github.com/jflynn99/personal-website-
- Live site: https://jflynn-website.vercel.app
- Auto-deploy: Every push to main will automatically deploy

**Workflow going forward:**
1. Make changes locally
2. Test with `npm run dev`
3. Commit and push: `git add . && git commit -m "message" && git push`
4. Changes go live automatically

## Modern CSS polish — remaining phases (2026-07-17)

Phases 1-2 (`981a2c9` scroll polish, `006136a` OKLCH tokens) are pushed and
LIVE on joeflynnpm.com since 2026-07-17 (verified in production). Phase 3
(`adf5a98`) is committed but not pushed — awaiting Joe's visual review.
Inspiration: https://jovial-kayak-tysa.here.now/ — the full take/leave
analysis and OWID plan live in `../owid-explorer/POLISH-PLAN.md`.

**Phase 3 — DONE (2026-07-18):**
- Hero title rise: `rise` prop on WeightRampTitle wraps each segment in a
  `.title-mask` / `.title-rise` row (globals.css) — slide-up from behind an
  `overflow: clip` mask with 4° rotate and 120ms per-row stagger. Note this
  makes the home hero two lines ("Hey, I'm" / "Joe Flynn") at all widths;
  revert by dropping `rise` from Hero.tsx if the one-line layout is preferred.
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

**Gotchas:** never `npm run build` while the dev server is running (Next 14
shares `.next`; the build breaks the running dev server). Reduced-motion
kill-switch sits at the end of globals.css — new animations need an override
there if they shouldn't simply freeze.
