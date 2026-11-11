import { test } from "node:test";
import assert from "node:assert/strict";
import { getHomeVoices, getVoices, parseVoices } from "./voices.ts";

function voice(overrides: Record<string, unknown> = {}) {
  return {
    name: "Simon Willison",
    url: "https://simonwillison.net",
    group: "AI",
    home: true,
    tagline: "The clearest developer blog for non-developers.",
    ...overrides,
  };
}

test("a well-formed home Voice comes back as written", () => {
  const [parsed] = parseVoices([voice({ publication: "Weblog" })]);
  assert.equal(parsed.name, "Simon Willison");
  assert.equal(parsed.publication, "Weblog");
  assert.equal(parsed.tagline, "The clearest developer blog for non-developers.");
});

test("a home Voice without a tagline fails", () => {
  assert.throws(() => parseVoices([voice({ tagline: undefined })]), /tagline/);
});

test("a Voice off the home page does not need a tagline", () => {
  assert.equal(parseVoices([voice({ home: false, tagline: undefined })]).length, 1);
});

test("a Voice with no url fails", () => {
  assert.throws(() => parseVoices([voice({ url: undefined })]));
});

test("a Voice with a malformed url fails", () => {
  assert.throws(() => parseVoices([voice({ url: "simonwillison.net" })]));
  assert.throws(() => parseVoices([voice({ url: "http://simonwillison.net" })]));
});

test("a Voice in an unknown group fails", () => {
  assert.throws(() => parseVoices([voice({ group: "Misc" })]));
});

test("a Voice with an unknown key fails", () => {
  assert.throws(() => parseVoices([voice({ tagLine: "typo" })]));
});

test("content/voices.json is valid, with seven home Voices led by Zvi", () => {
  const all = getVoices();
  const home = getHomeVoices();
  assert.equal(all.length, 27);
  assert.equal(home.length, 7);
  assert.equal(home[0].name, "Zvi Mowshowitz");
  assert.equal(home[6].name, "Kevin Kelly");
});
