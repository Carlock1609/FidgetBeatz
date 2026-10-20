"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { BUILD_INFO } from "@/lib/utils/changelog";

/** Version, build date, "What's new" (from CHANGELOG.md) and sound credits. */
export function VersionSheet({
  open,
  onOpenChange,
  whatsNew,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  whatsNew: string[];
}) {
  const built = BUILD_INFO.builtAt
    ? new Date(BUILD_INFO.builtAt).toLocaleDateString("en-US", { dateStyle: "medium" })
    : "unknown";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={`FidgetBeatz v${BUILD_INFO.version}`}
        description="When you fidget, make a beat."
      >
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
          <dt className="text-muted">Version</dt>
          <dd>
            {BUILD_INFO.version}
            {BUILD_INFO.commit && <span className="text-muted"> · {BUILD_INFO.commit}</span>}
          </dd>
          <dt className="text-muted">Built</dt>
          <dd>{built}</dd>
        </dl>
        {whatsNew.length > 0 && (
          <section className="mt-5">
            <h3 className="mb-2 text-sm font-semibold">What’s new</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted marker:text-accent">
              {whatsNew.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}
        <section className="mt-5 space-y-1.5 border-t border-border pt-4 text-xs text-muted">
          <p>
            All sounds are synthesized by the FidgetBeatz project and released under CC0 1.0 — no
            samples from third parties.
          </p>
          <p>Visits are counted anonymously. No accounts, no tracking cookies.</p>
        </section>
      </DialogContent>
    </Dialog>
  );
}
