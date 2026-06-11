import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { headers } from "next/headers";
import { DECISION_AGENT_PROMPT } from "@/lib/agent/prompts";
import { agentTools } from "@/lib/agent/tools";

export const maxDuration = 300;

// --- Per-IP rate limiting ---
const DAILY_LIMIT_PER_IP = 3;

const ipUsage = new Map<string, { count: number; date: string }>();

function isRateLimited(ip: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const entry = ipUsage.get(ip);

  if (!entry || entry.date !== today) {
    ipUsage.set(ip, { count: 1, date: today });
    return false;
  }

  if (entry.count >= DAILY_LIMIT_PER_IP) {
    return true;
  }

  entry.count++;
  return false;
}

export async function POST(req: Request) {
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({
        error: "Daily limit reached (3 queries per day). Come back tomorrow!",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: DECISION_AGENT_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: agentTools,
    stopWhen: stepCountIs(30),
  });

  return result.toUIMessageStreamResponse();
}
