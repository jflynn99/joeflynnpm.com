import { test } from "node:test";
import assert from "node:assert/strict";
import { costOf, getAgentExamples, parseAgentExample } from "./examples.ts";

const price = { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 };
const usage = { inputTokens: 10_000, cacheReadTokens: 200_000, cacheWriteTokens: 20_000, outputTokens: 5_000 };

function example(overrides: Record<string, unknown> = {}) {
  return {
    brief: "Should we?",
    capturedAt: "2026-11-15T12:00:00.000Z",
    model: "claude-sonnet-5-5",
    price,
    usage,
    cost: costOf(usage, price),
    steps: [
      { type: "tool", tool: "web_search", input: { query: "q" }, result: "5 results" },
      { type: "text", text: "Moving to synthesis." },
    ],
    answer: "# Decision Brief\n\nYes.",
    ...overrides,
  };
}

test("cost is tokens times the per-million price", () => {
  // 10k x $2 + 200k x $0.10 + 20k x $2.50 + 5k x $10, per million = $0.14
  assert.equal(Math.round(costOf(usage, price) * 1e6) / 1e6, 0.14);
});

test("a well-formed example loads", () => {
  const ex = parseAgentExample("one", example());
  assert.equal(ex.slug, "one");
  assert.equal(ex.steps.length, 2);
});

test("a cost that is not usage times price fails", () => {
  assert.throws(() => parseAgentExample("one", example({ cost: 0.5 })), /cost/);
});

test("an unknown key fails, naming the file", () => {
  assert.throws(() => parseAgentExample("bad-file", example({ extra: 1 })), /bad-file/);
});

test("an unknown tool fails", () => {
  assert.throws(() =>
    parseAgentExample("one", example({ steps: [{ type: "tool", tool: "rm_rf", input: {}, result: "" }] })),
  );
});

test("an example with no steps or no answer fails", () => {
  assert.throws(() => parseAgentExample("one", example({ steps: [] })));
  assert.throws(() => parseAgentExample("one", example({ answer: "" })));
});

test("every committed example in content/agent-examples is well formed", () => {
  assert.doesNotThrow(() => getAgentExamples());
});
