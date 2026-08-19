# Fonts

`Inter-Regular.ttf` and `Inter-Bold.ttf` are used by `app/og/route.tsx` to
render social cards. Satori (behind `next/og`) needs real font data and
accepts TTF/OTF/WOFF — not WOFF2 — so these are committed rather than
fetched at request time.

Inter is by Rasmus Andersson, licensed under the SIL Open Font License 1.1:
https://github.com/rsms/inter — https://openfontlicense.org

They are not used anywhere in the site's own CSS, which uses a system font
stack (see `--font-sans` in `app/globals.css`).
