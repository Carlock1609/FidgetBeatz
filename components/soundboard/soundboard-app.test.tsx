import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { AudioEngine } from "@/lib/audio/audio-engine";
import { SoundboardApp } from "./soundboard-app";

beforeAll(() => {
  // jsdom lacks these browser APIs; the app only needs them to exist.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  Element.prototype.scrollIntoView ??= () => undefined;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  globalThis.fetch = vi.fn(async () => new Response(new ArrayBuffer(8))) as typeof fetch;
});

describe("SoundboardApp", () => {
  it("plays the assigned sound on pointerdown, before any click", async () => {
    const play = vi.spyOn(AudioEngine.prototype, "play");
    render(<SoundboardApp whatsNew={[]} />);
    const pads = await screen.findAllByTestId("pad");
    expect(pads).toHaveLength(12);

    fireEvent.pointerDown(pads[0]!, { pointerType: "touch", button: 0 });
    expect(play).toHaveBeenCalledWith("kick-punchy-01", { padIndex: 0 });
    expect(pads[0]).toHaveAttribute("data-hit");

    // Rapid repeats each trigger the engine.
    for (let i = 0; i < 5; i++)
      fireEvent.pointerDown(pads[1]!, { pointerType: "touch", button: 0 });
    expect(play.mock.calls.filter(([id]) => id === "snare-crisp-01")).toHaveLength(5);
  });

  it("ignores right clicks and plays on Space for keyboard users", async () => {
    const play = vi.spyOn(AudioEngine.prototype, "play").mockClear();
    render(<SoundboardApp whatsNew={[]} />);
    const pads = await screen.findAllByTestId("pad");
    fireEvent.pointerDown(pads[2]!, { pointerType: "mouse", button: 2 });
    expect(play).not.toHaveBeenCalled();
    fireEvent.keyDown(pads[2]!, { key: " " });
    expect(play).toHaveBeenCalledWith("hihat-closed-01", { padIndex: 2 });
  });

  it("enters edit mode, adds a pad and saves it", async () => {
    render(<SoundboardApp whatsNew={[]} />);
    await screen.findAllByTestId("pad");
    fireEvent.click(screen.getByRole("button", { name: "Edit pads" }));
    expect(screen.getAllByTestId("edit-pad")).toHaveLength(12);
    fireEvent.click(screen.getByRole("button", { name: "Add pad" }));
    expect(screen.getAllByTestId("edit-pad")).toHaveLength(13);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findAllByTestId("pad")).toHaveLength(13);
  });
});
