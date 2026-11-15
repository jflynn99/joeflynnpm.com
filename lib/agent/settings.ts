import { anthropic } from "@ai-sdk/anthropic";
import { stepCountIs } from "ai";
import { DECISION_AGENT_PROMPT } from "./prompts";
import { agentTools } from "./tools";

/** The model the decision agent runs on. Saved example runs record it. */
export const AGENT_MODEL_ID = "claude-sonnet-5-5";

/**
 * Everything the decision agent sends to the model apart from the
 * conversation. The live route (/agent/api/chat) and the example capture
 * script (scripts/capture-agent-example.ts) both spread this, so a saved
 * example is a real run of the agent as it ships.
 */
export const agentChatSettings = {
  model: anthropic(AGENT_MODEL_ID),
  system: DECISION_AGENT_PROMPT,
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
} as const;
