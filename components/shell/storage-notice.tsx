"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { useBoardDispatch, useBoardState } from "@/features/soundboard/board-provider";
import type { StorageNotice as Notice } from "@/features/soundboard/board-reducer";

const MESSAGES: Record<Notice, string> = {
  recovered:
    "Some saved data couldn’t be read, so we repaired it. A backup copy was kept in this browser.",
  "newer-version":
    "Your boards were saved by a newer version of FidgetBeatz. Changes here won’t be saved.",
  "storage-unavailable": "This browser is blocking storage, so changes can’t be saved.",
  "save-failed": "Changes can’t be saved in this browser.",
};

/** One non-blocking, auto-dismissing notice about storage problems. */
export function StorageNotice() {
  const { storageNotice: notice } = useBoardState();
  const dispatch = useBoardDispatch();

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => dispatch({ type: "setStorageNotice", notice: null }), 9000);
    return () => clearTimeout(timer);
  }, [notice, dispatch]);

  if (!notice) return null;
  return (
    <div
      role="status"
      data-testid="storage-notice"
      className="fixed inset-x-4 bottom-[max(56px,calc(env(safe-area-inset-bottom)+48px))] z-30 mx-auto flex max-w-md items-start gap-3 rounded-control border border-border bg-surface-1 p-3 text-sm shadow-2xl"
    >
      <p className="flex-1">{MESSAGES[notice]}</p>
      <button
        type="button"
        onClick={() => dispatch({ type: "setStorageNotice", notice: null })}
        aria-label="Dismiss"
        className="-m-2 grid size-11 shrink-0 place-items-center text-muted outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-focus"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
