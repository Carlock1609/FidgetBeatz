/**
 * Profile persistence (ADR 0003): one versioned JSON blob in localStorage.
 *
 * `load()` and `save()` never throw. Anything unreadable is backed up before it could be
 * overwritten, partially valid data is salvaged, and data from a newer app version is left
 * untouched. Framework-free; a cloud-sync store would implement the same `ProfileStore` shape.
 */
import { LIMITS, type Pad, type Profile, type Settings, type StoredState } from "@/types";
import { createDefaultState, DEFAULT_SETTINGS } from "./defaults";
import { PadSchema, ProfileSchema, SettingsSchema, StoredStateSchema } from "./schema";

export const STORAGE_KEY = "fidgetbeatz:v1";
export const BACKUP_PREFIX = "fidgetbeatz:backup:";
export const CURRENT_VERSION = 1;

/** What happened during load, so the UI can show one honest, non-blocking notice. */
export type LoadIssue =
  | "recovered" // stored data was corrupt or partly invalid; a backup was kept
  | "newer-version" // written by a newer build; running on defaults without saving
  | "storage-unavailable"; // localStorage is blocked; changes won't persist

export interface LoadResult {
  state: StoredState;
  issue: LoadIssue | null;
  /** When false, `save()` must not write (protects newer-version data). */
  writable: boolean;
}

export interface ProfileStore {
  load(): LoadResult;
  /** Returns false if the write failed (quota, private mode) or is disabled. */
  save(state: StoredState): boolean;
}

/**
 * Step-by-step migrations keyed by the version they upgrade *from*. Empty while the schema is
 * at v1; add `1: (data) => upgradedV2` when bumping CURRENT_VERSION.
 */
const migrations: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {};

/** Runs migrations from `data.version` up to CURRENT_VERSION. Returns null if impossible. */
export function migrate(data: Record<string, unknown>): Record<string, unknown> | null {
  let current = data;
  let version = current.version;
  while (typeof version === "number" && version < CURRENT_VERSION) {
    const step = migrations[version];
    if (!step) return null;
    current = step(current);
    version = current.version;
  }
  return version === CURRENT_VERSION ? current : null;
}

function salvagePads(raw: unknown): Pad[] {
  if (!Array.isArray(raw)) return [];
  const pads: Pad[] = [];
  for (const item of raw) {
    if (item && typeof item === "object" && typeof (item as Pad).label === "string") {
      // Over-long labels are trimmed rather than dropping the whole pad.
      (item as Pad).label = (item as Pad).label.slice(0, LIMITS.padLabelMax);
    }
    const parsed = PadSchema.safeParse(item);
    if (parsed.success) pads.push(parsed.data);
  }
  return pads.slice(0, LIMITS.maxPads);
}

/** Keeps every profile that can be repaired; drops the rest. */
function salvage(data: Record<string, unknown>): StoredState | null {
  const rawProfiles = Array.isArray(data.profiles) ? data.profiles : [];
  const profiles: Profile[] = [];
  const seen = new Set<string>();
  for (const raw of rawProfiles) {
    if (!raw || typeof raw !== "object") continue;
    const candidate = { ...(raw as Record<string, unknown>) };
    candidate.pads = salvagePads(candidate.pads);
    const parsed = ProfileSchema.safeParse(candidate);
    if (parsed.success && !seen.has(parsed.data.id)) {
      seen.add(parsed.data.id);
      profiles.push(parsed.data);
    }
    if (profiles.length === LIMITS.maxProfiles) break;
  }
  if (profiles.length === 0) return null;

  const settingsResult = SettingsSchema.safeParse(data.settings);
  const settings: Settings = settingsResult.success ? settingsResult.data : { ...DEFAULT_SETTINGS };
  const activeProfileId =
    typeof data.activeProfileId === "string" && seen.has(data.activeProfileId)
      ? data.activeProfileId
      : profiles[0]!.id;
  return { version: 1, activeProfileId, profiles, settings };
}

/** localStorage-backed ProfileStore — the only Phase 1 implementation. */
export class LocalProfileStore implements ProfileStore {
  constructor(private readonly storage: () => Storage | null = defaultStorage) {}

  load(): LoadResult {
    let raw: string | null;
    try {
      // Accessing localStorage itself can throw (blocked cookies / some private modes).
      const storage = this.storage();
      if (!storage) throw new Error("no storage");
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      return { state: createDefaultState(), issue: "storage-unavailable", writable: false };
    }
    if (raw === null) return { state: createDefaultState(), issue: null, writable: true };

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return this.recover(raw);
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) return this.recover(raw);
    const record = data as Record<string, unknown>;

    if (typeof record.version === "number" && record.version > CURRENT_VERSION) {
      // Opened an older build after a newer one: never clobber the newer data.
      return { state: createDefaultState(), issue: "newer-version", writable: false };
    }

    const migrated = migrate(record);
    if (!migrated) return this.recover(raw);

    const strict = StoredStateSchema.safeParse(migrated);
    if (strict.success) {
      const state = strict.data;
      if (!state.profiles.some((p) => p.id === state.activeProfileId)) {
        state.activeProfileId = state.profiles[0]!.id;
      }
      return { state, issue: null, writable: true };
    }

    const salvaged = salvage(migrated);
    if (!salvaged) return this.recover(raw);
    this.backup(raw);
    return { state: salvaged, issue: "recovered", writable: true };
  }

  save(state: StoredState): boolean {
    try {
      const storage = this.storage();
      if (!storage) return false;
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  private recover(raw: string): LoadResult {
    this.backup(raw);
    return { state: createDefaultState(), issue: "recovered", writable: true };
  }

  private backup(raw: string): void {
    try {
      this.storage()?.setItem(`${BACKUP_PREFIX}${Date.now()}`, raw);
    } catch {
      // If even the backup can't be written, the original key is still untouched until the
      // next successful save; nothing more we can do here.
    }
  }
}

function defaultStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}
