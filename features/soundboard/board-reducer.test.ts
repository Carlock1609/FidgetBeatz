import { describe, expect, it } from "vitest";
import { getPreset } from "@/data/presets";
import { createDefaultState } from "@/lib/storage/defaults";
import { LIMITS } from "@/types";
import {
  arrayMove,
  boardReducer,
  createInitialState,
  selectActiveProfile,
  selectHasUnsavedChanges,
  selectIsCustomized,
  selectVisiblePads,
  type BoardAction,
  type BoardState,
} from "./board-reducer";

function hydrated(): BoardState {
  const seed = createDefaultState();
  return boardReducer(createInitialState(seed), { type: "hydrate", state: seed });
}

function run(state: BoardState, ...actions: BoardAction[]): BoardState {
  return actions.reduce(boardReducer, state);
}

describe("boardReducer", () => {
  it("hydrates with three default profiles on the classic drums board", () => {
    const state = hydrated();
    expect(state.hydrated).toBe(true);
    expect(state.profiles.map((p) => p.name)).toEqual(["My Drums", "My Lo-Fi", "My Synthwave"]);
    expect(selectActiveProfile(state).basePresetId).toBe("classic-drums");
  });

  describe("edit mode", () => {
    it("works on a draft and only commits on save", () => {
      let state = run(hydrated(), { type: "enterEdit" }, { type: "addPad" });
      expect(state.mode).toBe("edit");
      expect(selectVisiblePads(state)).toHaveLength(13);
      expect(selectActiveProfile(state).pads).toHaveLength(12);
      expect(selectHasUnsavedChanges(state)).toBe(true);

      state = run(state, { type: "saveEdit" });
      expect(state.mode).toBe("play");
      expect(state.draft).toBeNull();
      expect(selectActiveProfile(state).pads).toHaveLength(13);
    });

    it("discards the draft on cancel", () => {
      const before = hydrated();
      const pad = selectActiveProfile(before).pads[0]!;
      const state = run(
        before,
        { type: "enterEdit" },
        { type: "removePad", padId: pad.id },
        { type: "cancelEdit" },
      );
      expect(selectActiveProfile(state).pads).toEqual(selectActiveProfile(before).pads);
    });

    it("adds pads with a sound and selects them, up to the limit", () => {
      let state = run(hydrated(), { type: "enterEdit" }, { type: "addPad", soundId: "fx-coin-01" });
      const added = state.draft!.at(-1)!;
      expect(added).toMatchObject({ soundId: "fx-coin-01", label: "Coin", color: "cyan" });
      expect(state.selectedPadId).toBe(added.id);

      for (let i = 0; i < 40; i++) state = run(state, { type: "addPad" });
      expect(state.draft).toHaveLength(LIMITS.maxPads);
    });

    it("removes pads but never the last one", () => {
      let state = run(hydrated(), { type: "enterEdit" });
      for (const pad of [...state.draft!]) state = run(state, { type: "removePad", padId: pad.id });
      expect(state.draft).toHaveLength(1);
    });

    it("reorders pads", () => {
      let state = run(hydrated(), { type: "enterEdit" });
      const [first, second] = state.draft!;
      state = run(state, { type: "movePad", from: 0, to: 1 });
      expect(state.draft!.slice(0, 2).map((p) => p.id)).toEqual([second!.id, first!.id]);
    });

    it("assigns sounds, updating default labels and colors but keeping custom labels", () => {
      let state = run(hydrated(), { type: "enterEdit" });
      const kickPad = state.draft![0]!; // label "Kick" (custom vs "Punchy Kick")
      const crash = state.draft!.find((p) => p.soundId === "hihat-crash-01")!; // default label

      state = run(
        state,
        { type: "assignSound", padId: kickPad.id, soundId: "bass-808-c-01" },
        { type: "assignSound", padId: crash.id, soundId: "piano-c4-01" },
      );
      expect(state.draft![0]).toMatchObject({
        soundId: "bass-808-c-01",
        label: "Kick",
        color: "blue",
      });
      expect(state.draft!.find((p) => p.id === crash.id)).toMatchObject({
        label: "Piano C4",
        color: "violet",
      });
    });

    it("clips labels to 16 characters", () => {
      let state = run(hydrated(), { type: "enterEdit" });
      const pad = state.draft![0]!;
      state = run(state, { type: "relabelPad", padId: pad.id, label: "x".repeat(40) });
      expect(state.draft![0]!.label).toHaveLength(LIMITS.padLabelMax);
    });

    it("ignores edit actions outside edit mode and profile switches inside it", () => {
      const play = hydrated();
      expect(run(play, { type: "addPad" })).toBe(play);
      const edit = run(play, { type: "enterEdit" });
      expect(run(edit, { type: "selectProfile", profileId: play.profiles[1]!.id })).toBe(edit);
    });
  });

  describe("presets", () => {
    it("loads a preset into the active profile and can reset to it", () => {
      let state = run(hydrated(), { type: "loadPreset", presetId: "piano" });
      const profile = selectActiveProfile(state);
      expect(profile.basePresetId).toBe("piano");
      expect(profile.pads.map((p) => p.soundId)).toEqual(
        getPreset("piano")!.pads.map((p) => p.soundId),
      );
      expect(selectIsCustomized(state)).toBe(false);

      state = run(state, { type: "enterEdit" }, { type: "addPad" }, { type: "saveEdit" });
      expect(selectIsCustomized(state)).toBe(true);

      state = run(state, { type: "resetToPreset" });
      expect(selectActiveProfile(state).pads).toHaveLength(12);
      expect(selectIsCustomized(state)).toBe(false);
    });
  });

  describe("profiles", () => {
    it("switches, creates (max 5), renames and deletes profiles", () => {
      let state = hydrated();
      state = run(state, { type: "selectProfile", profileId: state.profiles[1]!.id });
      expect(selectActiveProfile(state).name).toBe("My Lo-Fi");

      state = run(
        state,
        { type: "createProfile", name: "  Jam  ", presetId: "beatbox" },
        { type: "createProfile", name: "Five", presetId: "bass" },
        { type: "createProfile", name: "Six", presetId: "bass" },
      );
      expect(state.profiles).toHaveLength(5);
      expect(state.profiles.map((p) => p.name)).toContain("Jam");
      expect(selectActiveProfile(state).name).toBe("Five");

      const active = selectActiveProfile(state);
      state = run(state, { type: "renameProfile", profileId: active.id, name: "   " });
      expect(selectActiveProfile(state).name).toBe("Five");
      state = run(state, { type: "renameProfile", profileId: active.id, name: "Renamed" });
      expect(selectActiveProfile(state).name).toBe("Renamed");

      state = run(state, { type: "deleteProfile", profileId: active.id });
      expect(state.profiles).toHaveLength(4);
      expect(state.activeProfileId).toBe(state.profiles[0]!.id);
    });

    it("never deletes the last profile", () => {
      let state = hydrated();
      for (const p of [...state.profiles])
        state = run(state, { type: "deleteProfile", profileId: p.id });
      expect(state.profiles).toHaveLength(1);
    });

    it("keeps each profile's own pads when switching", () => {
      let state = run(hydrated(), { type: "enterEdit" }, { type: "addPad" }, { type: "saveEdit" });
      const drums = state.activeProfileId;
      state = run(state, { type: "selectProfile", profileId: state.profiles[2]!.id });
      expect(selectVisiblePads(state)).toHaveLength(16);
      state = run(state, { type: "selectProfile", profileId: drums });
      expect(selectVisiblePads(state)).toHaveLength(13);
    });
  });

  it("arrayMove ignores out-of-range indices", () => {
    expect(arrayMove([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
    expect(arrayMove([1, 2, 3], 5, 0)).toEqual([1, 2, 3]);
  });
});
