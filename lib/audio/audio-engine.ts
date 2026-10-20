/**
 * AudioEngine — the only module that touches the Web Audio API.
 *
 * Design (ADR 0004): one shared AudioContext, a cache of decoded AudioBuffers, and a fresh
 * AudioBufferSourceNode per hit. `play()` is synchronous so the tap path never waits on a
 * promise. Framework-free so it can be unit-tested with a fake context and reused by Phase 2.
 *
 * Graph: source → voiceGain(sound.gain × opts.gain) → masterGain → limiter → destination
 */
import type { Sound, SoundId } from "@/types";

export type SoundStatus = "idle" | "loading" | "ready" | "error";

export type EngineEvent =
  | { type: "trigger"; soundId: SoundId; padIndex?: number; time: number }
  | { type: "status"; soundId: SoundId; status: SoundStatus }
  | { type: "context"; state: AudioContextState | "unsupported" };

export interface PlayOptions {
  /** Start time in AudioContext seconds; omitted = now. Reserved for Phase 2 scheduling. */
  when?: number;
  /** Extra gain multiplier for this hit (0–2). */
  gain?: number;
  /** Grid position, forwarded on the trigger event for the sound display. */
  padIndex?: number;
}

export interface AudioEngineOptions {
  /** Resolves catalog metadata (file, gain, playMode) for an id. */
  resolveSound: (id: SoundId) => Sound | undefined;
  /** Injected for tests; defaults to `new AudioContext()`. Returns null when unsupported. */
  createContext?: () => AudioContext | null;
  /**
   * Context used to decode before the real context exists. Defaults to a 1-frame
   * OfflineAudioContext, which needs no user gesture; decoded AudioBuffers can be played by
   * any context, so the first tap doesn't wait for decoding.
   */
  createDecoder?: () => BaseAudioContext | null;
  /** Injected for tests; defaults to global fetch. */
  fetchFn?: typeof fetch;
  /** Concurrent voice cap; the oldest voice is stolen beyond it. */
  maxVoices?: number;
}

interface Voice {
  soundId: SoundId;
  source: AudioBufferSourceNode;
  gain: GainNode;
}

/**
 * A tap that arrives while its sound is still loading (e.g. a very fast first tap on a slow
 * connection) is honored if the buffer becomes ready within this window; otherwise it is
 * dropped rather than played noticeably late.
 */
const LATE_START_WINDOW_MS = 150;
/** Fade applied when stealing/choking a voice, to avoid clicks. */
const RELEASE_SECONDS = 0.008;

function defaultCreateDecoder(): BaseAudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;
  try {
    return Ctor ? new Ctor(1, 1, 44100) : null;
  } catch {
    return null;
  }
}

function defaultCreateContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctor ? new Ctor({ latencyHint: "interactive" }) : null;
}

