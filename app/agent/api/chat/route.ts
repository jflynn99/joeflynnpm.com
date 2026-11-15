import { streamText, convertToModelMessages } from "ai";
import { headers } from "next/headers";
import { clientIp, createDailyLimiter, jsonError, readMessages } from "@/lib/chatGuard";
import { agentChatSettings } from "@/lib/agent/settings";

export const maxDuration = 300;

// --- Per-IP rate limiting ---
const isRateLimited = createDailyLimiter(3);

export async function POST(req: Request) {
  const ip = clientIp(await headers());

  if (isRateLimited(ip)) {
    return jsonError("Daily limit reached (3 queries per day). Come back tomorrow!", 429);
  }

  const parsed = await readMessages(req);
  if ("error" in parsed) {
    return jsonError(parsed.error, parsed.status);
  }
  const { messages } = parsed;

  const result = streamText({
    ...agentChatSettings,
    messages: await convertToModelMessages(messages),
    // Caching fails silently (same answers, bigger bill), so log the token
    // split per run. A healthy run shows cacheRead well above noCache.
    onFinish: ({ totalUsage, steps }) => {
      console.log("[agent] usage", {
        steps: steps.length,
        ...totalUsage.inputTokenDetails,
        outputTokens: totalUsage.outputTokens,
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
