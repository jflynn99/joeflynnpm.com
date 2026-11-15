import { anthropic } from "@ai-sdk/anthropic";
import { stepCountIs } from "ai";
import { LIBRARIAN_PROMPT } from "./prompts";
import { libraryTools } from "./tools";

/** The model the library chatbot runs on. The eval suite records it with each snapshot. */
export const LIBRARY_MODEL_ID = "claude-sonnet-5-5";

/**
 * Everything the library chatbot sends to the model apart from the
 * conversation itself. The live route (/books/api/chat) and the eval suite
 * (scripts/eval-library.ts) both spread this, so an eval always measures
 * the chatbot as it ships.
 */
export const libraryChatSettings = {
  model: anthropic(LIBRARY_MODEL_ID),
  system: LIBRARIAN_PROMPT,
  tools: libraryTools,
  stopWhen: stepCountIs(12),
  // Sonnet 5.5 always thinks adaptively, and thinking counts towards this
  // cap, so it has more room than the old 4K to avoid cut-off answers.
  maxOutputTokens: 8_000,
  providerOptions: {
    anthropic: {
      // Each tool step re-sends the conversation; cache it so later steps
      // and follow-up questions read the earlier part at a fraction of
      // the input price.
      cacheControl: { type: "ephemeral" },
      // Retrieval and summary over Joe's own reviews: low effort is
      // plenty, and keeps latency and spend down. Raise if answers thin out.
      effort: "low",
      // If a safety classifier declines a request, the API retries it on
      // a suitable fallback model instead of returning nothing.
      fallbacks: "default",
    },
  },
} as const;
