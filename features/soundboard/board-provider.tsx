"use client";

/**
 * BoardProvider: owns the board reducer, reads stored state once on mount, and persists the
 * saved slices (profiles, active profile, settings) with a short debounce. The edit draft is
 * never persisted. State and dispatch use separate contexts so dispatch-only consumers don't
 * re-render on every state change.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import { createDefaultState } from "@/lib/storage/defaults";
import { LocalProfileStore, type ProfileStore } from "@/lib/storage/profile-store";
import type { StoredState } from "@/types";
import {
  boardReducer,
  createInitialState,
  toStoredState,
  type BoardAction,
  type BoardState,
} from "./board-reducer";

const SAVE_DEBOUNCE_MS = 300;

const BoardStateContext = createContext<BoardState | null>(null);
const BoardDispatchContext = createContext<Dispatch<BoardAction> | null>(null);

/** Provides board state and dispatch. */
export function BoardProvider({
  children,
  store,
}: {
  children: ReactNode;
  /** Injectable for tests; defaults to localStorage. */
  store?: ProfileStore;
}) {
  const [storeInstance] = useState<ProfileStore>(() => store ?? new LocalProfileStore());
  const [state, dispatch] = useReducer(boardReducer, undefined, () =>
    createInitialState(createDefaultState()),
  );
  const writable = useRef(false);
  const saveFailedOnce = useRef(false);

  // Read storage once on mount; a single synchronous read, so the skeleton barely shows.
  useEffect(() => {
    const result = storeInstance.load();
    writable.current = result.writable;
    dispatch({ type: "hydrate", state: result.state, issue: result.issue });
  }, [storeInstance]);

  const pending = useRef<StoredState | null>(null);
  const flush = useCallback(() => {
    const snapshot = pending.current;
    if (!snapshot) return;
    pending.current = null;
    if (!storeInstance.save(snapshot) && !saveFailedOnce.current) {
      saveFailedOnce.current = true;
      dispatch({ type: "setStorageNotice", notice: "save-failed" });
    }
  }, [storeInstance]);

  const { profiles, activeProfileId, settings, hydrated } = state;
  useEffect(() => {
    if (!hydrated || !writable.current) return;
    pending.current = toStoredState({ ...state, profiles, activeProfileId, settings });
    const timer = setTimeout(flush, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // Only the persisted slices should trigger a save — not draft or selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, activeProfileId, settings, hydrated, flush]);

  // A reload or tab close inside the debounce window must not lose the last change.
  useEffect(() => {
    const onHide = () => flush();
    const onVisibility = () => document.hidden && flush();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [flush]);

  return (
    <BoardDispatchContext.Provider value={dispatch}>
      <BoardStateContext.Provider value={state}>{children}</BoardStateContext.Provider>
    </BoardDispatchContext.Provider>
  );
}

/** Current board state. */
export function useBoardState(): BoardState {
  const state = useContext(BoardStateContext);
  if (!state) throw new Error("useBoardState must be used within BoardProvider");
  return state;
}

/** Board dispatch (stable identity). */
export function useBoardDispatch(): Dispatch<BoardAction> {
  const dispatch = useContext(BoardDispatchContext);
  if (!dispatch) throw new Error("useBoardDispatch must be used within BoardProvider");
  return dispatch;
}
