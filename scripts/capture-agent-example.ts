// Captures one real run of the decision agent as a saved example for /agent.
//
//   npm run capture:agent-example -- --slug pricing --brief "Should a ...?"
//
// Runs the brief through the same model, prompt, and tools as the live agent
// (lib/agent/settings.ts) and writes content/agent-examples/<slug>.json: the
// brief, each step, the final answer, the tokens, the price used, and the
// cost. Commit the file as written; never edit it by hand. Costs real API
// money (roughly 7 cents a run). Needs ANTHROPIC_API_KEY and TAVILY_API_KEY.

import fs from "node:fs";
import path from "node:path";
import { generateText } from "ai";
import { AGENT_MODEL_ID, agentChatSettings } from "@/lib/agent/settings";
import {
  costOf,
  parseAgentExample,
  type ExamplePrice,
  type ExampleStep,
  type ExampleUsage,
} from "@/lib/agent/examples";

// US dollars per million tokens for claude-sonnet-5-5, from Anthropic's
// published prices on 2026-11-15. Cache writes are the 5-minute tier (1.25x
// input). Update when prices change; each example stores the price it used.
const PRICE: ExamplePrice = { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function clip(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** A short summary of what a tool returned, for the timeline. */
function summariseResult(tool: string, output: unknown): string {
  const out = (output ?? {}) as Record<string, unknown>;
  if (typeof out.error === "string") return `Error: ${clip(out.error)}`;
  if (tool === "web_search") {
    const results = (out.results ?? []) as { title?: string }[];
    return `${results.length} results${results.length ? `: ${clip(results.map((r) => r.title).join("; "))}` : ""}`;
  }
  if (tool === "web_fetch") {
    const content = typeof out.content === "string" ? out.content : "";
    return `${content.length.toLocaleString("en-GB")} characters read: ${clip(content, 120)}`;
  }
  if (tool === "note") return "Recorded";
  return clip(JSON.stringify(out));
}

async function main() {
  const slug = arg("slug");
  const brief = arg("brief");
  if (!slug || !/^[a-z0-9-]+$/.test(slug) || !brief) {
    console.error('Usage: npm run capture:agent-example -- --slug <a-z0-9-> --brief "<question>"');
    process.exit(1);
  }
  for (const key of ["ANTHROPIC_API_KEY", "TAVILY_API_KEY"]) {
    if (!process.env[key]) {
      console.error(`${key} is not set.`);
      process.exit(1);
    }
  }
  const out = path.join(process.cwd(), "content/agent-examples", `${slug}.json`);
  if (fs.existsSync(out)) {
    console.error(`${path.relative(process.cwd(), out)} already exists. Pick another slug or delete it first.`);
    process.exit(1);
  }

  const result = await generateText({ ...agentChatSettings, prompt: brief });

  const steps: ExampleStep[] = [];
  const lastIndex = result.steps.length - 1;
  result.steps.forEach((step, i) => {
    const text = step.text.trim();
    // The final step's text is the brief itself, shown separately.
    if (text && i !== lastIndex && !text.startsWith("# Decision Brief")) {
      steps.push({ type: "text", text });
    }
    for (const call of step.toolCalls) {
      const output = step.toolResults.find((r) => r.toolCallId === call.toolCallId)?.output;
      steps.push({
        type: "tool",
        tool: call.toolName as "web_search" | "web_fetch" | "note",
        input: call.input as Record<string, unknown>,
        result: summariseResult(call.toolName, output),
      });
    }
  });

  const briefText =
    [...result.steps].reverse().map((s) => s.text).find((t) => t.includes("Decision Brief")) ??
    result.text;

  const d = result.totalUsage.inputTokenDetails;
  const cacheReadTokens = d?.cacheReadTokens ?? 0;
  const cacheWriteTokens = d?.cacheWriteTokens ?? 0;
  const usage: ExampleUsage = {
    inputTokens:
      d?.noCacheTokens ??
      Math.max(0, (result.totalUsage.inputTokens ?? 0) - cacheReadTokens - cacheWriteTokens),
    cacheReadTokens,
    cacheWriteTokens,
    outputTokens: result.totalUsage.outputTokens ?? 0,
  };
  const cost = Math.round(costOf(usage, PRICE) * 1e6) / 1e6;

  const example = {
    brief,
    capturedAt: new Date().toISOString(),
    model: AGENT_MODEL_ID,
    price: PRICE,
    usage,
    cost,
    steps,
    answer: briefText.trim(),
  };
  parseAgentExample(slug, example);

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(example, null, 2) + "\n");
  console.log(
    `Wrote ${path.relative(process.cwd(), out)}: ${steps.length} steps, ${result.steps.length} model calls, $${cost.toFixed(4)}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
