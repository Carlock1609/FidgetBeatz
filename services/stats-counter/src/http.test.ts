import { describe, expect, it, vi } from "vitest";
import { Counter } from "./counter";
import { handleRequest, hashIp, parseAllowedOrigins, type CounterBackend } from "./http";

const ORIGIN = "https://fidgetbeatz.example";
const TAB = "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const allowed = parseAllowedOrigins(`${ORIGIN}/, http://localhost:3000`);

/** A backend over a real Counter with a fixed clock, like the Durable Object minus storage. */
function backend(counter = new Counter()): CounterBackend {
  return {
    visit: async (tab, ip) => counter.visit(tab, ip, 0),
    heartbeat: async (tab, ip) => counter.heartbeat(tab, ip, 0),
  };
}

function post(path: string, body: unknown, origin: string | null = ORIGIN): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (origin) headers.origin = origin;
  return new Request(`https://stats.example${path}`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("parseAllowedOrigins", () => {
  it("trims entries and trailing slashes and drops empties", () => {
    expect([...parseAllowedOrigins(" https://a.example/ ,, http://localhost:3000")]).toEqual([
      "https://a.example",
      "http://localhost:3000",
    ]);
    expect(parseAllowedOrigins(undefined).size).toBe(0);
  });
});

describe("handleRequest", () => {
  it("POST /visit returns { now, visits } with CORS for the origin", async () => {
    const res = await handleRequest(post("/visit", { tab: TAB }), allowed, backend(), "1.2.3.4");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ now: 1, visits: 1 });
    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("vary")).toBe("Origin");
  });

  it("POST /heartbeat marks the tab active without counting a visit", async () => {
    const res = await handleRequest(post("/heartbeat", { tab: TAB }), allowed, backend(), "ip");
    expect(await res.json()).toEqual({ now: 1, visits: 0 });
  });

  it("answers preflight without touching the counter", async () => {
    const b = backend();
    const spy = vi.spyOn(b, "visit");
    const req = new Request("https://stats.example/visit", {
      method: "OPTIONS",
      headers: { origin: ORIGIN, "access-control-request-method": "POST" },
    });
    const res = await handleRequest(req, allowed, b, "ip");
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    expect(res.headers.get("access-control-allow-headers")).toBe("content-type");
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects missing or unknown origins with 403 and no CORS header", async () => {
    for (const origin of [null, "https://evil.example"]) {
      const res = await handleRequest(
        post("/visit", { tab: TAB }, origin),
        allowed,
        backend(),
        "ip",
      );
      expect(res.status).toBe(403);
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    }
  });

  it("returns 404 for unknown paths and 405 for other methods", async () => {
    expect(
      (await handleRequest(post("/reset", { tab: TAB }), allowed, backend(), "ip")).status,
    ).toBe(404);
    const get = new Request("https://stats.example/visit", { headers: { origin: ORIGIN } });
    expect((await handleRequest(get, allowed, backend(), "ip")).status).toBe(405);
  });

  it("returns 400 for bad bodies", async () => {
    for (const body of ["not json", { tab: "x" }, {}, { tab: TAB, pad: "x".repeat(300) }]) {
      const res = await handleRequest(post("/visit", body), allowed, backend(), "ip");
      expect(res.status).toBe(400);
    }
  });

  it("returns 429 when the IP is over budget, still with CORS", async () => {
    const b = backend(new Counter(0, { maxRequestsPerWindow: 1 }));
    await handleRequest(post("/visit", { tab: TAB }), allowed, b, "ip");
    const res = await handleRequest(post("/heartbeat", { tab: TAB }), allowed, b, "ip");
    expect(res.status).toBe(429);
    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
  });

  it("accepts a trailing slash on the route", async () => {
    const res = await handleRequest(post("/visit/", { tab: TAB }), allowed, backend(), "ip");
    expect(res.status).toBe(200);
  });
});

describe("hashIp", () => {
  it("is stable per salt, differs across salts, and doesn't contain the IP", async () => {
    const a = await hashIp("203.0.113.7", "salt-1");
    expect(a).toMatch(/^[0-9a-f]{24}$/);
    expect(await hashIp("203.0.113.7", "salt-1")).toBe(a);
    expect(await hashIp("203.0.113.7", "salt-2")).not.toBe(a);
    expect(a).not.toContain("203");
  });
});
