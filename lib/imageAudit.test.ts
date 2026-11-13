import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { collectImageEntries } from "./imageAudit.ts";

function fixture(files: Record<string, Record<string, string>>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "image-audit-"));
  const dirs: Record<string, string> = {};
  for (const [name, entries] of Object.entries(files)) {
    dirs[name] = path.join(root, name);
    fs.mkdirSync(dirs[name], { recursive: true });
    for (const [file, body] of Object.entries(entries)) {
      fs.writeFileSync(path.join(dirs[name], file), body);
    }
  }
  return { root, blogDir: dirs.blog, projectsDir: dirs.projects };
}

test("blog entries carry title, date, file, and image, newest first", () => {
  const { root, blogDir, projectsDir } = fixture({
    blog: {
      "old.mdx": '---\ntitle: "Old"\ndate: "2020-01-01"\nimage: "/images/blog/old.webp"\n---\nBody',
      "new.mdx": '---\ntitle: "New"\ndate: "2024-05-06"\nimage: "/images/blog/new.webp"\n---\nBody',
    },
    projects: {},
  });
  const entries = collectImageEntries({ blogDir, projectsDir, root });
  assert.deepEqual(entries, [
    { kind: "blog", title: "New", date: "2024-05-06", file: "blog/new.mdx", image: "/images/blog/new.webp" },
    { kind: "blog", title: "Old", date: "2020-01-01", file: "blog/old.mdx", image: "/images/blog/old.webp" },
  ]);
});

test("a file with no image is still listed, with image null", () => {
  const { root, blogDir, projectsDir } = fixture({
    blog: { "bare.mdx": '---\ntitle: "Bare"\ndate: "2024-01-01"\n---\nBody' },
    projects: {},
  });
  const [entry] = collectImageEntries({ blogDir, projectsDir, root });
  assert.equal(entry.image, null);
});

test("projects follow blog, ordered by `order`, and may have no date", () => {
  const { root, blogDir, projectsDir } = fixture({
    blog: {},
    projects: {
      "b.mdx": '---\ntitle: "B"\nimage: "/images/projects/b.png"\norder: 2\n---\n',
      "a.mdx": '---\ntitle: "A"\nimage: "/images/projects/a.png"\norder: 1\n---\n',
    },
  });
  const entries = collectImageEntries({ blogDir, projectsDir, root });
  assert.deepEqual(entries.map((e) => [e.kind, e.title, e.date]), [
    ["project", "A", null],
    ["project", "B", null],
  ]);
});

test("non-mdx files are ignored", () => {
  const { root, blogDir, projectsDir } = fixture({
    blog: { "notes.txt": "nope", "x.mdx": '---\ntitle: "X"\ndate: "2024-01-01"\n---\n' },
    projects: {},
  });
  assert.equal(collectImageEntries({ blogDir, projectsDir, root }).length, 1);
});

test("the real content yields one entry per file in both folders", () => {
  const root = process.cwd();
  const blogDir = path.join(root, "content/blog");
  const projectsDir = path.join(root, "content/projects");
  const count = (dir: string) => fs.readdirSync(dir).filter((f) => f.endsWith(".mdx")).length;
  const entries = collectImageEntries({ blogDir, projectsDir, root });
  assert.equal(entries.filter((e) => e.kind === "blog").length, count(blogDir));
  assert.equal(entries.filter((e) => e.kind === "project").length, count(projectsDir));
  assert.equal(new Set(entries.map((e) => e.file)).size, entries.length);
});
