"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { StatsClient, type StatsSnapshot } from "@/lib/stats/stats-client";

const SERVER_SNAPSHOT: StatsSnapshot = { status: "loading", now: null, visits: null };

/**
 * Live visitor stats for the footer. The client starts after first paint (an idle callback),
 * pauses while the tab is hidden, and never affects anything else when it fails.
 */
export function useStats(): StatsSnapshot {
  const [client] = useState(
    () => new StatsClient({ baseUrl: process.env.NEXT_PUBLIC_STATS_URL ?? "" }),
  );

  useEffect(() => {
    const start = () => client.start();
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 2000 })
      : window.setTimeout(start, 500);
    const onVisibility = () => (document.hidden ? client.stop() : client.start());
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      document.removeEventListener("visibilitychange", onVisibility);
      client.stop();
    };
  }, [client]);

  return useSyncExternalStore(client.subscribe, client.getSnapshot, () => SERVER_SNAPSHOT);
}
