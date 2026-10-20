import { describe, expect, it, vi } from "vitest";
import type { Sound } from "@/types";
import { AudioEngine, type EngineEvent } from "./audio-engine";

/** Minimal fake of the Web Audio surface the engine uses. */
function createFakeContext() {
  const started: { buffer: unknown; when: number; gain: number }[] = [];
  const stopped: unknown[] = [];
  const param = (value = 1) => ({
    value,
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  });
  const node = () => ({ connect: vi.fn(), disconnect: vi.fn() });
  const ctx = {
    state: "suspended" as AudioContextState,
    currentTime: 1.5,
    destination: {},
    onstatechange: null as null | (() => void),
    resume: vi.fn(async () => {
      ctx.state = "running";
    }),
    suspend: vi.fn(async () => {
      ctx.state = "suspended";
    }),
    decodeAudioData: vi.fn(async (data: ArrayBuffer) => {
      if (new Uint8Array(data)[0] === 0xff) throw new Error("bad data");
      return { duration: 0.5, tag: new Uint8Array(data)[0] };
    }),
    createDynamicsCompressor: () => ({
      ...node(),
      threshold: param(),
      knee: param(),
      ratio: param(),
      attack: param(),
      release: param(),
    }),
    createGain: () => ({ ...node(), gain: param() }),
    createBufferSource: () => {
      const source = {
        ...node(),
        buffer: null as unknown,
        onended: null as null | (() => void),
        start: vi.fn((when: number) => started.push({ buffer: source.buffer, when, gain: 0 })),
        stop: vi.fn(() => stopped.push(source)),
      };
      return source;
    },
  };
  return { ctx, started, stopped };
}

const catalog: Record<string, Sound> = {
  kick: { id: "kick", name: "Kick", category: "kick", file: "/kick.wav" },
  hat: { id: "hat", name: "Hat", category: "hihat", file: "/hat.wav", playMode: "choke" },
  broken: { id: "broken", name: "Broken", category: "fx", file: "/broken.wav" },
  missing: { id: "missing", name: "Missing", category: "fx", file: "/404.wav" },
};

function setup(maxVoices?: number, decoder: "offline" | "none" = "offline") {
  const fake = createFakeContext();
  const offline = createFakeContext().ctx;
  const fetchFn = vi.fn(async (url: RequestInfo | URL) => {
    const path = String(url);
    if (path === "/404.wav") return new Response(null, { status: 404 });
    const first = path === "/broken.wav" ? 0xff : path.length;
    return new Response(new Uint8Array([first, 1, 2, 3]));
  });
  const engine = new AudioEngine({
    resolveSound: (id) => catalog[id],
    createContext: () => fake.ctx as unknown as AudioContext,
    createDecoder: () => (decoder === "offline" ? (offline as unknown as BaseAudioContext) : null),
    fetchFn: fetchFn as unknown as typeof fetch,
    maxVoices,
  });
  return { engine, fake, fetchFn, offline };
}

