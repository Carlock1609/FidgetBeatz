/**
 * HTTP layer for the stats service: routing, CORS and request validation (docs/api.md). Uses
 * only web-standard Request/Response/crypto, so it is unit-tested in Node with a fake counter.
 */
import { isValidTabId, type CounterResult } from "./counter";

/** What the HTTP layer needs from the counter (the Durable Object stub in production). */
export interface CounterBackend {
  visit(tab: string, ip: string): Promise<CounterResult>;
  heartbeat(tab: string, ip: string): Promise<CounterResult>;
}

/** Bodies are `{ "tab": "<uuid>" }`; anything much bigger is not a real client. */
const MAX_BODY_BYTES = 256;

/**
 * Parses the comma-separated `ALLOWED_ORIGINS` variable. Entries are exact origins
 * (`https://fidgetbeatz.example`); a trailing slash is ignored.
 */
export function parseAllowedOrigins(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((s) => s.trim().replace(/\/+$/, ""))
      .filter(Boolean),
  );
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
}

async function readTab(request: Request): Promise<string | null> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    const { tab } = JSON.parse(text) as { tab?: unknown };
    return isValidTabId(tab) ? tab : null;
  } catch {
    return null;
  }
}

/**
 * Handles one request. Only browser calls from an allowed origin are served: requests with a
 * missing or unknown `Origin` get 403, which keeps casual scripted inflation out (the per-IP
 * limit in the counter handles the rest). `ip` is the client address from the platform
 * (`CF-Connecting-IP`); it is passed on for rate limiting and never stored or logged here.
 */
export async function handleRequest(
  request: Request,
  allowedOrigins: Set<string>,
  backend: CounterBackend,
  ip: string,
): Promise<Response> {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins.has(origin)) return json(403, { error: "origin not allowed" });
  const cors = corsHeaders(origin);

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const { pathname } = new URL(request.url);
  const route = pathname.replace(/\/+$/, "");
  if (route !== "/visit" && route !== "/heartbeat") return json(404, { error: "not found" }, cors);
  if (request.method !== "POST") {
    return json(405, { error: "method not allowed" }, { ...cors, allow: "POST, OPTIONS" });
  }

  const tab = await readTab(request);
  if (!tab) return json(400, { error: "expected { tab }" }, cors);

  const result =
    route === "/visit" ? await backend.visit(tab, ip) : await backend.heartbeat(tab, ip);
  if (!result.ok) return json(429, { error: "rate limited" }, { ...cors, "retry-after": "60" });
  return json(200, result.counts, cors);
}

/**
 * One-way hash of an IP with an in-memory salt, so rate-limit keys are not raw addresses. The
 * salt is random per Durable Object instance and never stored, so keys can't be reversed or
 * linked across restarts.
 */
export async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(digest.subarray(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}
