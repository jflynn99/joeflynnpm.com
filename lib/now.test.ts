import { test } from "node:test";
import assert from "node:assert/strict";
import { formatUpdated, getNow, parseNow } from "./now.ts";

test("a well-formed /now file comes back with its date and text", () => {
  const now = parseNow('---\nupdated: "2026-11-11"\n---\n\nCoaching U7s.\n');
  assert.equal(now.updated, "2026-11-11");
  assert.match(now.content, /Coaching U7s/);
});

test("a /now file with no updated date fails", () => {
  assert.throws(() => parseNow("---\n---\n\nCoaching U7s.\n"));
});

test("a /now file whose updated date is not an ISO date fails", () => {
  assert.throws(() => parseNow('---\nupdated: "last week"\n---\n\nCoaching U7s.\n'));
});

test("a /now file with no text fails", () => {
  assert.throws(() => parseNow('---\nupdated: "2026-11-11"\n---\n\n'), /no text/);
});

test("the updated date reads as day, month, and year", () => {
  assert.equal(formatUpdated("2026-11-01"), "1 November 2026");
});

test("content/now.mdx is valid", () => {
  assert.doesNotThrow(() => getNow());
});
