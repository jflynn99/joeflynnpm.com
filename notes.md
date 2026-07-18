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

Phases 1-2 are committed (`981a2c9` scroll polish, `006136a` OKLCH tokens) but
NOT pushed yet. Inspiration: https://jovial-kayak-tysa.here.now/ — the full
take/leave analysis and OWID plan live in `../owid-explorer/POLISH-PLAN.md`.

**Phase 3 (next):**
- Hero title rise: each line of the home hero h1 slides up from behind an
  `overflow: clip` mask on load with a slight rotate and per-line stagger
  (see the Kimi site's `h1.mega .row` / `@keyframes rise`). Layer onto the
  existing WeightRampTitle in `components/home/Hero.tsx`.
- View-transition filtering: wrap the filter state updates in
  `document.startViewTransition()` so cards cross-fade/slide instead of
  snapping — /books fiction/non-fiction toggle (`components/books/BookBrowser.tsx`)
  and blog tag filter (`components/blog/TagFilter.tsx`). No-op fallback where
  unsupported.
- Optional: animate the mobile menu open with `interpolate-size: allow-keywords`.

**Open decision (separate from Phase 3):** adopt a display serif for headings
(Fraunces or similar, via next/font like the existing Inter). Biggest visual
character upgrade available, but an identity change — prototype on a branch
first; possibly belongs in the joeflynn-site rebuild instead.

**Gotchas:** never `npm run build` while the dev server is running (Next 14
shares `.next`; the build breaks the running dev server). Reduced-motion
kill-switch sits at the end of globals.css — new animations need an override
there if they shouldn't simply freeze.
