/**
 * Pure counter logic for the FidgetBeatz stats service (ADR 0006, docs/api.md). No Cloudflare
 * APIs here, so it runs and is unit-tested in plain Node; `index.ts` wires it into a Durable
 * Object.
 *
 * Everything except the visit total lives in memory only: active tab ids and per-IP rate-limit
 * keys are dropped when they expire or when the Durable Object is evicted. Nothing personal is
 * persisted.
 */

export interface CounterOptions {
  /** A tab counts as "now" for this long after its last request. */
  activeWindowMs?: number;
  /** At most one counted visit per IP key in this window; extra visits are accepted but not counted. */
  visitWindowMs?: number;
  /** Request budget per IP key per `requestWindowMs`, across both endpoints. */
  maxRequestsPerWindow?: number;
  requestWindowMs?: number;
  /** Cap on tracked tabs, so a flood of fake tab ids can't grow memory without bound. */
  maxTabs?: number;
  /** Cap on tracked IP keys, for the same reason. */
  maxIpKeys?: number;
}

export interface Counts {
  now: number;
  visits: number;
}

export type CounterResult =
  { ok: true; counts: Counts; visitCounted: boolean } | { ok: false; reason: "rate-limited" };

interface IpState {
  windowStart: number;
  requests: number;
  lastCountedVisit: number | null;
}

const DEFAULTS: Required<CounterOptions> = {
  activeWindowMs: 60_000,
  visitWindowMs: 60_000,
  maxRequestsPerWindow: 60,
  requestWindowMs: 60_000,
  maxTabs: 50_000,
  maxIpKeys: 50_000,
};

/** Tab ids are client-generated UUIDs (or the `id-…` fallback); anything else is rejected. */
const TAB_ID = /^[A-Za-z0-9_-]{8,64}$/;

/** Returns true when `tab` looks like an id from `lib/utils/ids.ts`. */
export function isValidTabId(tab: unknown): tab is string {
  return typeof tab === "string" && TAB_ID.test(tab);
}

/**
 * Presence + visit counter. `now` is the number of distinct tab ids seen within the active
 * window; `visits` is the persisted total, loaded once via the constructor.
 */
export class Counter {
  private readonly opts: Required<CounterOptions>;
  private readonly tabs = new Map<string, number>();
  private readonly ips = new Map<string, IpState>();
  private visits: number;
  private lastPrune = 0;

  constructor(initialVisits = 0, options: CounterOptions = {}) {
    this.opts = { ...DEFAULTS, ...options };
    this.visits = Math.max(0, Math.floor(initialVisits));
  }

  /** Handles `POST /visit`: counts the visit (rate-limited per IP) and marks the tab active. */
  visit(tab: string, ipKey: string, nowMs: number): CounterResult {
    const ip = this.admit(ipKey, nowMs);
    if (!ip) return { ok: false, reason: "rate-limited" };
    let visitCounted = false;
    if (ip.lastCountedVisit === null || nowMs - ip.lastCountedVisit >= this.opts.visitWindowMs) {
      ip.lastCountedVisit = nowMs;
      this.visits++;
      visitCounted = true;
    }
    this.touch(tab, nowMs);
    return { ok: true, counts: this.counts(nowMs), visitCounted };
  }

  /** Handles `POST /heartbeat`: marks the tab active. */
  heartbeat(tab: string, ipKey: string, nowMs: number): CounterResult {
    if (!this.admit(ipKey, nowMs)) return { ok: false, reason: "rate-limited" };
    this.touch(tab, nowMs);
    return { ok: true, counts: this.counts(nowMs), visitCounted: false };
  }

  /** Current counts, after dropping expired tabs. */
  counts(nowMs: number): Counts {
    this.prune(nowMs, true);
    return { now: this.tabs.size, visits: this.visits };
  }

  /** Applies the per-IP request budget; returns the IP's state, or null when over budget. */
  private admit(ipKey: string, nowMs: number): IpState | null {
    this.prune(nowMs, false);
    let ip = this.ips.get(ipKey);
    if (!ip) {
      if (this.ips.size >= this.opts.maxIpKeys) this.evictOldest(this.ips);
      ip = { windowStart: nowMs, requests: 0, lastCountedVisit: null };
      this.ips.set(ipKey, ip);
    }
    if (nowMs - ip.windowStart >= this.opts.requestWindowMs) {
      ip.windowStart = nowMs;
      ip.requests = 0;
    }
    if (ip.requests >= this.opts.maxRequestsPerWindow) return null;
    ip.requests++;
    return ip;
  }

  private touch(tab: string, nowMs: number): void {
    // Re-insert so Map order stays oldest-first, which keeps eviction O(1).
    this.tabs.delete(tab);
    if (this.tabs.size >= this.opts.maxTabs) this.evictOldest(this.tabs);
    this.tabs.set(tab, nowMs);
  }

  /**
   * Drops expired tabs and IP keys. Throttled to once a second unless `force`, so a busy
   * object doesn't rescan every request; `counts()` forces it so `now` is never stale.
   */
  private prune(nowMs: number, force: boolean): void {
    if (!force && nowMs - this.lastPrune < 1_000) return;
    this.lastPrune = nowMs;
    // Tabs are in last-seen order, so stop at the first one still active.
    for (const [tab, seen] of this.tabs) {
      if (nowMs - seen < this.opts.activeWindowMs) break;
      this.tabs.delete(tab);
    }
    const ipTtl = Math.max(this.opts.visitWindowMs, this.opts.requestWindowMs);
    for (const [key, ip] of this.ips) {
      const last = Math.max(ip.windowStart, ip.lastCountedVisit ?? 0);
      if (nowMs - last >= ipTtl) this.ips.delete(key);
    }
  }

  private evictOldest(map: Map<string, unknown>): void {
    const oldest = map.keys().next();
    if (!oldest.done) map.delete(oldest.value);
  }
}
