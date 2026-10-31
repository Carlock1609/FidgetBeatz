"use client";

import type { ReactNode } from "react";
import { Button } from "./button";
import { Dialog, DialogClose, DialogContent } from "./dialog";

/** A small yes/no dialog for destructive or work-losing actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive,
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  /** Where focus goes on close; see `DialogContent`. */
  returnFocus?: () => HTMLElement | null | undefined;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={title}
        description={description}
        role="alertdialog"
        returnFocus={returnFocus}
      >
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost">Keep</Button>
          </DialogClose>
          <Button
            variant={destructive ? "danger" : "accent"}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
