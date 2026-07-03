"use client";

import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import KeyManager, { loadLlmConfig, type LlmConfig } from "./KeyManager";
import SpecChart from "./SpecChart";

const SUGGESTIONS = [
  "Show me renewable energy adoption vs GDP per capita in Germany",
  "How has life expectancy in Japan changed since 1950?",
  "Compare CO₂ emissions per capita in the US and China, indexed to 1990",
];

interface ArticleRef {
  title: string;
  url: string;
}

export default function ChatPanel({ serverConfigured }: { serverConfigured: boolean }) {
  const [config, setConfig] = useState<LlmConfig | null>(() => loadLlmConfig());
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent",
        headers: config
          ? { "x-llm-provider": config.provider, "x-llm-key": config.key }
          : undefined,
      }),
    [config]
  );

  const { messages, sendMessage, status, error } = useChat({ transport });
  const canChat = serverConfigured || config !== null;
  const busy = status === "submitted" || status === "streaming";

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !canChat || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {!serverConfigured && <KeyManager onChange={setConfig} />}

      <div className="min-h-64 space-y-4">
        {messages.length === 0 && (
          <div className="pt-4">
            <p className="text-sm text-gray-500">
              Ask for any data OWID publishes — the agent finds it, combines it, renders a chart
              with citations, and can explain it using OWID&apos;s own articles.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={!canChat}
                  onClick={() => submit(s)}
                  className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-600 hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            {message.role === "user" ? (
              <div className="ml-auto w-fit max-w-[85%] rounded-2xl bg-blue-600 px-4 py-2 text-sm text-white">
                {message.parts.map((part, i) =>
                  part.type === "text" ? <span key={i}>{part.text}</span> : null
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {message.parts.map((part, i) => {
                  if (part.type === "text" && part.text.trim()) {
                    return (
                      <p key={i} className="whitespace-pre-wrap text-sm text-gray-800">
                        {part.text}
                      </p>
                    );
                  }
                  if (part.type === "tool-search_indicators" || part.type === "tool-fetch_series") {
                    const label =
                      part.type === "tool-search_indicators" ? "Searching OWID" : "Checking data";
                    return (
                      <p key={i} className="text-xs text-gray-400">
                        {label}
                        {"input" in part && part.input
                          ? `: ${JSON.stringify((part.input as { query?: string; slug?: string }).query ?? (part.input as { slug?: string }).slug ?? "")}`
                          : "…"}
                      </p>
                    );
                  }
                  if (part.type === "tool-compose_chart" && part.state === "output-available") {
                    const output = part.output as { ok: boolean };
                    return output.ok ? <SpecChart key={i} spec={part.input} /> : null;
                  }
                  if (part.type === "tool-explain_chart" && part.state === "output-available") {
                    const output = part.output as { articles: ArticleRef[] };
                    if (!output.articles?.length) return null;
                    return (
                      <p key={i} className="text-xs text-gray-400">
                        Reading:{" "}
                        {output.articles.map((a, j) => (
                          <span key={a.url}>
                            {j > 0 && " · "}
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-gray-600"
                            >
                              {a.title}
                            </a>
                          </span>
                        ))}
                      </p>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        ))}

        {busy && <p className="text-xs text-gray-400">Thinking…</p>}
        {error && (
          <p className="text-sm text-red-600">
            The agent request failed{error.message ? `: ${error.message}` : ""}. Check your key and
            try again.
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="sticky bottom-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={canChat ? "Ask about any OWID data…" : "Add a key above to enable the agent"}
          disabled={!canChat}
          className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
        />
        <button
          type="submit"
          disabled={!canChat || busy || !input.trim()}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
