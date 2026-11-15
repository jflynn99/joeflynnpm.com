// Saved example runs of the decision agent, shown on /agent so a visitor can
// see what it does without spending one of their daily queries. Each file in
// content/agent-examples/ is one real run, captured by
// scripts/capture-agent-example.ts and never edited by hand.

import fs from "fs";
import path from "path";
import { z } from "zod";

const priceSchema = z.strictObject({
  /** US dollars per million tokens, as published on the capture date. */
  input: z.number().nonnegative(),
  output: z.number().nonnegative(),
  cacheRead: z.number().nonnegative(),
  cacheWrite: z.number().nonnegative(),
});

const usageSchema = z.strictObject({
  /** Input tokens at full price (not read from or written to the cache). */
  inputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  cacheWriteTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
});

export type ExamplePrice = z.infer<typeof priceSchema>;
export type ExampleUsage = z.infer<typeof usageSchema>;

const stepSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("text"), text: z.string().min(1) }),
  z.strictObject({
    type: z.literal("tool"),
    tool: z.enum(["web_search", "web_fetch", "note"]),
    input: z.record(z.string(), z.unknown()),
    /** A short summary of what the tool returned. */
    result: z.string(),
  }),
]);

export type ExampleStep = z.infer<typeof stepSchema>;

/** Dollar cost of the usage at the stored price. */
export function costOf(usage: ExampleUsage, price: ExamplePrice): number {
  return (
    (usage.inputTokens * price.input +
      usage.cacheReadTokens * price.cacheRead +
      usage.cacheWriteTokens * price.cacheWrite +
      usage.outputTokens * price.output) /
    1_000_000
  );
}

export const agentExampleSchema = z
  .strictObject({
    brief: z.string().min(1),
    capturedAt: z.iso.datetime(),
    model: z.string().min(1),
    price: priceSchema,
    usage: usageSchema,
    /** US dollars, to six places: always usage times price. */
    cost: z.number().nonnegative(),
    steps: z.array(stepSchema).min(1),
    answer: z.string().min(1),
  })
  .refine((ex) => Math.abs(ex.cost - costOf(ex.usage, ex.price)) < 0.000_001, {
    message: "cost must equal the usage times the stored price",
    path: ["cost"],
  });

export type AgentExample = z.infer<typeof agentExampleSchema> & { slug: string };

/** Validate one example file. Throws, naming the file, on anything wrong. */
export function parseAgentExample(slug: string, raw: unknown): AgentExample {
  const result = agentExampleSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Agent example "${slug}" is malformed: ${z.prettifyError(result.error)}`);
  }
  return { slug, ...result.data };
}

const examplesDirectory = path.join(process.cwd(), "content/agent-examples");

/** Every saved example, oldest capture first. A bad file fails the build. */
export function getAgentExamples(): AgentExample[] {
  if (!fs.existsSync(examplesDirectory)) return [];
  return fs
    .readdirSync(examplesDirectory)
    .filter((file) => file.endsWith(".json"))
    .map((file) =>
      parseAgentExample(
        file.replace(/\.json$/, ""),
        JSON.parse(fs.readFileSync(path.join(examplesDirectory, file), "utf8")),
      ),
    )
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}
