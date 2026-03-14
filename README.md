# joeflynnpm.com

My personal website, blog, and AI-powered product decision agent. Live at [joeflynnpm.com](https://joeflynnpm.com).

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14, React 18 |
| Language | TypeScript |
| Content | MDX with remark/rehype plugins |
| Styling | Tailwind CSS + Typography plugin |
| AI | Vercel AI SDK, Anthropic Claude |
| Code Highlighting | Shiki via rehype-pretty-code |
| Deployment | Vercel |
| Analytics | Vercel Analytics |

## Features

- **Blog** — Writing about product management, AI, technology, and lessons learned from building products. Posts authored in MDX with full syntax highlighting and reading time estimates.
- **Projects** — Portfolio of projects with detailed write-ups.
- **Books** — A reading list tracking what I'm reading and have read.
- **Product Decision Agent** — An AI research agent that investigates product questions and produces structured decision briefs with evidence, trade-offs, and recommendations.

## Project Structure

```
app/
├── about/          # About page
├── agent/          # Product Decision Agent
├── blog/           # Blog listing and individual posts
├── books/          # Reading list
├── projects/       # Project portfolio
├── analytics/      # Analytics dashboard
└── layout.tsx      # Root layout
content/
├── blog/           # MDX blog posts
└── projects/       # MDX project pages
```

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Built With

This site was built with significant help from [Claude Code](https://claude.ai/code).
