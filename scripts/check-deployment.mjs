/**
 * Checks production hosting and the stats contract without incrementing page visits.
 * The heartbeat briefly registers a synthetic visitor; it expires normally.
 * Run after a Worker deploy and Vercel rebuild: node scripts/check-deployment.mjs.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const site = "https://fidgetbeatz.com";
const stats = "https://stats.fidgetbeatz.com";

/** Fetches with a bounded timeout so deployment checks cannot hang indefinitely. */
function request(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(15_000) });
}

try {
  const page = await request(site);
  assert.equal(page.status, 200, "apex site must return HTTP 200");
  const html = await page.text();
  assert.match(html, /FidgetBeatz/, "site must contain the app title");
  console.log("PASS: app responds over HTTPS");

  const www = await request("https://www.fidgetbeatz.com", { redirect: "manual" });
  assert.equal(www.status, 308, "www must permanently redirect");
  assert.equal(new URL(www.headers.get("location"), www.url).href, `${site}/`);
  console.log("PASS: www redirects to the apex site");

  const heartbeat = await request(`${stats}/heartbeat`, {
    method: "POST",
    headers: { origin: site, "content-type": "application/json" },
    body: JSON.stringify({ tab: randomUUID() }),
  });
  assert.equal(heartbeat.status, 200, "production heartbeat must succeed");
  assert.equal(heartbeat.headers.get("access-control-allow-origin"), site);
  const counts = await heartbeat.json();
  for (const key of ["now", "visits"]) {
    assert.ok(Number.isSafeInteger(counts[key]) && counts[key] >= 0, `${key} must be a count`);
  }
  console.log("PASS: stats heartbeat and production CORS contract");

  const blocked = await request(`${stats}/heartbeat`, {
    method: "POST",
    headers: { origin: "http://localhost:3000", "content-type": "application/json" },
    body: JSON.stringify({ tab: randomUUID() }),
  });
  assert.equal(blocked.status, 403, "production must reject the local dev origin");
  console.log("PASS: production rejects localhost");

  // Public endpoint configuration is baked into the static JS, not the server environment.
  const sources = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]))];
  assert.ok(sources.length > 0, "site must load application scripts");
  let connected = false;
  for (const source of sources) {
    const url = new URL(source.replaceAll("&amp;", "&"), site);
    assert.equal(url.origin, site, "only inspect same-origin application scripts");
    const response = await request(url);
    assert.equal(response.status, 200, "application scripts must load");
    if ((await response.text()).includes(stats)) connected = true;
  }
  assert.ok(connected, "production JS must include the stats URL; set the env var and rebuild");
  console.log("PASS: production frontend includes the stats endpoint");
} catch (error) {
  console.error(`FAIL: ${error.message}${error.cause ? ` (${error.cause.message})` : ""}`);
  process.exitCode = 1;
}
