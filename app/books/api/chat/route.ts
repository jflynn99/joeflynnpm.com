import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { headers } from "next/headers";
import { clientIp, createDailyLimiter, jsonError, readMessages } from "@/lib/chatGuard";
import { LIBRARIAN_PROMPT } from "@/lib/library/prompts";
import { libraryTools } from "@/lib/library/tools";

export const maxDuration = 120;

// --- Per-IP rate limiting ---
// Library queries are cheap (small tool results, short answers, Sonnet), so
// the limit is more generous than the decision agent's 3/day.
const isRateLimited = createDailyLimiter(10);

// A full review is at most ~18K chars and a list_books call ~5K, so a long
// real session stays well under this.
const MAX_BODY_CHARS = 150_000;

export async function POST(req: Request) {
  const ip = clientIp(await headers());

  if (isRateLimited(ip)) {
    return jsonError("Daily limit reached (10 questions per day). Come back tomorrow!", 429);
  }

  const parsed = await readMessages(req, { maxBodyChars: MAX_BODY_CHARS });
  if ("error" in parsed) {
    return jsonError(parsed.error, parsed.status);
  }
  const { messages } = parsed;

  const result = streamText({
    model: anthropic("claude-sonnet-5-5"),
    system: LIBRARIAN_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: libraryTools,
    stopWhen: stepCountIs(12),
    // Sonnet 5.5 always thinks adaptively, and thinking counts towards this
    // cap, so it has more room than the old 4K to avoid cut-off answers.
    maxOutputTokens: 8_000,
    providerOptions: {
      anthropic: {
        // Each tool step re-sends the conversation; cache it so later steps
        // and follow-up questions read the earlier part at a fraction of
        // the input price.
        cacheControl: { type: "ephemeral" },
        // Retrieval and summary over Joe's own reviews: low effort is
        // plenty, and keeps latency and spend down. Raise if answers thin out.
        effort: "low",
        // If a safety classifier declines a request, the API retries it on
        // a suitable fallback model instead of returning nothing.
        fallbacks: "default",
      },
    },
    onFinish: ({ totalUsage, steps }) => {
      console.log("[books] usage", {
        steps: steps.length,
        ...totalUsage.inputTokenDetails,
        outputTokens: totalUsage.outputTokens,
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
