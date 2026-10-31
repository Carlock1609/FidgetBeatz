import { execSync } from "node:child_process";
import type { NextConfig } from "next";
import pkg from "./package.json";

/**
 * Short git commit for the version sheet. Prefers the commit Vercel reports for the build, then
 * local git; empty when neither is available (e.g. a tarball build).
 */
function readCommit(): string {
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (vercelSha) return vercelSha.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  // Phase 1 has no server code: the app must stay deployable to any static host (ADR 0002).
  output: "export",
  // Version/build info is baked in at build time (ADR 0006). Explicit env vars win so tests can override.
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || pkg.version,
    NEXT_PUBLIC_APP_COMMIT: process.env.NEXT_PUBLIC_APP_COMMIT ?? readCommit(),
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString(),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
