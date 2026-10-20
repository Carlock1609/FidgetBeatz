/**
 * Extracts the bullet points of the newest entry in CHANGELOG.md (the first `## ` section).
 * Used at build time for the version sheet's "What's new" list.
 *
 * @example latestChangelogEntry("## [0.1.0]\n- First\n- Second") // → ["First", "Second"]
 */
export function latestChangelogEntry(markdown: string): string[] {
  const sections = markdown.split(/^## /m).slice(1);
  const latest = sections[0];
  if (!latest) return [];
  return latest
    .split("\n")
    .filter((line) => /^\s*[-*] /.test(line))
    .map((line) =>
      line
        .replace(/^\s*[-*] /, "")
        .replace(/\*\*/g, "")
        .trim(),
    )
    .filter(Boolean);
}

/** Build-time version info, baked in by next.config.ts (ADR 0006). */
export const BUILD_INFO = {
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
  commit: process.env.NEXT_PUBLIC_APP_COMMIT ?? "",
  builtAt: process.env.NEXT_PUBLIC_BUILD_DATE ?? "",
} as const;
