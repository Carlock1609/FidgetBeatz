"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useRef, type ComponentProps, type ReactNode } from "react";
import { useInertBackground } from "@/hooks/use-inert-background";
import { cn } from "@/lib/utils/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * Dialog content styled as a bottom sheet on phones and a centered card from `sm` up.
 * Radix provides focus trapping, Esc to close and aria wiring. Our dialogs are opened from
 * state rather than a `DialogTrigger`, so Radix has nowhere to return focus on close; this
 * returns it to `returnFocus()` if given, else to whatever was focused when the dialog opened
 * (if that element still exists). The app shell is made `inert` while it is open.
 */
export function DialogContent({
  className,
  children,
  title,
  description,
  hideClose,
  returnFocus,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: Omit<ComponentProps<typeof DialogPrimitive.Content>, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  hideClose?: boolean;
  /** Element to focus when the dialog closes; falls back to the element focused at open. */
  returnFocus?: () => HTMLElement | null | undefined;
}) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="data-[state=closed]:animate-out fixed inset-0 z-40 bg-black/60 data-[state=open]:animate-[fb-fade-in_150ms_ease-out]" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-[20px] border border-border bg-surface-1 p-5 pb-[max(20px,env(safe-area-inset-bottom))] text-text shadow-2xl outline-none",
          "data-[state=open]:animate-[fb-sheet-in_180ms_cubic-bezier(0.2,0.8,0.2,1)]",
          "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[min(440px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[20px] sm:pb-5 sm:data-[state=open]:animate-[fb-fade-in_150ms_ease-out]",
          className,
        )}
        {...props}
        onOpenAutoFocus={(event) => {
          // Fires before Radix moves focus in, so this is still the opening control.
          opener.current = document.activeElement as HTMLElement | null;
          onOpenAutoFocus?.(event);
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          if (event.defaultPrevented) return;
          const previous = opener.current;
          const target = returnFocus?.() ?? (previous?.isConnected ? previous : null);
          if (target) {
            event.preventDefault();
            target.focus();
          }
        }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <DialogPrimitive.Title className="text-lg font-extrabold tracking-tight">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-sm text-muted">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          {!hideClose && (
            <DialogPrimitive.Close
              className="-mt-2 -mr-2 grid size-11 shrink-0 place-items-center rounded-control text-muted outline-none hover:bg-surface-2 hover:text-text focus-visible:ring-2 focus-visible:ring-focus"
              aria-label="Close"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          )}
        </div>
        {children}
        <InertBackground />
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Mounted only while the dialog content is, so the shell is inert exactly while it's open. */
function InertBackground() {
  useInertBackground();
  return null;
}
