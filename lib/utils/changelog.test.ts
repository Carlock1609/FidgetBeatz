import { describe, expect, it } from "vitest";
import { latestChangelogEntry } from "./changelog";

describe("latestChangelogEntry", () => {
  it("returns bullets from the newest section only", () => {
    const md = "# Changelog\n\nIntro\n\n## [0.2.0]\n\n- **New** thing\n* Fix\n\n## [0.1.0]\n- Old";
    expect(latestChangelogEntry(md)).toEqual(["New thing", "Fix"]);
  });

  it("handles a changelog without entries", () => {
    expect(latestChangelogEntry("# Changelog")).toEqual([]);
  });
});
