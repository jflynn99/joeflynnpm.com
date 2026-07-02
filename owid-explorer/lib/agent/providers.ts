// BYO-LLM provider abstraction (SPEC.md §7).
//
// Resolution order: a client-supplied key (x-llm-provider / x-llm-key headers)
// wins for anthropic/openai; otherwise fall back to server env config.
// Client keys are used in-memory for the single request and never logged or
// persisted. Ollama is fork/env-only: its base URL must never come from a
// client header (SSRF), and a hosted function can't reach a user's localhost.

import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export type ProviderName = "anthropic" | "openai" | "ollama";

export interface ProviderSelection {
  provider: ProviderName;
  apiKey?: string;
  source: "client" | "server";
}

export interface ClientHeaders {
  provider?: string | null;
  key?: string | null;
}

export type ServerEnv = Partial<
  Record<"LLM_PROVIDER" | "ANTHROPIC_API_KEY" | "OPENAI_API_KEY", string>
> &
  Record<string, string | undefined>;

export function resolveProvider(
  headers: ClientHeaders,
  env: ServerEnv = process.env
): ProviderSelection | null {
  const clientProvider = headers.provider?.toLowerCase();
  const clientKey = headers.key?.trim();
  if (clientKey && (clientProvider === "anthropic" || clientProvider === "openai")) {
    return { provider: clientProvider, apiKey: clientKey, source: "client" };
  }

  const serverProvider = env.LLM_PROVIDER?.toLowerCase();
  if (serverProvider === "anthropic" && env.ANTHROPIC_API_KEY) {
    return { provider: "anthropic", apiKey: env.ANTHROPIC_API_KEY, source: "server" };
  }
  if (serverProvider === "openai" && env.OPENAI_API_KEY) {
    return { provider: "openai", apiKey: env.OPENAI_API_KEY, source: "server" };
  }
  if (serverProvider === "ollama") {
    return { provider: "ollama", source: "server" };
  }
  return null;
}

// Default models: the tool-calling here is simple enough that small models
// handle it, and it keeps everyone's costs down (SPEC.md §7).
const DEFAULT_MODELS: Record<ProviderName, string> = {
  anthropic: "claude-haiku-4-5",
  openai: "gpt-4o-mini",
  ollama: "llama3.1",
};

export function getModel(selection: ProviderSelection) {
  switch (selection.provider) {
    case "anthropic":
      return createAnthropic({ apiKey: selection.apiKey })(
        process.env.LLM_MODEL ?? DEFAULT_MODELS.anthropic
      );
    case "openai":
      return createOpenAI({ apiKey: selection.apiKey })(
        process.env.LLM_MODEL ?? DEFAULT_MODELS.openai
      );
    case "ollama": {
      const baseURL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
      return createOpenAICompatible({
        name: "ollama",
        baseURL: `${baseURL.replace(/\/$/, "")}/v1`,
      })(process.env.LLM_MODEL ?? DEFAULT_MODELS.ollama);
    }
  }
}
