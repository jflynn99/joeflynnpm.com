import { test } from "node:test";
import assert from "node:assert/strict";
import {
  describeSettings,
  formatSetDate,
  galleryRows,
  getEchoGallery,
  parseEchoGallery,
} from "./echoGallery.ts";

function answerSet(overrides: Record<string, unknown> = {}) {
  return {
    label: "before",
    date: "2026-11-15",
    model: "nanochat d24, chat checkpoint step 466",
    settings: { temperature: 0.6, topK: 50, maxTokens: 256, seed: 42, device: "a laptop CPU" },
    answers: [
      { id: "g-01", prompt: "Who are you?", answer: "I'm an AI assistant.", cutOff: false },
      { id: "g-02", prompt: "Say nothing at all.", answer: "", cutOff: false },
    ],
    ...overrides,
  };
}

test("an answer comes back exactly as written, whitespace and all", () => {
  const raw = "  Line one,\n\nline two.  \n";
  const set = answerSet({
    answers: [{ id: "g-01", prompt: "Write a haiku.", answer: raw, cutOff: true }],
  });
  const gallery = parseEchoGallery({ sets: [set] });
  assert.equal(gallery.sets[0].answers[0].answer, raw);
  assert.equal(gallery.sets[0].answers[0].cutOff, true);
});

test("an empty answer is allowed, an empty prompt is not", () => {
  assert.equal(parseEchoGallery({ sets: [answerSet()] }).sets[0].answers[1].answer, "");
  const blank = answerSet({ answers: [{ id: "g-01", prompt: "", answer: "x", cutOff: false }] });
  assert.throws(() => parseEchoGallery({ sets: [blank] }));
});

test("a set with an unknown key, a bad date, or a bad label fails", () => {
  assert.throws(() => parseEchoGallery({ sets: [answerSet({ notes: "typo" })] }));
  assert.throws(() => parseEchoGallery({ sets: [answerSet({ date: "15 November 2026" })] }), /ISO date/);
  assert.throws(() => parseEchoGallery({ sets: [answerSet({ label: "during" })] }));
});

test("settings must be complete", () => {
  const settings = { temperature: 0.6, topK: 50, maxTokens: 256, seed: 42 };
  assert.throws(() => parseEchoGallery({ sets: [answerSet({ settings })] }));
});

test("duplicate answer ids fail", () => {
  const answers = [
    { id: "g-01", prompt: "One?", answer: "a", cutOff: false },
    { id: "g-01", prompt: "Two?", answer: "b", cutOff: false },
  ];
  assert.throws(() => parseEchoGallery({ sets: [answerSet({ answers })] }), /unique/);
});

test("the first set must be the before set, and labels cannot repeat", () => {
  assert.throws(() => parseEchoGallery({ sets: [answerSet({ label: "after" })] }), /before set/);
  assert.throws(() => parseEchoGallery({ sets: [answerSet(), answerSet()] }), /own label/);
});

test("an after set must answer the same prompts in the same order", () => {
  const after = answerSet({ label: "after", date: "2026-12-01" });
  assert.equal(parseEchoGallery({ sets: [answerSet(), after] }).sets.length, 2);

  const reordered = answerSet({ label: "after", answers: [...answerSet().answers].reverse() });
  assert.throws(() => parseEchoGallery({ sets: [answerSet(), reordered] }), /same prompts/);

  const reworded = answerSet({
    label: "after",
    answers: [
      { id: "g-01", prompt: "Who made you?", answer: "Joe.", cutOff: false },
      { id: "g-02", prompt: "Say nothing at all.", answer: "", cutOff: false },
    ],
  });
  assert.throws(() => parseEchoGallery({ sets: [answerSet(), reworded] }), /same prompts/);
});

test("rows pair each prompt with every set's answer", () => {
  const after = answerSet({
    label: "after",
    answers: [
      { id: "g-01", prompt: "Who are you?", answer: "Echo.", cutOff: false },
      { id: "g-02", prompt: "Say nothing at all.", answer: "No.", cutOff: false },
    ],
  });
  const rows = galleryRows(parseEchoGallery({ sets: [answerSet(), after] }));
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].answers.map((a) => [a.label, a.answer]), [
    ["before", "I'm an AI assistant."],
    ["after", "Echo."],
  ]);
});

test("the date and settings read as plain words", () => {
  assert.equal(formatSetDate("2026-11-15"), "15 November 2026");
  assert.equal(
    describeSettings(answerSet().settings as never),
    "temperature 0.6, top-k 50, up to 256 tokens, seed 42, on a laptop CPU",
  );
});

test("content/echo-gallery.json is valid: twenty before answers, one setting", () => {
  const gallery = getEchoGallery();
  assert.ok(gallery);
  const [before] = gallery.sets;
  assert.equal(before.label, "before");
  assert.equal(before.date, "2026-11-15");
  assert.equal(before.answers.length, 20);
  assert.equal(before.answers[0].prompt, "How many r's are in the word strawberry?");
  assert.equal(before.answers[19].prompt, "Say nothing at all.");
  // The before set was generated once and can never be regenerated.
  assert.equal(before.answers[0].answer, "The word \"strawberry\" has 4 letters: 2 'r's.");
});