describe("AudioEngine", () => {
  it("does not create a context until unlock or play", async () => {
    const createContext = vi.fn(() => null);
    const engine = new AudioEngine({ resolveSound: () => undefined, createContext });
    await engine.preload([]);
    expect(createContext).not.toHaveBeenCalled();
    await engine.unlock();
    expect(createContext).toHaveBeenCalledOnce();
    expect(engine.isUnsupported).toBe(true);
  });

  it("unlock resumes the context and is idempotent", async () => {
    const { engine, fake } = setup();
    await engine.unlock();
    await engine.unlock();
    expect(fake.ctx.state).toBe("running");
    expect(fake.ctx.resume).toHaveBeenCalledOnce();
  });

  it("preloads, decodes and plays synchronously", async () => {
    const { engine, fake } = setup();
    await engine.unlock();
    await engine.preload(["kick"]);
    expect(engine.status("kick")).toBe("ready");

    engine.play("kick");
    expect(fake.started).toHaveLength(1);
    expect(fake.started[0]?.when).toBe(0);
  });

  it("decodes before unlock with the offline decoder so the first tap is instant", async () => {
    const { engine, fake, offline } = setup();
    await engine.preload(["kick"]);
    expect(offline.decodeAudioData).toHaveBeenCalledOnce();
    expect(engine.status("kick")).toBe("ready");

    engine.play("kick"); // the gesture that creates the real context
    expect(fake.started).toHaveLength(1);
  });

  it("falls back to decoding once the context exists when there is no offline decoder", async () => {
    const { engine, fake, fetchFn } = setup(undefined, "none");
    await engine.preload(["kick"]);
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(engine.status("kick")).toBe("loading");

    await engine.unlock();
    await engine.preload(["kick"]);
    expect(engine.status("kick")).toBe("ready");
    expect(fake.ctx.decodeAudioData).toHaveBeenCalledOnce();
  });

  it("supports rapid repeated and overlapping playback", async () => {
    const { engine, fake } = setup();
    await engine.unlock();
    await engine.preload(["kick", "hat"]);
    for (let i = 0; i < 10; i++) engine.play("kick");
    engine.play("hat");
    expect(fake.started).toHaveLength(11);
    expect(engine.activeVoices).toBe(11);
  });

  it("passes a scheduled start time through (Phase 2 sequencing)", async () => {
    const { engine, fake } = setup();
    await engine.unlock();
    await engine.preload(["kick"]);
    engine.play("kick", { when: 4.25 });
    expect(fake.started[0]?.when).toBe(4.25);
  });

  it("steals the oldest voice beyond the cap", async () => {
    const { engine, fake } = setup(3);
    await engine.unlock();
    await engine.preload(["kick"]);
    for (let i = 0; i < 5; i++) engine.play("kick");
    expect(engine.activeVoices).toBe(3);
    expect(fake.stopped).toHaveLength(2);
  });

  it("chokes the previous instance of a choke sound", async () => {
    const { engine, fake } = setup();
    await engine.unlock();
    await engine.preload(["hat"]);
    engine.play("hat");
    engine.play("hat");
    expect(engine.activeVoices).toBe(1);
    expect(fake.stopped).toHaveLength(1);
  });

  it("marks 404s, decode failures and unknown ids as errors and never throws on play", async () => {
    const { engine, fake } = setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await engine.unlock();
    await engine.preload(["missing", "broken", "nope"]);
    expect(engine.status("missing")).toBe("error");
    expect(engine.status("broken")).toBe("error");
    expect(engine.status("nope")).toBe("error");
    expect(() => {
      engine.play("missing");
      engine.play("nope");
    }).not.toThrow();
    expect(fake.started).toHaveLength(0);
    warn.mockRestore();
  });

  it("emits a trigger event after start with the pad index", async () => {
    const { engine, fake } = setup();
    await engine.unlock();
    await engine.preload(["kick"]);
    const events: EngineEvent[] = [];
    engine.subscribe((e) => {
      if (e.type === "trigger") {
        // start() must already have happened when the display hears about the hit.
        expect(fake.started).toHaveLength(1);
      }
      events.push(e);
    });
    engine.play("kick", { padIndex: 4 });
    expect(events).toContainEqual({ type: "trigger", soundId: "kick", padIndex: 4, time: 1.5 });
  });

  it("plays a tap that arrives mid-load once the decode finishes quickly", async () => {
    const { engine, fake } = setup(undefined, "none");
    await engine.preload(["kick"]); // bytes fetched, nothing to decode with yet
    engine.play("kick"); // the gesture that creates the context
    expect(fake.started).toHaveLength(0);
    await vi.waitFor(() => expect(fake.started).toHaveLength(1));
  });

  it("emits status events while loading", async () => {
    const { engine } = setup();
    const statuses: string[] = [];
    engine.subscribe((e) => e.type === "status" && statuses.push(`${e.soundId}:${e.status}`));
    await engine.unlock();
    await engine.preload(["kick"]);
    expect(statuses).toEqual(["kick:loading", "kick:ready"]);
  });
});
