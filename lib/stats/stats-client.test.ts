import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatCount, StatsClient } from "./stats-client";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe("StatsClient", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("is permanently offline without a base URL and never fetches", () => {
    const fetchFn = vi.fn();
    const client = new StatsClient({ baseUrl: "", fetchFn });
    client.start();
    expect(client.getSnapshot().status).toBe("offline");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("sends one visit, then heartbeats", async () => {
    const fetchFn = vi.fn(async () => ok({ now: 12, visits: 1284 }));
    const client = new StatsClient({
      baseUrl: "https://stats.test/",
      fetchFn,
      isVisible: () => true,
    });
    client.start();
    await vi.waitFor(() =>
      expect(client.getSnapshot()).toEqual({ status: "live", now: 12, visits: 1284 }),
    );
    await vi.advanceTimersByTimeAsync(30_000);
    await vi.advanceTimersByTimeAsync(30_000);
    const urls = fetchFn.mock.calls.map((call) => String((call as unknown[])[0]));
    expect(urls).toEqual([
      "https://stats.test/visit",
      "https://stats.test/heartbeat",
      "https://stats.test/heartbeat",
    ]);
    client.stop();
  });

  it("goes offline on failure and backs off, then recovers", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("blocked"))
      .mockResolvedValueOnce(ok({ nonsense: true }))
      .mockResolvedValue(ok({ now: 3, visits: 10 }));
    const client = new StatsClient({
      baseUrl: "https://stats.test",
      fetchFn,
      isVisible: () => true,
    });
    client.start();
    await vi.waitFor(() => expect(client.getSnapshot().status).toBe("offline"));
    await vi.advanceTimersByTimeAsync(30_000); // first retry → malformed → still offline
    expect(client.getSnapshot().status).toBe("offline");
    await vi.advanceTimersByTimeAsync(59_000); // second backoff is 60 s
    expect(fetchFn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.waitFor(() => expect(client.getSnapshot().status).toBe("live"));
    // The visit only counts once it succeeded.
    expect(String(fetchFn.mock.calls[2]![0])).toBe("https://stats.test/visit");
    client.stop();
  });

  it("stops heart-beating while hidden", async () => {
    let visible = true;
    const fetchFn = vi.fn(async () => ok({ now: 1, visits: 1 }));
    const client = new StatsClient({
      baseUrl: "https://s.test",
      fetchFn,
      isVisible: () => visible,
    });
    client.start();
    await vi.waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
    visible = false;
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe("formatCount", () => {
  it("formats plain and compact numbers", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(1284)).toBe("1,284");
    expect(formatCount(12_400)).toBe("12.4K");
    expect(formatCount(10_000)).toBe("10K");
    expect(formatCount(3_456_789)).toBe("3.4M");
  });
});
