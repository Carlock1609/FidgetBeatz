import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultState } from "./defaults";
import { BACKUP_PREFIX, LocalProfileStore, migrate, STORAGE_KEY } from "./profile-store";

const backups = () => Object.keys(localStorage).filter((k) => k.startsWith(BACKUP_PREFIX));

describe("LocalProfileStore", () => {
  let store: LocalProfileStore;
  beforeEach(() => {
    localStorage.clear();
    store = new LocalProfileStore();
  });

  it("seeds defaults when nothing is stored", () => {
    const result = store.load();
    expect(result.issue).toBeNull();
    expect(result.writable).toBe(true);
    expect(result.state.profiles).toHaveLength(3);
  });

  it("round-trips saved state", () => {
    const state = createDefaultState();
    state.profiles[0]!.name = "Saved";
    state.settings.masterVolume = 0.4;
    expect(store.save(state)).toBe(true);
    const loaded = store.load();
    expect(loaded.issue).toBeNull();
    expect(loaded.state).toEqual(state);
  });

  it("backs up invalid JSON and recovers with defaults", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    const result = store.load();
    expect(result.issue).toBe("recovered");
    expect(result.state.profiles).toHaveLength(3);
    expect(backups()).toHaveLength(1);
    expect(localStorage.getItem(backups()[0]!)).toBe("{not json");
  });

  it("salvages valid profiles and pads from partially invalid data", () => {
    const state = createDefaultState();
    const raw = JSON.parse(JSON.stringify(state));
    raw.profiles[0].pads[0].color = "plaid"; // invalid pad → dropped
    raw.profiles[0].pads[1].label = "a very long label that overflows"; // trimmed
    raw.profiles[1].name = ""; // invalid profile → dropped
    raw.activeProfileId = raw.profiles[1].id; // now dangling
    raw.settings = "nope"; // replaced with defaults
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));

    const result = store.load();
    expect(result.issue).toBe("recovered");
    expect(result.state.profiles).toHaveLength(2);
    expect(result.state.profiles[0]!.pads).toHaveLength(11);
    expect(result.state.profiles[0]!.pads[0]!.label).toHaveLength(16);
    expect(result.state.activeProfileId).toBe(result.state.profiles[0]!.id);
    expect(result.state.settings.masterVolume).toBe(0.9);
    expect(backups()).toHaveLength(1);
  });

  it("keeps pads whose sound id is unknown (shown as missing in the UI)", () => {
    const state = createDefaultState();
    state.profiles[0]!.pads[0]!.soundId = "removed-sound-99";
    store.save(state);
    expect(store.load().state.profiles[0]!.pads[0]!.soundId).toBe("removed-sound-99");
  });

  it("selects the first profile when the active id dangles", () => {
    const state = createDefaultState();
    state.activeProfileId = "gone";
    store.save(state);
    const result = store.load();
    expect(result.issue).toBeNull();
    expect(result.state.activeProfileId).toBe(state.profiles[0]!.id);
  });

  it("does not overwrite data from a newer app version", () => {
    const newer = JSON.stringify({ version: 2, whatever: true });
    localStorage.setItem(STORAGE_KEY, newer);
    const result = store.load();
    expect(result.issue).toBe("newer-version");
    expect(result.writable).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(newer);
  });

  it("recovers from structurally wrong data", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3]));
    expect(store.load().issue).toBe("recovered");
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, profiles: [] }));
    expect(store.load().issue).toBe("recovered");
  });

  it("reports unavailable storage and failed writes without throwing", () => {
    const broken = new LocalProfileStore(() => {
      throw new Error("SecurityError");
    });
    expect(broken.load().issue).toBe("storage-unavailable");
    expect(broken.save(createDefaultState())).toBe(false);

    const full = new LocalProfileStore(
      () =>
        ({
          getItem: () => null,
          setItem: () => {
            throw new DOMException("quota", "QuotaExceededError");
          },
        }) as unknown as Storage,
    );
    expect(full.save(createDefaultState())).toBe(false);
  });

  it("migrate passes current data through and rejects unknown versions", () => {
    expect(migrate({ version: 1 })).toEqual({ version: 1 });
    expect(migrate({ version: 0 })).toBeNull();
    expect(migrate({})).toBeNull();
  });
});
