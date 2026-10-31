/**
 * FidgetBeatz stats counter — a Cloudflare Worker plus one SQLite-backed Durable Object
 * (ADR 0006, docs/api.md).
 *
 * The Worker answers CORS preflights and validates requests itself, so only real visits and
 * heartbeats reach the single global `StatsCounter` object. That object keeps active tabs and
 * rate-limit state in memory and persists one number: the visit total.
 */
import { DurableObject } from "cloudflare:workers";
import { Counter, type CounterResult } from "./counter";
import { handleRequest, hashIp, parseAllowedOrigins } from "./http";

export interface Env {
  STATS_COUNTER: DurableObjectNamespace<StatsCounter>;
  /** Comma-separated exact origins allowed to call the service, e.g. the app's production URL. */
  ALLOWED_ORIGINS: string;
}

const VISITS_KEY = "visits";

/** The one global counter. Presence resets if the object is evicted; the visit total doesn't. */
export class StatsCounter extends DurableObject<Env> {
  private counter = new Counter();
  // Random per instance and never stored: IP hashes can't be linked across restarts.
  private readonly salt = crypto.randomUUID();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      this.counter = new Counter((await ctx.storage.get<number>(VISITS_KEY)) ?? 0);
    });
  }

  /** RPC for `POST /visit`. */
  async visit(tab: string, ip: string): Promise<CounterResult> {
    const result = this.counter.visit(tab, await hashIp(ip, this.salt), Date.now());
    if (result.ok && result.visitCounted) {
      await this.ctx.storage.put(VISITS_KEY, result.counts.visits);
    }
    return result;
  }

  /** RPC for `POST /heartbeat`. */
  async heartbeat(tab: string, ip: string): Promise<CounterResult> {
    return this.counter.heartbeat(tab, await hashIp(ip, this.salt), Date.now());
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const stub = env.STATS_COUNTER.get(env.STATS_COUNTER.idFromName("global"));
    // CF-Connecting-IP is set by Cloudflare; the fallback only matters under local dev.
    const ip = request.headers.get("cf-connecting-ip") ?? "local";
    return handleRequest(request, parseAllowedOrigins(env.ALLOWED_ORIGINS), stub, ip);
  },
} satisfies ExportedHandler<Env>;
