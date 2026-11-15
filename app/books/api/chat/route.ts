import { streamText, convertToModelMessages } from "ai";
import { headers } from "next/headers";
import { clientIp, createDailyLimiter, jsonError, readMessages } from "@/lib/chatGuard";
import { libraryChatSettings } from "@/lib/library/chat";

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
    ...libraryChatSettings,
    messages: await convertToModelMessages(messages),
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