/**
 * Creates the audio engine. Nothing touches Web Audio until `unlock()` (or a `play()` after it)
 * runs inside a user gesture, so there are no autoplay warnings on load.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private decoder: BaseAudioContext | null | undefined;
  private master: GainNode | null = null;
  private unsupported = false;
  private masterVolume = 0.9;

  /** Raw file bytes, fetched before the context exists so decoding can start immediately. */
  private bytes = new Map<SoundId, Promise<ArrayBuffer | null>>();
  private buffers = new Map<SoundId, AudioBuffer>();
  private decoding = new Map<SoundId, Promise<void>>();
  private statuses = new Map<SoundId, SoundStatus>();
  private voices: Voice[] = [];
  private listeners = new Set<(event: EngineEvent) => void>();
  private warned = new Set<SoundId>();

  private readonly resolveSound: AudioEngineOptions["resolveSound"];
  private readonly createContext: () => AudioContext | null;
  private readonly createDecoder: () => BaseAudioContext | null;
  private readonly fetchFn: typeof fetch;
  private readonly maxVoices: number;

  constructor(options: AudioEngineOptions) {
    this.resolveSound = options.resolveSound;
    this.createContext = options.createContext ?? defaultCreateContext;
    this.createDecoder = options.createDecoder ?? defaultCreateDecoder;
    this.fetchFn = options.fetchFn ?? ((...args) => fetch(...args));
    this.maxVoices = options.maxVoices ?? 32;
  }

  /** True once a context exists and is running. */
  get isRunning(): boolean {
    return this.ctx?.state === "running";
  }

  /** True when the browser has no Web Audio support. */
  get isUnsupported(): boolean {
    return this.unsupported;
  }

  /** Current context time in seconds (0 before unlock). */
  get currentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  /**
   * Creates (if needed) and resumes the AudioContext. Must be called from a user-gesture
   * handler — iOS Safari only allows audio to start there. Idempotent and never rejects.
   */
  async unlock(): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state !== "running") {
      try {
        await ctx.resume();
      } catch {
        // Some browsers reject resume() outside a gesture; the next gesture retries.
      }
      this.emit({ type: "context", state: ctx.state });
    }
  }

  /**
   * Fetches and (once a context exists) decodes the given sounds. Never rejects: failures are
   * recorded per sound as status `error`. Already loaded or loading sounds are skipped.
   */
  async preload(ids: Iterable<SoundId>): Promise<void> {
    await Promise.all([...new Set(ids)].map((id) => this.load(id)));
  }

  /**
   * Plays a sound now (or at `opts.when`). Synchronous by design: no awaits before `start()`.
   * Unknown, failed or not-yet-decoded sounds are a silent no-op (with one console warning),
   * except for the first-tap late-start window described above.
   */
  play(id: SoundId, opts: PlayOptions = {}): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    // Calling resume() here keeps playback working after the tab was backgrounded on iOS,
    // where the context can be interrupted without a statechange we can rely on.
    if (ctx.state !== "running") void ctx.resume().catch(() => undefined);

    const buffer = this.buffers.get(id);
    if (!buffer) {
      this.handleNotReady(id, opts);
      return;
    }
    this.startVoice(ctx, this.master, id, buffer, opts);
  }

  /** Current load status of a sound. */
  status(id: SoundId): SoundStatus {
    return this.statuses.get(id) ?? "idle";
  }

  /** Decoded buffer for a sound, if ready (Phase 2 export will re-render from these). */
  getBuffer(id: SoundId): AudioBuffer | undefined {
    return this.buffers.get(id);
  }

  /** Subscribes to engine events; returns an unsubscribe function. */
  subscribe(listener: (event: EngineEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Sets master volume (0–1), smoothed to avoid zipper noise. */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.min(1, Math.max(0, volume));
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.02);
    }
  }

  /** Suspends audio while the page is hidden and resumes when it returns. */
  setPageHidden(hidden: boolean): void {
    if (!this.ctx) return;
    const op = hidden ? this.ctx.suspend() : this.ctx.resume();
    void op.catch(() => undefined);
  }

  /** Number of currently sounding voices (for tests and diagnostics). */
  get activeVoices(): number {
    return this.voices.length;
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx || this.unsupported) return this.ctx;
    let ctx: AudioContext | null = null;
    try {
      ctx = this.createContext();
    } catch {
      ctx = null;
    }
    if (!ctx) {
      this.unsupported = true;
      this.emit({ type: "context", state: "unsupported" });
      return null;
    }
    this.ctx = ctx;

    // A brick-wall-ish limiter keeps many stacked hits from clipping harshly.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.1;
    limiter.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = this.masterVolume;
    this.master.connect(limiter);

    ctx.onstatechange = () => this.emit({ type: "context", state: ctx.state });

    // Decode anything that was fetched but couldn't be decoded yet (no offline decoder).
    for (const id of this.bytes.keys()) void this.decode(id);
    return ctx;
  }

  private load(id: SoundId): Promise<void> {
    const status = this.status(id);
    if (status === "ready" || status === "error") return Promise.resolve();
    const sound = this.resolveSound(id);
    if (!sound) {
      this.setStatus(id, "error");
      return Promise.resolve();
    }
    if (!this.bytes.has(id)) {
      this.setStatus(id, "loading");
      this.bytes.set(
        id,
        this.fetchFn(sound.file)
          .then((res) => (res.ok ? res.arrayBuffer() : null))
          .catch(() => null),
      );
    }
    return this.decode(id);
  }

  /** The live context if it exists, else the offline decoder (created once). */
  private decodingContext(): BaseAudioContext | null {
    if (this.ctx) return this.ctx;
    if (this.decoder === undefined) this.decoder = this.createDecoder();
    return this.decoder;
  }

  private decode(id: SoundId): Promise<void> {
    const existing = this.decoding.get(id);
    if (existing) return existing;
    const ctx = this.decodingContext();
    const bytes = this.bytes.get(id);
    if (!ctx || !bytes) return Promise.resolve();

    const task = bytes
      .then(async (data) => {
        if (!data) throw new Error("fetch failed");
        // decodeAudioData detaches its input; copy so a retry could reuse the bytes.
        return ctx.decodeAudioData(data.slice(0));
      })
      .then((buffer) => {
        this.buffers.set(id, buffer);
        this.setStatus(id, "ready");
      })
      .catch(() => {
        this.setStatus(id, "error");
        this.warnOnce(id, "could not be loaded or decoded");
      });
    this.decoding.set(id, task);
    return task;
  }

  private handleNotReady(id: SoundId, opts: PlayOptions): void {
    const status = this.status(id);
    if (status === "error") return;
    if (status === "idle") void this.load(id);
    const pending = this.decoding.get(id) ?? (this.bytes.has(id) ? this.decode(id) : undefined);
    if (!pending || opts.when !== undefined) return;
    const requestedAt = Date.now();
    void pending.then(() => {
      const buffer = this.buffers.get(id);
      if (buffer && this.ctx && this.master && Date.now() - requestedAt <= LATE_START_WINDOW_MS) {
        this.startVoice(this.ctx, this.master, id, buffer, opts);
      }
    });
  }

  private startVoice(
    ctx: AudioContext,
    master: GainNode,
    id: SoundId,
    buffer: AudioBuffer,
    opts: PlayOptions,
  ): void {
    const sound = this.resolveSound(id);
    const when = opts.when ?? 0;

    if (sound?.playMode === "choke") {
      for (const voice of this.voices.filter((v) => v.soundId === id)) this.release(voice, ctx);
    }
    while (this.voices.length >= this.maxVoices) {
      const oldest = this.voices[0];
      if (!oldest) break;
      this.release(oldest, ctx);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = (sound?.gain ?? 1) * (opts.gain ?? 1);
    source.connect(gain);
    gain.connect(master);
    source.start(when);

    const voice: Voice = { soundId: id, source, gain };
    this.voices.push(voice);
    source.onended = () => this.cleanup(voice);

    // The display subscribes to this; emitting after start() keeps it off the audio path.
    this.emit({ type: "trigger", soundId: id, padIndex: opts.padIndex, time: ctx.currentTime });
  }

  private release(voice: Voice, ctx: AudioContext): void {
    const now = ctx.currentTime;
    try {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
      voice.gain.gain.linearRampToValueAtTime(0, now + RELEASE_SECONDS);
      voice.source.stop(now + RELEASE_SECONDS);
    } catch {
      // stop() throws if the source already ended; nothing to release then.
    }
    this.cleanup(voice);
  }

  private cleanup(voice: Voice): void {
    const index = this.voices.indexOf(voice);
    if (index === -1) return;
    this.voices.splice(index, 1);
    voice.source.onended = null;
    // Disconnect after the release fade so the tail isn't cut abruptly.
    setTimeout(() => {
      voice.source.disconnect();
      voice.gain.disconnect();
    }, 50);
  }

  private setStatus(id: SoundId, status: SoundStatus): void {
    if (this.statuses.get(id) === status) return;
    this.statuses.set(id, status);
    this.emit({ type: "status", soundId: id, status });
  }

  private warnOnce(id: SoundId, message: string): void {
    if (this.warned.has(id)) return;
    this.warned.add(id);
    console.warn(`[FidgetBeatz] Sound "${id}" ${message}.`);
  }

  private emit(event: EngineEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
