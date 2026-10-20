/**
 * Visitor stats client (ADR 0006). The app's only external runtime dependency, so it is
 * strictly best-effort: it starts after first paint, never touches the audio path, and falls
 * back to an offline state on any failure. Contract: docs/api.md.
 *
 *   POST {base}/visit       once per page load       → { visits, now }
 *   POST {base}/heartbeat   every ~30 s while visible → { visits, now }
 *
 * The heartbeat body carries a random per-tab id (kept in memory only) so the counter can
 * count distinct active tabs. No cookies, no personal data.
 */
import { createId } from "@/lib/utils/ids";

export type StatsStatus = "loading" | "live" | "offline";

export interface StatsSnapshot {
  status: StatsStatus;
  /** Visitors active in roughly the last 60 s. */
  now: number | null;
  /** Total page visits. */
  visits: number | null;
}

export interface StatsClientOptions {
  /** Base URL; empty disables the client (permanently offline). */
  baseUrl: string;
  fetchFn?: typeof fetch;
  heartbeatMs?: number;
  maxBackoffMs?: number;
  /** Visibility source, injectable for tests. */
  isVisible?: () => boolean;
}

const OFFLINE: StatsSnapshot = { status: "offline", now: null, visits: null };

function parseCounts(data: unknown): { now: number; visits: number } | null {
  if (!data || typeof data !== "object") return null;
  const { now, visits } = data as Record<string, unknown>;
  const valid = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;
  return valid(now) && valid(visits) ? { now: Math.round(now), visits: Math.round(visits) } : null;
}

/** Polls the stats endpoint and publishes snapshots to subscribers. */
export class StatsClient {
  private snapshot: StatsSnapshot;
  private listeners = new Set<(s: StatsSnapshot) => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private failures = 0;
  private visitSent = false;
  private running = false;
  private readonly tabId = createId();
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly heartbeatMs: number;
  private readonly maxBackoffMs: number;
  private readonly isVisible: () => boolean;

  constructor(options: StatsClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.fetchFn = options.fetchFn ?? ((...args) => fetch(...args));
    this.heartbeatMs = options.heartbeatMs ?? 30_000;
    this.maxBackoffMs = options.maxBackoffMs ?? 5 * 60_000;
    this.isVisible =
      options.isVisible ?? (() => typeof document === "undefined" || !document.hidden);
    this.snapshot = this.baseUrl ? { status: "loading", now: null, visits: null } : OFFLINE;
  }

  /** Latest snapshot (stable reference between updates, for useSyncExternalStore). */
  getSnapshot = (): StatsSnapshot => this.snapshot;

  /** Subscribes to snapshot changes; returns an unsubscribe function. */
  subscribe = (listener: (s: StatsSnapshot) => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Sends the page visit and starts heartbeats. No-op when disabled or already running. */
  start(): void {
    if (!this.baseUrl || this.running) return;
    this.running = true;
    void this.tick();
  }

  /** Stops heartbeats (e.g. when the page is hidden). `start()` resumes them. */
  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (!this.running) return;
    if (!this.isVisible()) {
      this.stop();
      return;
    }
    const path = this.visitSent ? "heartbeat" : "visit";
    try {
      const res = await this.fetchFn(`${this.baseUrl}/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tab: this.tabId }),
        // Never send cookies to the third-party counter.
        credentials: "omit",
      });
      const counts = res.ok ? parseCounts(await res.json()) : null;
      if (!counts) throw new Error("bad response");
      this.visitSent = true;
      this.failures = 0;
      this.publish({ status: "live", ...counts });
      this.schedule(this.heartbeatMs);
    } catch {
      // Retry with exponential backoff; stay quiet in the console.
      this.failures++;
      this.publish(OFFLINE);
      this.schedule(Math.min(this.maxBackoffMs, this.heartbeatMs * 2 ** (this.failures - 1)));
    }
  }

  private schedule(delay: number): void {
    if (!this.running) return;
    this.timer = setTimeout(() => void this.tick(), delay);
  }

  private publish(next: StatsSnapshot): void {
    const prev = this.snapshot;
    if (prev.status === next.status && prev.now === next.now && prev.visits === next.visits) return;
    this.snapshot = next;
    for (const listener of this.listeners) listener(next);
  }
}

/**
 * Formats a count for the footer: `1,284` below 10K, then compact (`12.4K`, `3.4M`).
 */
export function formatCount(value: number): string {
  if (value < 10_000) return value.toLocaleString("en-US");
  if (value < 1_000_000) return `${trimZero(value / 1000)}K`;
  return `${trimZero(value / 1_000_000)}M`;
}

function trimZero(n: number): string {
  return (Math.floor(n * 10) / 10).toFixed(1).replace(/\.0$/, "");
}
