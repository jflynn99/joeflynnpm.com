"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useMemo, useState } from "react";
import { useDailyQuota } from "@/lib/useLocalStorage";
import { AgentTimeline } from "./AgentTimeline";
import { DecisionBrief } from "./DecisionBrief";

const RATE_LIMIT_KEY = "agent-queries";
const RATE_LIMIT_MAX = 3;

export function AgentForm() {
  const quota = useDailyQuota(RATE_LIMIT_KEY, RATE_LIMIT_MAX);
  const [serverLimitHit, setServerLimitHit] = useState(false);
  const rateLimitHit = quota.limitHit || serverLimitHit;
  const [serverError, setServerError] = useState<string | null>(null);
  const [input, setInput] = useState("");

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/agent/api/chat" }),
    []
  );

  const { messages, status, setMessages, sendMessage } = useChat({
    transport,
    onFinish: quota.increment,
    onError: (error) => {
      if (error.message?.includes("429") || error.message?.includes("limit")) {
        setServerLimitHit(true);
        setServerError("Daily limit reached (3 queries per day). Come back tomorrow!");
      } else {
        setServerError("Something went wrong. Please try again later.");
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading || rateLimitHit) return;
      const text = input.trim();
      setInput("");
      sendMessage({ text });
    },
    [input, isLoading, rateLimitHit, sendMessage]
  );

  const handleReset = useCallback(() => {
    setMessages([]);
    setInput("");
    setServerError(null);
  }, [setMessages]);

  // Find the final output — look for "Decision Brief" in any text part,
  // falling back to the last substantial assistant text
  const finalOutput = useMemo(() => {
    // First pass: look for a text part containing "Decision Brief"
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant") continue;
      for (const part of m.parts) {
        if (
          part.type === "text" &&
          part.text.includes("Decision Brief")
        ) {
          return part.text;
        }
      }
    }
    // Fallback: return the last assistant text part that's longer than 200 chars
    // (i.e. not just a phase transition sentence)
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant") continue;
      for (let j = m.parts.length - 1; j >= 0; j--) {
        const part = m.parts[j];
        if (part.type === "text" && part.text.trim().length > 200) {
          return part.text;
        }
      }
    }
    return null;
  }, [messages]);

  const hasStarted = messages.length > 0;
  const isDone = !isLoading && status === "ready" && hasStarted;

  return (
    <div className="space-y-6">
      {/* Input phase */}
      {!hasStarted && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label
            htmlFor="question"
            className="block text-sm font-medium text-muted"
          >
            Enter a product decision question
          </label>
          <textarea
            id="question"
            rows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='e.g. "Should a B2B SaaS company invest in self-service onboarding or white-glove onboarding?"'
            className="w-full rounded-lg border border-border bg-background p-3 text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            disabled={rateLimitHit}
          />
          {rateLimitHit ? (
            <p className="text-sm text-red-500">
              Daily limit reached ({RATE_LIMIT_MAX} queries). Come back
              tomorrow!
            </p>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Research this question
            </button>
          )}
        </form>
      )}

      {/* Thinking phase — timeline */}
      {hasStarted && (
        <AgentTimeline messages={messages} isLoading={isLoading} />
      )}

      {/* Error display */}
      {serverError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm text-red-500">{serverError}</p>
        </div>
      )}

      {/* Complete phase — decision brief */}
      {isDone && finalOutput && (
        <DecisionBrief content={finalOutput} />
      )}

      {/* Reset button — always show when done */}
      {isDone && (
        <button
          onClick={handleReset}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-card hover:text-foreground"
        >
          Ask another question
        </button>
      )}
    </div>
  );
}
