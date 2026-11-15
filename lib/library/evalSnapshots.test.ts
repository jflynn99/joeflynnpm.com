import { test } from "node:test";
import assert from "node:assert/strict";
import type { EvalSnapshot } from "./evals.ts";
import { evalHistory, getEvalSnapshots, parseEvalSnapshot } from "./evalSnapshots.ts";

function result(id: string, pass: boolean): EvalSnapshot["results"][number] {
  return { id, group: "lookup", question: `Q ${id}`, expected: "", answer: "", pass, reason: "", steps: 1, tools: [] };
}

function snapshot(date: string, results: EvalSnapshot["results"]): EvalSnapshot {
  const usage = { inputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 };
  const passed = results.filter((r) => r.pass).length;
  return {
    date,
    model: "m",
    graderModel: "g",
    prices: {},
    passed,
    total: results.length,
    passRate: Math.round((passed / results.length) * 1000) / 1000,
    cost: { usd: 0, chatbot: usage, grader: usage },
    results,
  };
}

test("history is newest first and lists only the verdicts that changed since the run before", () => {
  const first = snapshot("2026-11-15T10:00:00.000Z", [result("a", true), result("b", false), result("c", true)]);
  const second = snapshot("2026-11-20T10:00:00.000Z", [result("a", true), result("b", true), result("c", false), result("d", false)]);
  const history = evalHistory([second, first]);
  assert.deepEqual(history.map((h) => h.snapshot.date), [second.date, first.date]);
  assert.deepEqual(history[0].flips, [
    { id: "b", question: "Q b", pass: true },
    { id: "c", question: "Q c", pass: false },
  ]);
  assert.deepEqual(history[1].flips, []);
});

test("a malformed snapshot names its file", () => {
  assert.throws(() => parseEvalSnapshot("bad.json", { date: "nope" }), /bad\.json/);
});

test("the committed snapshots load, oldest first", () => {
  const dates = getEvalSnapshots().map((s) => s.date);
  assert.ok(dates.length >= 1);
  assert.deepEqual(dates, [...dates].sort());
});
