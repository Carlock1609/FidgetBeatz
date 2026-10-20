import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRESETS, DEFAULT_PRESET_ID, getPreset } from "@/data/presets";
import { LIMITS, SOUND_CATEGORIES } from "@/types";
import { getSound, SOUNDS } from "./catalog";

const root = join(__dirname, "../..");
const inventory = JSON.parse(readFileSync(join(root, "data/sounds/inventory.json"), "utf8")) as {
  assets: {
    id: string;
    displayName: string;
    category: string;
    file: string;
    license: { name: string };
    commercialUse: boolean;
    redistribution: boolean;
  }[];
};

describe("sound catalog ↔ inventory ↔ files", () => {
  it("has unique ids and valid categories", () => {
    expect(new Set(SOUNDS.map((s) => s.id)).size).toBe(SOUNDS.length);
    for (const sound of SOUNDS) expect(SOUND_CATEGORIES).toContain(sound.category);
  });

  it.each(SOUNDS.map((s) => [s.id, s] as const))(
    "%s has a file and a license record",
    (_, sound) => {
      expect(existsSync(join(root, "public", sound.file))).toBe(true);
      const record = inventory.assets.find((a) => a.id === sound.id);
      expect(record, `inventory record for ${sound.id}`).toBeDefined();
      expect(record!.file).toBe(`public${sound.file}`);
      expect(record!.category).toBe(sound.category);
      expect(record!.displayName).toBe(sound.name);
      expect(record!.commercialUse && record!.redistribution).toBe(true);
      expect(["CC0 1.0", "CC BY 4.0"]).toContain(record!.license.name);
    },
  );

  it("has no inventory records without a catalog entry", () => {
    for (const asset of inventory.assets) expect(getSound(asset.id), asset.id).toBeDefined();
  });

  it("keeps gains within 0–2", () => {
    for (const sound of SOUNDS) expect(sound.gain ?? 1).toBeGreaterThan(0);
    for (const sound of SOUNDS) expect(sound.gain ?? 1).toBeLessThanOrEqual(2);
  });
});

describe("preset integrity", () => {
  it("ships about ten presets with unique ids, including the default", () => {
    expect(PRESETS.length).toBe(10);
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
    expect(getPreset(DEFAULT_PRESET_ID)).toBeDefined();
  });

  it.each(PRESETS.map((p) => [p.id, p] as const))(
    "%s references real sounds within limits",
    (_, preset) => {
      expect(preset.pads.length).toBeGreaterThanOrEqual(LIMITS.minPads);
      expect(preset.pads.length).toBeLessThanOrEqual(LIMITS.maxPads);
      for (const pad of preset.pads) {
        expect(getSound(pad.soundId), `${preset.id}: ${pad.soundId}`).toBeDefined();
        expect(pad.label.length).toBeGreaterThan(0);
        expect(pad.label.length).toBeLessThanOrEqual(LIMITS.padLabelMax);
      }
    },
  );
});
