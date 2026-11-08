import { tool } from "ai";
import { z } from "zod";
import { BlockedUrlError, safeFetch } from "./safeFetch";

export const agentTools = {
  web_search: tool({
    description:
      "Search the web using Tavily. Returns the top 5 results with title, URL, and snippet.",
    inputSchema: z.object({
      query: z.string().describe("The search query"),
    }),
    execute: async ({ query }) => {
      try {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: process.env.TAVILY_API_KEY,
            query,
            max_results: 5,
          }),
        });

        if (!response.ok) {
          return {
            results: [] as { title: string; url: string; snippet: string }[],
            error: `Search API returned HTTP ${response.status}`,
          };
        }

        const data = await response.json();
        const top = (data.results ?? []).slice(0, 5).map((r: { title: string; url: string; content: string }) => ({
          title: r.title,
          url: r.url,
          snippet: r.content,
        }));
        return { results: top };
      } catch {
        return {
          results: [] as { title: string; url: string; snippet: string }[],
          error:
            "Web search is currently unavailable. Proceed using your own knowledge or try web_fetch with a known URL.",
        };
      }
    },
  }),

  web_fetch: tool({
    description:
      "Fetch a web page and return its text content (HTML stripped, truncated to ~4000 chars). Use this to read articles, reports, or documentation found via web_search.",
    inputSchema: z.object({
      url: z.string().url().describe("The URL to fetch"),
    }),
    execute: async ({ url }) => {
      try {
        const res = await safeFetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; ProductDecisionAgent/1.0)",
          },
        });

        if (res.status < 200 || res.status >= 300) {
          return { error: `Failed to fetch: HTTP ${res.status}` };
        }

        // Strip HTML tags, scripts, styles
        const text = res.body
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 4000);

        return { content: text, url: res.url };
      } catch (err) {
        if (err instanceof BlockedUrlError) {
          return { error: `Refused to fetch ${url}: ${err.message}. Only public web pages can be fetched.` };
        }
        return {
          error: `Could not fetch ${url} — site may be blocking automated requests or the request timed out.`,
        };
      }
    },
  }),

  note: tool({
    description:
      "Record a key finding or insight from your research. Use this to build up evidence as you investigate each sub-question. Notes are visible to the user in the timeline.",
    inputSchema: z.object({
      insight: z
        .string()
        .describe("The key finding or insight to record"),
    }),
    execute: async ({ insight }) => {
      return { recorded: true, insight };
    },
  }),
};
