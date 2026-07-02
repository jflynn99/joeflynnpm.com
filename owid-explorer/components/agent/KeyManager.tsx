"use client";

// BYO-key entry (SPEC.md §7, mode 2). The key lives in localStorage only and
// is sent per-request as an x-llm-key header; the server uses it in-memory and
// never logs or persists it.

import { useEffect, useState } from "react";

const STORAGE_KEY = "owid-explorer.llm";

export interface LlmConfig {
  provider: "anthropic" | "openai";
  key: string;
}

export function loadLlmConfig(): LlmConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if ((parsed.provider === "anthropic" || parsed.provider === "openai") && parsed.key) {
      return parsed;
    }
  } catch {
    // corrupted entry — treat as absent
  }
  return null;
}

export default function KeyManager({ onChange }: { onChange: (config: LlmConfig | null) => void }) {
  const [provider, setProvider] = useState<LlmConfig["provider"]>("anthropic");
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState<LlmConfig | null>(null);

  useEffect(() => {
    const existing = loadLlmConfig();
    if (existing) {
      setSaved(existing);
      setProvider(existing.provider);
    }
  }, []);

  function save() {
    const trimmed = key.trim();
    if (!trimmed) return;
    const config: LlmConfig = { provider, key: trimmed };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setSaved(config);
    setKey("");
    onChange(config);
  }

  function clear() {
    window.localStorage.removeItem(STORAGE_KEY);
    setSaved(null);
    onChange(null);
  }

  if (saved) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
        <span className="text-gray-600">
          Using your <span className="font-medium">{saved.provider}</span> key (stored in this
          browser only)
        </span>
        <button type="button" onClick={clear} className="text-xs text-gray-400 hover:text-red-600">
          Remove key
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold">Add an API key to enable the agent</h3>
      <p className="mt-1 text-xs text-gray-500">
        Your key is stored in this browser&apos;s localStorage and sent only with your own chat
        requests. It is used in-memory on the server and never logged or persisted.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as LlmConfig["provider"])}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          aria-label="LLM provider"
        >
          <option value="anthropic">Anthropic</option>
          <option value="openai">OpenAI</option>
        </select>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={provider === "anthropic" ? "sk-ant-…" : "sk-…"}
          className="min-w-64 flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
          aria-label="API key"
        />
        <button
          type="button"
          onClick={save}
          disabled={!key.trim()}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Save
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Running your own fork? Set <code>LLM_PROVIDER</code> in <code>.env</code> instead —
        including Ollama for fully local use.
      </p>
    </div>
  );
}
