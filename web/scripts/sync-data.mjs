// Copies the precomputed prototype data (pipeline/data/export) into the app.
// The app never computes scores; it only reads these files.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "..", "pipeline", "data", "export");
const dest = join(here, "..", "src", "data");

if (!existsSync(src)) {
  if (existsSync(join(dest, "manifest.json"))) {
    console.log("sync-data: pipeline export not found, using committed copy in src/data");
    process.exit(0);
  }
  console.error("sync-data: run `python -m prism_pipeline.analytics.run` in pipeline/ first");
  process.exit(1);
}
mkdirSync(dest, { recursive: true });
const files = readdirSync(src).filter((f) => f.endsWith(".json"));
for (const f of files) copyFileSync(join(src, f), join(dest, f));
console.log(`sync-data: ${files.length} files -> src/data`);
