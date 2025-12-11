// next.config.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Ensure the workspace root is this admin app so public/* assets resolve
    root: __dirname,
  },
  // Keep webpack/file tracing scoped to this package to avoid monorepo root confusion on Vercel
  outputFileTracingRoot: __dirname,
  trailingSlash: false,
};

export default nextConfig;
