# Fonts

`Inter-Regular.ttf` and `Inter-Bold.ttf` are used by `app/og/route.tsx` to
render social cards. Satori (behind `next/og`) needs real font data and
accepts TTF/OTF/WOFF — not WOFF2 — so these are committed rather than
fetched at request time.

**These are subsets, not the full faces.** Each is cut down to Latin-1,
Latin Extended-A, and the punctuation the cards use (curly quotes, dashes,
ellipsis, middot), taking them from ~318 KB to ~55 KB each. That is not just
tidiness: the full faces pushed the `og` Edge Function to 1.07 MB and Vercel
rejected the deploy against a 1 MB limit.

If a card ever needs glyphs outside that range — Greek, Cyrillic, CJK — the
subset has to be regenerated, not just used, or those characters render as
blanks. Regenerate with `subset-font`, watching the bundle size.

Inter is by Rasmus Andersson, licensed under the SIL Open Font License 1.1:
https://github.com/rsms/inter — https://openfontlicense.org

They are not used anywhere in the site's own CSS, which uses a system font
stack (see `--font-sans` in `app/globals.css`).
