import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { headers } from "next/headers";
import { LIBRARIAN_PROMPT } from "@/lib/library/prompts";
import { libraryTools } from "@/lib/library/tools";

export const maxDuration = 120;

// --- Per-IP rate limiting ---
// Library queries are cheap (small tool results, short answers), so the
// limit is more generous than the decision agent's 3/day.
const DAILY_LIMIT_PER_IP = 10;

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
        error: "Daily limit reached (10 questions per day). Come back tomorrow!",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages } = await req.json();

  const result = streamText({
    model: anthropic("claude-opus-4-8"),
    system: LIBRARIAN_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: libraryTools,
    stopWhen: stepCountIs(12),
  });

  return result.toUIMessageStreamResponse();
}
