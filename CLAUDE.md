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
- `date:` is optional, the ISO date the project was written up. Nothing shows it yet.
- `buildTrail:` is an optional Build Trail (see `GLOSSARY.md`), shown as a block after the body. Every part is optional and a missing part is not shown:

  ```yaml
  buildTrail:
    prompt: "The prompt that started it."
    plan: "How it was planned."
    model: "Which models did the work."
    prs: 12
    cost: "$69 for the run, about $173 all in."
    broke:
      - what: "The pod never stopped."
        cost: "$88"
  ```

  Only facts the project's post (or Joe) states. Never invent a number, prompt, or failure: leave the part out and ask Joe. `npm test` fails on an unknown key, a `broke` entry without `what`, or a `prs` that is not a positive whole number, and so does `npm run build`.

## Images

Art direction rule for `image:` on posts and projects:

- **Fine:** public-domain paintings, book covers, photos, screenshots, and the site's own share cards (`ogCard: true`).
- **Not fine:** images that are clearly AI-generated.
- **Exception:** an AI image can stay when Joe chose it on purpose. These are edge cases, decided one by one.

`node scripts/image-audit.mjs` writes a git-ignored contact sheet and checklist of every post and project image to `image-audit/`.

## Typography

Blog post, project page, and book review bodies are set in Literata (loaded once in `components/longFormFont.ts`) at 1.03x the `prose-lg` size, through the shared `LongFormBody` component. Wrap the MDX body of any new long-form page type in `LongFormBody` rather than a bare `prose` div.

Tables inside those bodies are in Literata too. Everything else keeps the system font: headings, code, navigation, cards, captions, /about, the agent UI, and data pages such as /analytics and the book grid. Do not add Literata to those.

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

Two optional fields record Joe's picks (both defined in `GLOSSARY.md`):

- `oneLiner:` one sentence, 40 words at most, on why the Book matters. It is Joe's words: ask him for it and never write it for him, the same rule as Voices taglines.
- `favourite: true` marks one of the Books Joe would press on someone. At most 20 Books carry it, and every Favourite needs a `oneLiner`. It does not depend on rating.

`npm test` fails on a 21st Favourite, a Favourite without a One-liner, or a One-liner that is empty or over 40 words.

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

To remove one, delete its entry. When Joe finishes it, add it as a Book through the normal flow above; its cover file can be reused as the Book's `coverImage`. An empty list removes the strip from the home page altogether.

`npm test` fails on a malformed entry (including an unknown key, so watch for typos), a `relatedBook` that is not a Book, or a missing cover file. The home page loads the file at build time, so a bad entry also fails `npm run build` rather than shipping a broken strip.

## Voices

The Voices section, the last one on the home page, lists the writers Joe reads and rates. It comes from `content/voices.json`, which also holds the full list for the /about page. A Voice is defined in `GLOSSARY.md`.

Each entry looks like this:

```json
{
  "name": "Simon Willison",
  "publication": "Weblog",
  "url": "https://simonwillison.net",
  "group": "AI",
  "home": true,
  "tagline": "The clearest developer blog for non-developers."
}
```

- `name`, `url`, `group`, and `home` are required. `publication` and `tagline` are optional, except that a `home: true` Voice must have a `tagline`.
- `url` must be a full `https://` URL. Check it resolves before committing.
- `group` is one of: AI, Product and building, Economics and politics, Ideas.
- Home Voices show in file order, so the order of the `home: true` entries is the order on the page.
- Taglines are Joe's words, about why he reads that writer. Ask him for one; never write it for him. Keep each under about 15 words.

Loading and validation happen in `lib/voices.ts`. `npm test` fails on a home Voice without a tagline, a missing or malformed `url`, an unknown `group`, or an unknown key. The home page reads the file at build time, so a bad entry also fails `npm run build`.

## About Page (and its Now section)

