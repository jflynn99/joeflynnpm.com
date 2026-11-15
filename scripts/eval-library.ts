// Runs the library chatbot's eval suite and writes a dated snapshot.
//
//   npm run eval:library                 # every question
//   npm run eval:library -- --note "..." # with a one-line note in Joe's words
//   npm run eval:library -- --only count # one group, for a quick check (not saved)
//
// Each question goes through the same model, prompt, and tools the live
// chatbot uses (lib/library/chat.ts). Lookups and counts are checked exactly
// against the Book data; recommendations and declines are graded by a model
// against the rubric stored with the question. Costs real API money, so it
// runs by hand, never in CI. Needs ANTHROPIC_API_KEY.

import fs from "node:fs";
import path from "node:path";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, type LanguageModelUsage } from "ai";
import { getAllBooks } from "@/lib/books";
import { getCurrentReads } from "@/lib/currentReads";
import { LIBRARY_MODEL_ID, libraryChatSettings } from "@/lib/library/chat";
import {
  checkExactly,
  costOf,
  questionsFileSchema,
  snapshotSchema,
  type CheckResult,
  type EvalPrice,
  type EvalQuestion,
  type EvalSnapshot,
  type EvalUsage,
} from "@/lib/library/evals";

const GRADER_MODEL_ID = "claude-opus-5-5";

// US dollars per million tokens, from Anthropic's published prices on
// 2026-11-15. Cache writes are the 5-minute tier (1.25x input). Update these
// when prices change; each snapshot stores the ones it used.
const PRICES: Record<string, EvalPrice> = {
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
};

const CONCURRENCY = 4;
const evalsDir = path.join(process.cwd(), "evals/library");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function emptyUsage(): EvalUsage {
  return { inputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 };
}

function addUsage(into: EvalUsage, usage: LanguageModelUsage): void {
  const d = usage.inputTokenDetails;
  const cacheRead = d?.cacheReadTokens ?? 0;
  const cacheWrite = d?.cacheWriteTokens ?? 0;
  into.inputTokens += d?.noCacheTokens ?? Math.max(0, (usage.inputTokens ?? 0) - cacheRead - cacheWrite);
  into.cacheReadTokens += cacheRead;
  into.cacheWriteTokens += cacheWrite;
  into.outputTokens += usage.outputTokens ?? 0;
}

const books = getAllBooks();
const shelf = books
  .filter((b) => !b.frontmatter.podcast)
  .map(
    (b) =>
      `${b.frontmatter.title} | ${b.frontmatter.author} | ${b.frontmatter.rating} stars | ${(b.frontmatter.genres ?? []).join(", ")}${b.frontmatter.pages ? ` | ${b.frontmatter.pages} pages` : ""}`,
  )
  .join("\n");
const currentReads =
  getCurrentReads()
    .map((r) => `${r.title} by ${r.author}`)
    .join("; ") || "none";

const GRADER_SYSTEM = `You grade answers from a chatbot that answers questions about Joe Flynn's bookshelf, using only his own reviews and ratings.

You are given the visitor's question, the chatbot's answer, and a rubric. Decide whether the answer meets the rubric. Judge only against the rubric and the shelf below; do not reward style. A book counts as "on the shelf" only if it appears in the list below.

Reply with JSON only, no other text: {"pass": true or false, "reason": "one sentence"}

Current Reads (started, not finished, not Books, never rated): ${currentReads}

Joe's shelf (title | author | rating | genres | pages):
${shelf}`;

async function gradeWithRubric(
  q: EvalQuestion,
  answer: string,
  graderUsage: EvalUsage,
): Promise<CheckResult> {
  const rubric = q.check.kind === "rubric" ? q.check.rubric : "";
  const result = await generateText({
    model: anthropic(GRADER_MODEL_ID),
    system: GRADER_SYSTEM,
    prompt: `Question: ${q.question}\n\nRubric: ${rubric}\n\nAnswer:\n${answer || "(no answer)"}`,
    maxOutputTokens: 4_000,
    providerOptions: { anthropic: { cacheControl: { type: "ephemeral" }, effort: "low" } },
  });
  addUsage(graderUsage, result.totalUsage);
  const json = result.text.match(/\{[\s\S]*\}/)?.[0];
  try {
    const parsed = JSON.parse(json ?? "");
    return { expected: rubric, pass: parsed.pass === true, reason: String(parsed.reason ?? "") };
  } catch {
    return {
      expected: rubric,
      pass: false,
      reason: `Grader reply was not JSON: ${result.text.slice(0, 200)}`,
    };
  }
}

