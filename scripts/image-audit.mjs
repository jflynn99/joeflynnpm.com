// Builds a local contact sheet of every blog and project image, so Joe can mark
// which ones go (see "Images" in CLAUDE.md for the art direction rule).
// Writes image-audit/index.html (open it straight from disk) and
// image-audit/checklist.md. Both are git-ignored and never deployed.
// Usage: node scripts/image-audit.mjs

import fs from "fs";
import path from "path";
import { collectImageEntries } from "../lib/imageAudit.ts";

const root = process.cwd();
const outDir = path.join(root, "image-audit");
const publicDir = path.join(root, "public");

const entries = collectImageEntries({
  blogDir: path.join(root, "content/blog"),
  projectsDir: path.join(root, "content/projects"),
  root,
});

const withStatus = entries.map((e) => ({
  ...e,
  status: !e.image ? "none" : fs.existsSync(path.join(publicDir, e.image)) ? "ok" : "missing",
}));

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Relative path from the sheet into public/, so thumbnails load from file://.
const thumb = (image) =>
  path
    .relative(outDir, path.join(publicDir, image))
    .split(path.sep)
    .map(encodeURIComponent)
    .join("/");

const groups = [
  { kind: "blog", heading: "Blog" },
  { kind: "project", heading: "Projects" },
];

function card(e) {
  const img =
    e.status === "ok"
      ? `<img src="${esc(thumb(e.image))}" alt="" loading="lazy">`
      : `<div class="gap">${e.status === "none" ? "No image: field" : "File missing on disk"}</div>`;
  return `<figure class="${e.status}">${img}<figcaption><strong>${esc(e.title)}</strong>
<span>${esc(e.date ?? "no date")}</span><code>${esc(e.file)}</code><code>${esc(e.image ?? "(none)")}</code></figcaption></figure>`;
}

const section = (heading, list) =>
  list.length ? `<h2>${esc(heading)} (${list.length})</h2><div class="grid">${list.map(card).join("\n")}</div>` : "";

let body = "";
for (const g of groups) {
  const ofKind = withStatus.filter((e) => e.kind === g.kind);
  body += section(g.heading, ofKind.filter((e) => e.status === "ok"));
}
body += section("No image: field", withStatus.filter((e) => e.status === "none"));
body += section("Image file missing on disk", withStatus.filter((e) => e.status === "missing"));

const html = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><title>Image audit</title>
<style>
body{font:14px system-ui,sans-serif;margin:24px;background:#faf9f7;color:#222}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
figure{margin:0;background:#fff;border:1px solid #ddd;border-radius:6px;overflow:hidden}
figure img{width:100%;height:150px;object-fit:cover;display:block;background:#eee}
.gap{height:150px;display:flex;align-items:center;justify-content:center;background:#fde8e8;color:#8a1c1c;font-weight:600}
figcaption{padding:8px;display:flex;flex-direction:column;gap:4px}
figcaption span{color:#666}
code{font-size:11px;word-break:break-all;color:#444}
</style></head><body>
<h1>Image audit</h1>
<p>${withStatus.length} entries. Rule: public-domain paintings, book covers, photos, screenshots, and share cards are fine; clearly AI-generated images are not, unless Joe chose one on purpose.</p>
${body}
</body></html>
`;

const line = (e) => {
  const date = e.date ? ` (${e.date})` : "";
  return `- [ ] ${e.title}${date}, \`${e.file}\`, \`${e.image}\``;
};
const mdSection = (heading, list, fmt = line) => (list.length ? `## ${heading}\n\n${list.map(fmt).join("\n")}\n\n` : "");

let md = "# Image audit checklist\n\n";
for (const g of groups) {
  md += mdSection(g.heading, withStatus.filter((e) => e.kind === g.kind && e.status === "ok"));
}
const noImage = (e) => `- ${e.title}${e.date ? ` (${e.date})` : ""}, \`${e.file}\``;
md += mdSection("No image: field", withStatus.filter((e) => e.status === "none"), noImage);
md += mdSection("Image file missing on disk", withStatus.filter((e) => e.status === "missing"), line);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "index.html"), html);
fs.writeFileSync(path.join(outDir, "checklist.md"), md.trimEnd() + "\n");

const count = (kind, status) => withStatus.filter((e) => e.kind === kind && (!status || e.status === status)).length;
console.log(
  `Blog: ${count("blog")}, Projects: ${count("project")}, ` +
    `no image: ${withStatus.filter((e) => e.status === "none").length}, ` +
    `missing file: ${withStatus.filter((e) => e.status === "missing").length}`,
);
console.log(`Sheet:     ${path.join(outDir, "index.html")}`);
console.log(`Checklist: ${path.join(outDir, "checklist.md")}`);
