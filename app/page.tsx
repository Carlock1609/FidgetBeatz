import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SoundboardApp } from "@/components/soundboard/soundboard-app";
import { latestChangelogEntry } from "@/lib/utils/changelog";

/**
 * The only route. A Server Component that runs at build time (static export): it reads the
 * changelog for the version sheet and hands off to the client app.
 */
export default async function Page() {
  const changelog = await readFile(join(process.cwd(), "CHANGELOG.md"), "utf8").catch(() => "");
  return <SoundboardApp whatsNew={latestChangelogEntry(changelog)} />;
}
