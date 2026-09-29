// Minimal static server for the exported site (no dependencies): node scripts/serve.mjs [port]
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../out", import.meta.url));
const PORT = Number(process.argv[2] ?? 4173);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain" };

if (!existsSync(ROOT)) {
  console.error("serve: run `npm run build` first");
  process.exit(1);
}
createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = normalize(join(ROOT, url));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) file = join(ROOT, "404.html");
  res.writeHead(file.endsWith("404.html") && !url.endsWith("404.html") ? 404 : 200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`PAIMANA-PRISM prototype: http://localhost:${PORT}`));
