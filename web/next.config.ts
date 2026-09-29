import path from "node:path";
import type { NextConfig } from "next";

// Static export: the prototype is plain HTML/JS + local JSON, deployable anywhere.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  // Optional sub-path hosting (e.g. GitHub Pages project site): PAGES_BASE_PATH=/repo-name npm run build
  basePath: process.env.PAGES_BASE_PATH || undefined,
};

export default nextConfig;