`/about` is the only page about Joe; there is no separate /now page. It renders, in order: the intro and photo, the **Now** section (`#now`: the `updated` date and Joe's text from `content/now.mdx`), What I Do, the Current Reads (`#reading`), What I Write About, the full Voices list grouped by `group` (`#voices`), and Get in Touch. The home page's "Right now" strip links to `/about#now` and its Voices section to `/about#voices`.

Keep the split: Now holds what is true at the moment, What I Do holds the stable bio (role, past roles). Don't repeat the current-role detail in both.

- The Now text is Joe's words. Ask him for it; never write it for him. Three short paragraphs at most, British English, informal.
- Whenever the text changes, set `updated` in the frontmatter to that day's ISO date (`"2026-11-11"`). The section shows it as "Last updated 11 November 2026".
- `npm test` fails if `updated` is missing or not an ISO date, or the body is empty.

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

## Embeds in posts

- `<HabitHeatmap year={2025} />` in any post, project, or review shows that year's habit heatmap with no year menu. A year with no data file shows a short message; the build does not fail. It is registered in `components/mdx/MDXComponents.tsx`, which both MDX paths share (`mdx-components.tsx` for `@next/mdx`, `mdxComponents` for `MDXRemote`).
- Props written as expressions (`year={2025}`) need `blockJS: false` in `lib/mdxOptions.ts`; next-mdx-remote otherwise drops them silently. `blockDangerousJS` stays on.
- `content/blog/heatmap-embed-test.mdx` is a draft that exercises both cases in `npm run dev`.

## Echo Gallery

`<EchoGallery />` on the Echo project page shows Echo's raw answers to a fixed list of 20 prompts, from `content/echo-gallery.json` (terms in `GLOSSARY.md`). It holds one or two Answer Sets: `before` (generated 15 November 2026, before she was post-trained) and, later, `after`.

- **Never edit an answer by hand**, not even a typo or a stray space. The point is what she actually said. The `before` set cannot be regenerated once she is post-trained.
- Add or replace a set with the importer, which copies answers byte for byte from the JSONL that `my-llm/scripts/save_generations.py` writes:

  ```bash
  node scripts/import-echo-gallery.mjs <answers.jsonl> --label after --date 2026-12-01 --model "nanochat d24-joe" --device "a laptop CPU"
  ```

- The `after` set must answer the same prompts in the same order with the same settings (temperature 0.6, top-k 50, 256 tokens, seed 42), or it is not a fair comparison. With two sets the gallery shows them side by side.
- `npm test` fails on an unknown key, a missing setting, a second set whose prompts differ from the first, or a change to the first `before` answer, and so does `npm run build`.

## Library Chatbot Evals

`evals/library/questions.json` holds the approved eval questions for the library chatbot on /books, in four groups: lookups, counts, recommendations, and declines. Lookups and counts are checked exactly against the Book data, with expected values worked out at run time, so adding a Book never breaks the suite. Recommendations and declines are graded by a model against the rubric stored with each question.

- Run it by hand with `npm run eval:library` (needs `ANTHROPIC_API_KEY` in the environment). It costs API money, so it never runs in CI. Add `-- --note "..."` for a one-line note on what changed, in Joe's words. `-- --only count` runs one group without saving.
- Each full run writes `evals/library/snapshots/<date>.json`: every answer, pass or fail, the reason, the models, the prices used, and the cost. Commit it as written, failures included. Never edit a snapshot by hand.
- The chatbot's model, prompt, and tools live in `lib/library/chat.ts`, shared by the live route and the eval runner, so a change there is what the next run measures.
- `npm test` validates the questions file and every committed snapshot, but never calls the model.
- Changing or adding questions needs Joe's approval, since it breaks comparison with earlier snapshots.
- `/books/evals` shows the latest snapshot (every question, answer, verdict, and reason) and a history line per snapshot with the questions that flipped since the one before. It reads the snapshots at build time through `lib/library/evalSnapshots.ts`, so committing a new snapshot is the only edit it needs. It never calls the model.

## Agent Example Runs

`/agent` shows saved runs of the decision agent under the form, from `content/agent-examples/*.json`. Choosing one replays its steps in the timeline with the tokens and cost; it makes no API call and spends none of the visitor's daily queries. Visitor runs are never stored.

- Capture one with `npm run capture:agent-example -- --slug <name> --brief "<question>"` (needs `ANTHROPIC_API_KEY` and `TAVILY_API_KEY`; about 7 cents a run). It uses the live agent's model, prompt, and tools from `lib/agent/settings.ts`, which the route shares.
- Only capture briefs Joe has approved, and commit the file exactly as written. Never edit an example by hand.
- Cost is the tokens times the price stored in the file (the published price on the capture date). `npm test` fails if a file's cost doesn't add up, a key is unknown, or a step uses an unknown tool, and so does `npm run build`.
- Approved briefs (issue #65): subscription pricing for a note-taking app, the banking app's first feature, and AI support agent vs AI-drafted replies.

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
