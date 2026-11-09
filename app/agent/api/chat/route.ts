import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { headers } from "next/headers";
import { clientIp, createDailyLimiter, jsonError, readMessages } from "@/lib/chatGuard";
import { DECISION_AGENT_PROMPT } from "@/lib/agent/prompts";
import { agentTools } from "@/lib/agent/tools";

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
    model: anthropic("claude-sonnet-5-5"),
    system: DECISION_AGENT_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: agentTools,
    // The prompt budgets ~12 tool calls; 20 steps leaves headroom without
    // letting one request re-send a large history 30 times.
    stopWhen: stepCountIs(20),
    // Sonnet 5.5 always thinks adaptively, and thinking counts towards this
    // cap, so the brief needs more room than the old 8K.
    maxOutputTokens: 16_000,
    providerOptions: {
      anthropic: {
        // Every tool step re-sends the whole conversation so far. Automatic
        // caching marks the end of each request, so the next step reads the
        // prompt, tools, and earlier search results from cache (a tenth of
        // the input price or less) and only pays full price for what is new.
        cacheControl: { type: "ephemeral" },
        // Multistep research with tools: medium is the recommended starting
        // point on Sonnet 5.5. Raise if briefs thin out.
        effort: "medium",
        // If a safety classifier declines a request, the API retries it on
        // a suitable fallback model instead of returning nothing.
        fallbacks: "default",
      },
    },
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
