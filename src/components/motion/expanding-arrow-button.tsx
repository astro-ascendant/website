"use client";
// beui.dev/components/motion/expanding-arrow-button
// Adapted for this site: renders an anchor (wrapped with the router's
// `createLink` where used), takes its colours from site tokens instead of
// lime and neutral literals, and is sized and rounded to match the base
// button at its 48px `lg` size, using the control radius. Animated parts
// take `initial={false}` so the server renders their resting state;
// without it every expand-state chevron shows until hydration.

import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from "motion/react";
import {
  forwardRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import { cn } from "@/lib/utils";

export interface ExpandingArrowButtonProps extends Omit<
  HTMLMotionProps<"a">,
  "children"
> {
  children: ReactNode;
  accentClassName?: string;
  labelClassName?: string;
}

const ARROW_OPACITY = [1, 0.78, 0.54, 0.32, 0.16] as const;

/** Resting width of the accent pill, a little wider than its 40px height. */
const PILL_WIDTH = 44;

function DottedChevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 28"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="4" cy="4" r="2" fill="currentColor" />
      <circle cx="10" cy="9" r="2" fill="currentColor" />
      <circle cx="16" cy="14" r="2" fill="currentColor" />
      <circle cx="10" cy="19" r="2" fill="currentColor" />
      <circle cx="4" cy="24" r="2" fill="currentColor" />
    </svg>
  );
}

export const ExpandingArrowButton = forwardRef<
  HTMLAnchorElement,
  ExpandingArrowButtonProps
>(function ExpandingArrowButton(
  {
    children,
    className,
    accentClassName,
    labelClassName,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const active = (canHover && hovered) || focused;
  const layoutTransition = reduce ? { duration: 0 } : SPRING_LAYOUT;

  const handleMouseEnter = (event: MouseEvent<HTMLAnchorElement>) => {
    setHovered(true);
    onMouseEnter?.(event);
  };

  const handleMouseLeave = (event: MouseEvent<HTMLAnchorElement>) => {
    setHovered(false);
    onMouseLeave?.(event);
  };

  const handleFocus = (event: FocusEvent<HTMLAnchorElement>) => {
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLAnchorElement>) => {
    setFocused(false);
    onBlur?.(event);
  };

  return (
    <motion.a
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={SPRING_PRESS}
      className={cn(
        "bg-muted text-foreground relative inline-flex h-12 items-center overflow-hidden rounded-lg p-1 select-none",
        "focus-visible:ring-(--focus-ring) focus-visible:ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        className,
      )}
      {...rest}
    >
      <motion.span
        layout="size"
        aria-hidden="true"
        transition={layoutTransition}
        style={{
          width: active ? "calc(100% - 8px)" : PILL_WIDTH,
          // Concentric with the button: its radius minus the 4px inset.
          borderRadius: "calc(var(--radius) - 4px)",
        }}
        className={cn(
          "bg-brand text-brand-foreground absolute inset-y-1 left-1 z-10 overflow-hidden",
          accentClassName,
        )}
      >
        <motion.span
          initial={false}
          animate={{ opacity: active ? 0 : 1 }}
          transition={{ duration: reduce ? 0 : 0.1, ease: EASE_OUT }}
          className="absolute inset-0 grid place-items-center"
        >
          <DottedChevron className="h-5 w-3.5" />
        </motion.span>

        <span className="absolute inset-0 flex items-center justify-around px-3">
          {ARROW_OPACITY.map((opacity, index) => (
            <motion.span
              key={opacity}
              initial={false}
              animate={{
                opacity: active ? 1 : 0,
                transform:
                  active && !reduce ? "translateX(0px)" : "translateX(-6px)",
              }}
              transition={{
                duration: reduce ? 0 : 0.18,
                delay: active && !reduce ? 0.04 + index * 0.025 : 0,
                ease: EASE_OUT,
              }}
              style={{
                color: `color-mix(in oklab, currentColor ${opacity * 100}%, transparent)`,
              }}
              className="inline-grid place-items-center"
            >
              <DottedChevron className="h-5 w-3.5" />
            </motion.span>
          ))}
        </span>
      </motion.span>

      <motion.span
        initial={false}
        animate={{
          opacity: active ? 0 : 1,
          transform:
            active && !reduce ? "translateX(6px)" : "translateX(0px)",
        }}
        transition={{ duration: reduce ? 0 : 0.12, ease: EASE_OUT }}
        className={cn(
          "relative z-0 mr-6 ml-[60px] text-base font-medium whitespace-nowrap",
          labelClassName,
        )}
      >
        {children}
      </motion.span>
    </motion.a>
  );
});
