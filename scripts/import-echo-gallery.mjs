// Import one Answer Set into content/echo-gallery.json from the JSONL that
// my-llm's scripts/save_generations.py writes. Answers are copied byte for
// byte: nothing is trimmed, tidied, or re-wrapped.
//
//   node scripts/import-echo-gallery.mjs <answers.jsonl> --label before \
//     --date 2026-11-15 --model "nanochat d24, chat checkpoint step 466" --device "a laptop CPU"
//
// Importing a label that already exists replaces that set. The "before" set
// can never be regenerated once Echo is post-trained, so replacing it needs
// --replace-before.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const galleryFile = path.join(root, "content/echo-gallery.json");

const [, , input, ...rest] = process.argv;
const flags = {};
for (let i = 0; i < rest.length; i += 1) {
  if (rest[i] === "--replace-before") flags.replaceBefore = true;
  else if (rest[i].startsWith("--")) flags[rest[i].slice(2)] = rest[++i];
}
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (!input || !flags.label || !flags.date || !flags.model || !flags.device) {
  fail("usage: node scripts/import-echo-gallery.mjs <answers.jsonl> --label before|after --date YYYY-MM-DD --model <text> --device <text>");
}
if (!["before", "after"].includes(flags.label)) fail("--label must be before or after");
if (!/^\d{4}-\d{2}-\d{2}$/.test(flags.date)) fail("--date must be an ISO date like 2026-11-15");

const rows = fs
  .readFileSync(input, "utf8")
  .split("\n")
  .filter((line) => line.trim() !== "")
  .map((line) => JSON.parse(line));
if (rows.length === 0) fail("no rows in the input");

// One setting for the whole set, or it is not a fair comparison.
const settingsOf = (row) => JSON.stringify([row.temperature, row.top_k, row.max_tokens, row.seed]);
if (new Set(rows.map(settingsOf)).size !== 1) fail("rows were generated with different settings; refusing to mix them");

const set = {
  label: flags.label,
  date: flags.date,
  model: flags.model,
  settings: {
    temperature: rows[0].temperature,
    topK: rows[0].top_k,
    maxTokens: rows[0].max_tokens,
    seed: rows[0].seed,
    device: flags.device,
  },
  answers: rows.map((row) => ({
    id: row.id,
    prompt: row.prompt,
    answer: row.response,
    cutOff: row.finished === false,
  })),
};

const gallery = fs.existsSync(galleryFile) ? JSON.parse(fs.readFileSync(galleryFile, "utf8")) : { sets: [] };
const existing = gallery.sets.findIndex((s) => s.label === set.label);
if (existing >= 0 && set.label === "before" && !flags.replaceBefore) {
  fail("a before set already exists and cannot be regenerated after post-training. Pass --replace-before if you mean it.");
}
if (existing >= 0) gallery.sets[existing] = set;
else gallery.sets.push(set);
gallery.sets.sort((a, b) => (a.label === "before" ? -1 : 1) - (b.label === "before" ? -1 : 1));

fs.writeFileSync(galleryFile, `${JSON.stringify(gallery, null, 2)}\n`);
console.log(`wrote ${set.answers.length} ${set.label} answers to content/echo-gallery.json (${set.answers.filter((a) => a.cutOff).length} cut off at the token limit)`);
