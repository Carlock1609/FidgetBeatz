"use client";

import { useState } from "react";
import { useStats } from "@/hooks/use-stats";
import { BUILD_INFO } from "@/lib/utils/changelog";
import { formatCount } from "@/lib/stats/stats-client";
import { cn } from "@/lib/utils/cn";
import { VersionSheet } from "./version-sheet";

/** Footer: visitors now, total visits (or the offline state) and the version chip. */
export function AppFooter({ whatsNew }: { whatsNew: string[] }) {
  const stats = useStats();
  const [versionOpen, setVersionOpen] = useState(false);
  const live = stats.status === "live";
  const dash = stats.status === "loading" ? "…" : "—";

  return (
    <footer className="flex h-10 items-center justify-between gap-3 font-mono text-[11px] text-muted">
      <div
        className="flex min-w-0 items-center gap-3"
        aria-live="polite"
        data-testid="stats"
        data-status={stats.status}
      >
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className={cn(
              "size-2 rounded-full",
              live ? "bg-live shadow-[0_0_8px_var(--live)]" : "bg-muted/50",
            )}
            aria-hidden
          />
          {live && stats.now !== null ? formatCount(stats.now) : dash} jamming now
        </span>
        <span className="truncate whitespace-nowrap">
          {live && stats.visits !== null ? formatCount(stats.visits) : dash} visits
        </span>
      </div>
      <button
        type="button"
        onClick={() => setVersionOpen(true)}
        className="-my-1 inline-flex h-11 shrink-0 items-center outline-none focus-visible:[&>span]:ring-2 focus-visible:[&>span]:ring-focus"
        // The name contains the visible "v0.1.0" (WCAG 2.5.3 Label in Name).
        aria-label={`Version v${BUILD_INFO.version}, what's new`}
      >
        <span className="rounded-full border border-border px-2.5 py-0.5 text-text hover:border-muted">
          v{BUILD_INFO.version}
        </span>
      </button>
      <VersionSheet open={versionOpen} onOpenChange={setVersionOpen} whatsNew={whatsNew} />
    </footer>
  );
}
