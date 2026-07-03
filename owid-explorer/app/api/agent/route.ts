import { NextRequest, NextResponse } from "next/server";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { getModel, resolveProvider } from "@/lib/agent/providers";
import { agentTools } from "@/lib/agent/tools";
import { SYSTEM_PROMPT } from "@/lib/agent/prompts";

export const maxDuration = 60;

// GET reports whether the server has an LLM configured, so the UI can decide
// whether to show the key manager gate. Never returns key material.
export async function GET() {
  const server = resolveProvider({});
  return NextResponse.json({
    configured: server !== null,
    provider: server?.provider ?? null,
  });
}

export async function POST(req: NextRequest) {
  // Client keys are used in-memory for this request only — never logged,
  // never persisted (SPEC.md §7).
  const selection = resolveProvider({
    provider: req.headers.get("x-llm-provider"),
    key: req.headers.get("x-llm-key"),
  });
  if (!selection) {
    return NextResponse.json(
      { error: "no_provider", message: "Add an API key to enable the agent." },
      { status: 401 }
    );
  }

  const { messages } = await req.json();

  const result = streamText({
    model: getModel(selection),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: agentTools,
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse();
}
