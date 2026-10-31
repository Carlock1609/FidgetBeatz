import { defineConfig } from "vitest/config";

// The counter and HTTP logic use only web-standard APIs, so plain Node is enough;
// `index.ts` (the Cloudflare glue) is exercised with `wrangler dev` instead.
export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
