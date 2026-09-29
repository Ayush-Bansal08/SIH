// Static-export QA: every internal link in out/ resolves to an exported page, and every
// page has exactly one <h1>, a <title>, lang="en-IN" and no "NaN"/"undefined" leaks.
// Run after `npm run build`: node scripts/qa/links.mjs
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../../out", import.meta.url));
if (!existsSync(OUT)) {
  console.error("links: run `npm run build` first");
  process.exit(1);
}

function* walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith(".html")) yield p;
  }
}

const resolves = (href) => {
  const path = href.split(/[?#]/)[0];
  if (path === "" || path === "/") return existsSync(join(OUT, "index.html"));
  const clean = path.replace(/^\//, "");
  return (
    existsSync(join(OUT, clean, "index.html")) ||
    existsSync(join(OUT, clean)) ||
    existsSync(join(OUT, `${clean.replace(/\/$/, "")}.html`))
  );
};

let pages = 0;
const problems = [];
const checked = new Set();
for (const file of walk(OUT)) {
  const rel = relative(OUT, file).split(sep).join("/");
  if (rel.startsWith("_next/")) continue;
  pages++;
  const html = readFileSync(file, "utf8");
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (rel !== "404.html" && rel !== "_not-found.html" && h1 !== 1) problems.push(`${rel}: ${h1} <h1> elements (expected 1)`);
  if (!/<title>[^<]+<\/title>/.test(html)) problems.push(`${rel}: missing <title>`);
  if (!/<html[^>]*lang="en-IN"/.test(html)) problems.push(`${rel}: missing lang="en-IN"`);
  const visible = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
  for (const bad of [/\bNaN\b/, /\bundefined\b/, /\bnull\b(?! *[,}\]])/, /\[object Object\]/]) {
    if (bad.test(visible)) problems.push(`${rel}: visible text contains ${bad}`);
  }
  for (const [, href] of html.matchAll(/<a[^>]+href="([^"]+)"/g)) {
    if (/^(https?:|mailto:|#)/.test(href)) continue;
    const key = href.split("#")[0];
    if (checked.has(key)) continue;
    checked.add(key);
    if (!resolves(href)) problems.push(`${rel}: broken link ${href}`);
  }
}

console.log(`links: ${pages} pages, ${checked.size} distinct internal links checked`);
if (problems.length) {
  console.error(problems.map((p) => `  FAIL ${p}`).join("\n"));
  process.exit(1);
}
console.log("links: all pages OK");
