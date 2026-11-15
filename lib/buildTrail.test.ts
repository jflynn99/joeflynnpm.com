import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { hasBuildTrail, parseBuildTrail } from "./buildTrail.ts";
import { getAllProjects } from "./projects.ts";

test("a full Build Trail comes back as written", () => {
  const trail = {
    prompt: "Build me a librarian.",
    plan: "Four steps.",
    model: "Claude Fable 5",
    prs: 3,
    cost: "$69",
    broke: [{ what: "The pod never stopped.", cost: "$88" }, { what: "Too slow." }],
  };
  assert.deepEqual(parseBuildTrail("echo", trail), trail);
});

test("every part is optional", () => {
  assert.deepEqual(parseBuildTrail("echo", { cost: "$69" }), { cost: "$69" });
  assert.equal(parseBuildTrail("echo", undefined), undefined);
});

test("an unknown key fails, naming the project", () => {
  assert.throws(() => parseBuildTrail("echo", { costs: "$69" }), /echo/);
});

test("an unknown key in a broke entry fails", () => {
  assert.throws(() => parseBuildTrail("echo", { broke: [{ what: "x", price: "$1" }] }));
});

test("a broke entry needs to say what broke", () => {
  assert.throws(() => parseBuildTrail("echo", { broke: [{ cost: "$1" }] }));
});

test("the number of pull requests is a positive whole number", () => {
  assert.throws(() => parseBuildTrail("echo", { prs: 0 }));
  assert.throws(() => parseBuildTrail("echo", { prs: 2.5 }));
  assert.throws(() => parseBuildTrail("echo", { prs: "3" }));
});

test("an empty trail has nothing to show", () => {
  assert.equal(hasBuildTrail(undefined), false);
  assert.equal(hasBuildTrail({}), false);
  assert.equal(hasBuildTrail({ model: "Opus" }), true);
});

test("every project in content/projects has a well-formed Build Trail or none", () => {
  const dir = path.join(process.cwd(), "content/projects");
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"))) {
    const { data } = matter(fs.readFileSync(path.join(dir, file), "utf8"));
    assert.doesNotThrow(() => parseBuildTrail(file, data.buildTrail), file);
  }
  assert.ok(getAllProjects().length > 0);
});
