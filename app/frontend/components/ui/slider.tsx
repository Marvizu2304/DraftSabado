// bm-design-system: slider primitive
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Greys the track out — for a value the user has not set yet. */
  muted?: boolean;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, muted, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="range"
        className={cn(
          "h-6 w-full cursor-pointer bg-transparent",
          muted
            ? "accent-[var(--color-ink-muted)]"
            : "accent-[var(--color-accent)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Slider.displayName = "Slider";

export { Slider };
