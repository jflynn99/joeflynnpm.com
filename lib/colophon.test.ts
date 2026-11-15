import { test } from "node:test";
import assert from "node:assert/strict";
import { collectBroke, getColourTokens, getDecisions, parseColourTokens, parseDecision } from "./colophon.ts";

test("a decision's title is its first heading and its summary its first paragraph", () => {
  const d = parseDecision("0001-x.md", "# Use Fitbit\n\nWe chose Fitbit\nbecause it is there.\n\n## Consequences\n\n- More.");
  assert.equal(d.title, "Use Fitbit");
  assert.equal(d.summary, "We chose Fitbit because it is there.");
});

test("every ADR in docs/adr has a title and a summary", () => {
  const decisions = getDecisions();
  assert.ok(decisions.length > 0);
  for (const d of decisions) {
    assert.ok(d.title, d.file);
    assert.ok(d.summary, d.file);
  }
});

test("colour tokens pair each dark value with its light value, ignoring comments and non-colours", () => {
  const css = `:root {\n  --hue: 70; /* --fake: oklch(1 0 0); */\n  --accent: oklch(0.7 0.1 var(--hue));\n  --card: oklch(0.2 0 var(--hue));\n}\n\n:root.light {\n  --card: oklch(0.9 0 var(--hue));\n}\n`;
  assert.deepEqual(parseColourTokens(css), [
    { name: "--accent", dark: "oklch(0.7 0.1 var(--hue))" },
    { name: "--card", dark: "oklch(0.2 0 var(--hue))", light: "oklch(0.9 0 var(--hue))" },
  ]);
});

test("the site's palette includes the accent and the workout colours", () => {
  const names = getColourTokens().map((t) => t.name);
  assert.ok(names.includes("--accent"));
  assert.ok(names.includes("--workout-strength"));
});

test("a broke entry added to any project appears, linked to its project", () => {
  const projects = [
    { slug: "a", hasDetailPage: true, frontmatter: { title: "A", buildTrail: { broke: [{ what: "x", cost: "$1" }] } } },
    { slug: "b", hasDetailPage: true, frontmatter: { title: "B" } },
    { slug: "c", hasDetailPage: false, frontmatter: { title: "C", buildTrail: { broke: [{ what: "y" }] } } },
  ];
  assert.deepEqual(collectBroke(projects), [
    { what: "x", cost: "$1", project: { slug: "a", title: "A", href: "/projects/a" } },
    { what: "y", project: { slug: "c", title: "C" } },
  ]);
});
