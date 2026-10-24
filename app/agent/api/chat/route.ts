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
    model: anthropic("claude-sonnet-4-6"),
    system: DECISION_AGENT_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: agentTools,
    stopWhen: stepCountIs(30),
    maxOutputTokens: 8_000,
  });

  return result.toUIMessageStreamResponse();
}
