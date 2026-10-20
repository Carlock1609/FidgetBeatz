"use client";

import { ChevronDown, PencilLine, Plus, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PRESETS } from "@/data/presets";
import { useBoardDispatch, useBoardState } from "@/features/soundboard/board-provider";
import { selectActiveProfile } from "@/features/soundboard/board-reducer";
import { cn } from "@/lib/utils/cn";
import { LIMITS } from "@/types";

type DialogKind = "create" | "rename" | "delete" | null;

const inputClass =
  "h-11 w-full rounded-control border border-border bg-surface-2 px-3 text-base text-text outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-focus";

/** Profile dropdown: switch, create (≤ 5), rename, delete (not the last one). */
export function ProfileSwitcher() {
  const state = useBoardState();
  const dispatch = useBoardDispatch();
  const active = selectActiveProfile(state);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const canCreate = state.profiles.length < LIMITS.maxProfiles;

  if (!state.hydrated) {
    return <div className="h-11 w-40 rounded-control bg-surface-1" aria-hidden />;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            className="max-w-[60vw] justify-between gap-2 pr-3 pl-3 sm:max-w-xs"
            aria-label={`Profile: ${active.name}`}
          >
            <UserRound className="text-muted" />
            <span className="truncate">{active.name}</span>
            <ChevronDown className="text-muted" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>
            Profiles · {state.profiles.length}/{LIMITS.maxProfiles}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={active.id}
            onValueChange={(profileId) => dispatch({ type: "selectProfile", profileId })}
          >
            {state.profiles.map((profile) => (
              <DropdownMenuRadioItem key={profile.id} value={profile.id}>
                <span className="truncate">{profile.name}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!canCreate} onSelect={() => setDialog("create")}>
            <Plus />
            {canCreate ? "New profile…" : `New profile (max ${LIMITS.maxProfiles})`}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("rename")}>
            <PencilLine />
            Rename “{active.name}”…
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={state.profiles.length <= 1}
            onSelect={() => setDialog("delete")}
          >
            <Trash2 />
            Delete profile…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateProfileDialog
        open={dialog === "create"}
        onOpenChange={(o) => setDialog(o ? "create" : null)}
      />
      <RenameProfileDialog
        key={active.id}
        open={dialog === "rename"}
        onOpenChange={(o) => setDialog(o ? "rename" : null)}
        initialName={active.name}
        onRename={(name) => dispatch({ type: "renameProfile", profileId: active.id, name })}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(o) => setDialog(o ? "delete" : null)}
        title={`Delete “${active.name}”?`}
        description="This board and its pads will be removed from this browser."
        confirmLabel="Delete"
        destructive
        onConfirm={() => dispatch({ type: "deleteProfile", profileId: active.id })}
      />
    </>
  );
}

function RenameProfileDialog({
  open,
  onOpenChange,
  initialName,
  onRename,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName: string;
  onRename: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const valid = name.trim().length > 0;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setName(initialName);
        onOpenChange(o);
      }}
    >
      <DialogContent title="Rename profile">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            onRename(name);
            onOpenChange(false);
          }}
        >
          <label className="mb-1.5 block text-xs text-muted" htmlFor="rename-profile">
            Name ({name.trim().length}/{LIMITS.profileNameMax})
          </label>
          <input
            id="rename-profile"
            className={inputClass}
            value={name}
            maxLength={LIMITS.profileNameMax}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <div className="mt-5 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="accent" disabled={!valid}>
              Rename
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dispatch = useBoardDispatch();
  const [name, setName] = useState("");
  const [presetId, setPresetId] = useState(PRESETS[0]!.id);
  const valid = name.trim().length > 0;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setName("");
          setPresetId(PRESETS[0]!.id);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent
        title="New profile"
        description="Start from any preset — you can change everything later."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            dispatch({ type: "createProfile", name, presetId });
            onOpenChange(false);
          }}
        >
          <label className="mb-1.5 block text-xs text-muted" htmlFor="new-profile-name">
            Name
          </label>
          <input
            id="new-profile-name"
            className={inputClass}
            value={name}
            placeholder="My Board"
            maxLength={LIMITS.profileNameMax}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <fieldset className="mt-4">
            <legend className="mb-1.5 text-xs text-muted">Starting preset</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  role="radio"
                  aria-checked={presetId === preset.id}
                  data-color={preset.accent}
                  onClick={() => setPresetId(preset.id)}
                  className={cn(
                    "flex h-11 items-center gap-2 rounded-control border px-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus",
                    presetId === preset.id
                      ? "border-(--pad) bg-[color-mix(in_oklab,var(--pad)_16%,transparent)] text-text"
                      : "border-border text-muted hover:text-text",
                  )}
                >
                  <span className="size-2 rounded-full bg-(--pad)" aria-hidden />
                  {preset.name}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="mt-5 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="accent" disabled={!valid}>
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