async function runOne(
  q: EvalQuestion,
  chatUsage: EvalUsage,
  graderUsage: EvalUsage,
): Promise<EvalSnapshot["results"][number]> {
  let answer = "";
  let steps = 0;
  let tools: string[] = [];
  try {
    const result = await generateText({ ...libraryChatSettings, prompt: q.question });
    addUsage(chatUsage, result.totalUsage);
    answer = result.text.trim();
    steps = result.steps.length;
    tools = result.steps.flatMap((s) => s.toolCalls.map((c) => c.toolName));
  } catch (error) {
    return {
      id: q.id,
      group: q.group,
      question: q.question,
      expected: "",
      answer: "",
      pass: false,
      reason: `Chatbot call failed: ${(error as Error).message}`,
      steps,
      tools,
    };
  }
  let graded: CheckResult;
  try {
    graded =
      q.check.kind === "rubric"
        ? await gradeWithRubric(q, answer, graderUsage)
        : checkExactly(q.check, answer, books);
  } catch (error) {
    graded = {
      expected: q.check.kind === "rubric" ? q.check.rubric : "",
      pass: false,
      reason: `Grader call failed: ${(error as Error).message}`,
    };
  }
  return { id: q.id, group: q.group, question: q.question, answer, steps, tools, ...graded };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set.");
    process.exit(1);
  }
  const file = questionsFileSchema.parse(
    JSON.parse(fs.readFileSync(path.join(evalsDir, "questions.json"), "utf8")),
  );
  const only = arg("only");
  const questions = only ? file.questions.filter((q) => q.group === only) : file.questions;
  const note = arg("note");

  const chatUsage = emptyUsage();
  const graderUsage = emptyUsage();
  const results: EvalSnapshot["results"] = new Array(questions.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < questions.length) {
        const i = next++;
        results[i] = await runOne(questions[i], chatUsage, graderUsage);
        console.log(`${results[i].pass ? "PASS" : "FAIL"}  ${questions[i].id}  ${results[i].reason}`);
      }
    }),
  );

  const passed = results.filter((r) => r.pass).length;
  const usd =
    costOf(chatUsage, PRICES[LIBRARY_MODEL_ID]) + costOf(graderUsage, PRICES[GRADER_MODEL_ID]);
  const date = new Date();
  const snapshot = snapshotSchema.parse({
    date: date.toISOString(),
    model: LIBRARY_MODEL_ID,
    graderModel: GRADER_MODEL_ID,
    ...(note && { note }),
    prices: {
      [LIBRARY_MODEL_ID]: PRICES[LIBRARY_MODEL_ID],
      [GRADER_MODEL_ID]: PRICES[GRADER_MODEL_ID],
    },
    passed,
    total: results.length,
    passRate: Math.round((passed / results.length) * 1000) / 1000,
    cost: { usd: Math.round(usd * 10_000) / 10_000, chatbot: chatUsage, grader: graderUsage },
    results,
  });

  console.log(
    `\n${passed}/${results.length} passed (${Math.round(snapshot.passRate * 100)}%), $${snapshot.cost.usd.toFixed(4)}`,
  );
  if (only) {
    console.log("Partial run (--only): not saved.");
    return;
  }
  const stamp = date.toISOString().slice(0, 19).replaceAll(":", "");
  const out = path.join(evalsDir, "snapshots", `${stamp}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(snapshot, null, 2) + "\n", { flag: "wx" });
  console.log(`Wrote ${path.relative(process.cwd(), out)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
