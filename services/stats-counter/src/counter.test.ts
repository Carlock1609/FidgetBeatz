import { describe, expect, it } from "vitest";
import { Counter, isValidTabId } from "./counter";

const TAB_A = "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TAB_B = "22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TAB_C = "33333333-cccc-4ccc-8ccc-cccccccccccc";

function counts(result: ReturnType<Counter["visit"]>) {
  if (!result.ok) throw new Error("expected ok");
  return result.counts;
}

describe("Counter", () => {
  it("starts from the persisted visit total", () => {
    expect(new Counter(1284).counts(0)).toEqual({ now: 0, visits: 1284 });
  });

  it("counts a visit and marks the tab active", () => {
    const c = new Counter();
    const r = c.visit(TAB_A, "ip1", 0);
    expect(r).toEqual({ ok: true, visitCounted: true, counts: { now: 1, visits: 1 } });
  });

  it("counts distinct tabs, not requests", () => {
    const c = new Counter();
    c.visit(TAB_A, "ip1", 0);
    c.heartbeat(TAB_A, "ip1", 30_000);
    c.heartbeat(TAB_A, "ip1", 31_000);
    expect(counts(c.visit(TAB_B, "ip2", 32_000))).toEqual({ now: 2, visits: 2 });
  });

  it("drops a tab ~60 s after its last request", () => {
    const c = new Counter();
    c.visit(TAB_A, "ip1", 0);
    c.visit(TAB_B, "ip2", 0);
    c.heartbeat(TAB_A, "ip1", 30_000);
    expect(c.counts(59_999).now).toBe(2);
    // TAB_B never beat again; TAB_A beat at 30 s so it is still active.
    expect(c.counts(60_000).now).toBe(1);
    expect(c.counts(90_000).now).toBe(0);
  });

  it("keeps a tab alive across steady 30 s heartbeats", () => {
    const c = new Counter();
    c.visit(TAB_A, "ip1", 0);
    for (let t = 30_000; t <= 600_000; t += 30_000) {
      expect(counts(c.heartbeat(TAB_A, "ip1", t)).now).toBe(1);
    }
  });

  it("counts at most one visit per IP per minute but still marks the tab active", () => {
    const c = new Counter();
    c.visit(TAB_A, "ip1", 0);
    const second = c.visit(TAB_B, "ip1", 10_000);
    expect(second).toEqual({ ok: true, visitCounted: false, counts: { now: 2, visits: 1 } });
    expect(c.visit(TAB_C, "ip1", 60_000)).toMatchObject({ visitCounted: true });
    expect(c.counts(60_000).visits).toBe(2);
  });

  it("rate-limits each IP's total requests per window", () => {
    const c = new Counter(0, { maxRequestsPerWindow: 3 });
    expect(c.heartbeat(TAB_A, "ip1", 0).ok).toBe(true);
    expect(c.heartbeat(TAB_A, "ip1", 1).ok).toBe(true);
    expect(c.visit(TAB_A, "ip1", 2).ok).toBe(true);
    expect(c.heartbeat(TAB_B, "ip1", 3)).toEqual({ ok: false, reason: "rate-limited" });
    expect(c.visit(TAB_B, "ip1", 4)).toEqual({ ok: false, reason: "rate-limited" });
    // Other IPs are unaffected, and the budget refills after the window.
    expect(c.heartbeat(TAB_B, "ip2", 5).ok).toBe(true);
    expect(c.heartbeat(TAB_A, "ip1", 60_000).ok).toBe(true);
  });

  it("doesn't count or mark a tab when rate-limited", () => {
    const c = new Counter(0, { maxRequestsPerWindow: 1 });
    c.visit(TAB_A, "ip1", 0);
    c.visit(TAB_B, "ip1", 1);
    expect(c.counts(2)).toEqual({ now: 1, visits: 1 });
  });

  it("caps tracked tabs by evicting the least recently seen", () => {
    const c = new Counter(0, { maxTabs: 2 });
    c.heartbeat(TAB_A, "ip1", 0);
    c.heartbeat(TAB_B, "ip2", 1);
    c.heartbeat(TAB_A, "ip1", 2); // A is now the most recent
    c.heartbeat(TAB_C, "ip3", 3); // evicts B
    expect(c.counts(4).now).toBe(2);
    c.heartbeat(TAB_B, "ip2", 5); // B returns, evicts A (oldest)
    expect(c.counts(6).now).toBe(2);
  });

  it("forgets IP keys once their windows have passed", () => {
    const c = new Counter(0, { maxRequestsPerWindow: 1, maxIpKeys: 1 });
    c.heartbeat(TAB_A, "ip1", 0);
    // ip2 evicts ip1 at the cap, so ip1 gets a fresh budget — bounded memory beats precision.
    c.heartbeat(TAB_B, "ip2", 1);
    expect(c.heartbeat(TAB_A, "ip1", 2).ok).toBe(true);
  });
});

describe("isValidTabId", () => {
  it("accepts UUIDs and the id- fallback from lib/utils/ids.ts", () => {
    expect(isValidTabId(TAB_A)).toBe(true);
    expect(isValidTabId("id-m1abc2d-x9y8z7w6")).toBe(true);
  });

  it("rejects non-strings, short, long and odd-character ids", () => {
    for (const bad of [
      undefined,
      42,
      "",
      "short",
      "x".repeat(65),
      "has spaces in it",
      "<script>x",
    ]) {
      expect(isValidTabId(bad)).toBe(false);
    }
  });
});
