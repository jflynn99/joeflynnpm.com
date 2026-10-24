import type { UIMessage } from "ai";

// Shared abuse guards for the public chat routes (/agent and /books).
//
// The rate limit is in-memory, so it only holds within one warm serverless
// instance. It stops casual repeat use; the hard backstop against a runaway
// bill is the monthly spend limit on the Anthropic console.

export function clientIp(headersList: Headers): string {
  return (
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "unknown"
  );
}

export function createDailyLimiter(limitPerIp: number) {
  const ipUsage = new Map<string, { count: number; date: string }>();

  return function isRateLimited(ip: string): boolean {
    const today = new Date().toISOString().slice(0, 10);
    const entry = ipUsage.get(ip);

    if (!entry || entry.date !== today) {
      ipUsage.set(ip, { count: 1, date: today });
      return false;
    }

    if (entry.count >= limitPerIp) {
      return true;
    }

    entry.count++;
    return false;
  };
}

// The client sends the whole conversation on every request, so the rate limit
// alone doesn't bound cost: one request could carry a huge fabricated history.
// These caps are well above any real conversation (tool results included).
const MAX_BODY_CHARS = 300_000;
const MAX_MESSAGES = 40;
const MAX_USER_MESSAGE_CHARS = 4_000;

export async function readMessages(
  req: Request
): Promise<{ messages: UIMessage[] } | { error: string; status: number }> {
  const body = await req.text();
  if (body.length > MAX_BODY_CHARS) {
    return { error: "Conversation is too long. Start a new one.", status: 413 };
  }

  let messages: unknown;
  try {
    messages = JSON.parse(body).messages;
  } catch {
    return { error: "Invalid request.", status: 400 };
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return { error: "Invalid request.", status: 400 };
  }
  if (messages.length > MAX_MESSAGES) {
    return { error: "Conversation is too long. Start a new one.", status: 413 };
  }

  for (const message of messages as UIMessage[]) {
    if (message.role === "system") {
      return { error: "Invalid request.", status: 400 };
    }
    if (message.role !== "user") continue;
    const text = (message.parts ?? [])
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("");
    if (text.length > MAX_USER_MESSAGE_CHARS) {
      return { error: "That message is too long. Try a shorter one.", status: 413 };
    }
  }

  return { messages: messages as UIMessage[] };
}

export function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
