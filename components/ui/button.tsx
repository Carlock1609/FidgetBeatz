import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Button styles for the FidgetBeatz chrome. Every size keeps a ≥ 44 px touch target
 * (the `icon` and `sm` sizes pad their hit area beyond the visible shape).
 */
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap transition-[background-color,color,box-shadow,opacity] duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-surface-2 text-text hover:bg-[color-mix(in_oklab,var(--surface-2),white_6%)]",
        accent: "bg-accent text-bg shadow-[0_0_24px_-6px_var(--accent)] hover:brightness-110",
        ghost: "text-muted hover:bg-surface-2 hover:text-text",
        outline: "border border-border text-text hover:bg-surface-2",
        danger:
          "bg-[color-mix(in_oklab,var(--pad-magenta)_18%,var(--surface-2))] text-[var(--pad-magenta)] hover:brightness-125",
      },
      size: {
        default: "h-11 px-4 text-sm",
        sm: "h-9 px-3 text-xs",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  /** Render the child element instead of a button (Radix Slot). */
  asChild?: boolean;
}

/** A themed button. */
export function Button({ className, variant, size, asChild, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
