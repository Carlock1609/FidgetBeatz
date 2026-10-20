"use client";

import { Check, ChevronDown, Play } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { CATEGORY_META } from "@/data/sounds/categories";
import { getSound, soundsByCategory } from "@/data/sounds/catalog";
import { cn } from "@/lib/utils/cn";
import type { SoundCategory, SoundId } from "@/types";

/**
 * Dropdown-style sound chooser: a trigger showing the current sound that expands into a
 * category-filtered list. Picking a sound assigns it and previews it; the play button on each
 * row previews without assigning.
 */
export function SoundPicker({
  value,
  onChange,
  onPreview,
}: {
  value: SoundId | null;
  onChange: (soundId: SoundId) => void;
  onPreview: (soundId: SoundId) => void;
}) {
  const groups = useMemo(() => soundsByCategory(), []);
  const current = getSound(value);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<SoundCategory>(current?.category ?? "kick");
  const listId = useId();
  const sounds = groups.get(category) ?? [];

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center gap-2.5 rounded-control border border-border bg-surface-2 px-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {current ? (
          <>
            <span
              className="size-2.5 shrink-0 rounded-full bg-(--pad)"
              data-color={CATEGORY_META[current.category].color}
              aria-hidden
            />
            <span className="flex-1 truncate">{current.name}</span>
            <span className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
              {CATEGORY_META[current.category].label}
            </span>
          </>
        ) : (
          <span className="flex-1 text-muted">
            {value ? "Missing sound — choose another" : "Choose a sound"}
          </span>
        )}
        <ChevronDown
          className={cn("size-4 text-muted transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open && (
        <div id={listId} className="mt-2 rounded-control border border-border bg-surface-2/60 p-2">
          <div
            className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto"
            role="tablist"
            aria-label="Sound categories"
          >
            {[...groups.keys()].map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={cat === category}
                data-color={CATEGORY_META[cat].color}
                onClick={() => setCategory(cat)}
                className={cn(
                  "h-9 shrink-0 rounded-full px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  cat === category
                    ? "bg-(--pad) text-bg"
                    : "border border-border text-muted hover:text-text",
                )}
              >
                {CATEGORY_META[cat].label}
              </button>
            ))}
          </div>
          <ul
            role="listbox"
            aria-label={`${CATEGORY_META[category].label} sounds`}
            className="max-h-56 overflow-y-auto"
          >
            {sounds.map((sound) => {
              const selected = sound.id === value;
              return (
                <li
                  key={sound.id}
                  role="option"
                  aria-selected={selected}
                  className="flex items-center gap-1"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(sound.id);
                      onPreview(sound.id);
                    }}
                    className={cn(
                      "flex h-11 flex-1 items-center gap-2.5 rounded-[9px] px-2.5 text-left text-sm outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-focus",
                      selected && "text-accent",
                    )}
                  >
                    <span className="size-4">
                      {selected && <Check className="size-4" aria-hidden />}
                    </span>
                    {sound.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`Preview ${sound.name}`}
                    onClick={() => onPreview(sound.id)}
                    className="grid size-11 place-items-center rounded-[9px] text-muted outline-none hover:bg-surface-2 hover:text-text focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <Play className="size-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
