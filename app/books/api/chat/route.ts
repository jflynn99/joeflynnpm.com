import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { headers } from "next/headers";
import { clientIp, createDailyLimiter, jsonError, readMessages } from "@/lib/chatGuard";
import { LIBRARIAN_PROMPT } from "@/lib/library/prompts";
import { libraryTools } from "@/lib/library/tools";

export const maxDuration = 120;

// --- Per-IP rate limiting ---
// Library queries are cheap (small tool results, short answers), so the
// limit is more generous than the decision agent's 3/day.
const isRateLimited = createDailyLimiter(10);

export async function POST(req: Request) {
  const ip = clientIp(await headers());

  if (isRateLimited(ip)) {
    return jsonError("Daily limit reached (10 questions per day). Come back tomorrow!", 429);
  }

  const parsed = await readMessages(req);
  if ("error" in parsed) {
    return jsonError(parsed.error, parsed.status);
  }
  const { messages } = parsed;

  const result = streamText({
    model: anthropic("claude-opus-4-8"),
    system: LIBRARIAN_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: libraryTools,
    stopWhen: stepCountIs(12),
    maxOutputTokens: 4_000,
  });

  return result.toUIMessageStreamResponse();
}
