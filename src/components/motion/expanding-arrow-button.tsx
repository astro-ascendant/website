"use client";
// beui.dev/components/motion/expanding-arrow-button
// Adapted for this site: renders an anchor (wrapped with the router's
// `createLink` where used) or, as `ExpandingActionButton`, a button; takes
// its colours from site tokens instead of lime and neutral literals, and is
// sized and rounded to match the base button at its 48px `lg` size, using
// the control radius. The resting icon in the pill can be swapped. Animated
// parts take `initial={false}` so the server renders their resting state;
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

interface ExpandingOwnProps {
  children: ReactNode;
  /** Shown in the pill at rest; the dotted chevron when omitted. */
  icon?: ReactNode;
  accentClassName?: string;
  labelClassName?: string;
}

export interface ExpandingArrowButtonProps
  extends Omit<HTMLMotionProps<"a">, "children">,
    ExpandingOwnProps {}

export interface ExpandingActionButtonProps
  extends Omit<HTMLMotionProps<"button">, "children">,
    ExpandingOwnProps {}

const ARROW_OPACITY = [1, 0.78, 0.54, 0.32, 0.16] as const;

/** Resting width of the accent pill, a little wider than its 40px height. */
const PILL_WIDTH = 44;

const rootClassName = [
  "bg-muted text-foreground relative inline-flex h-12 touch-manipulation items-center justify-center overflow-hidden rounded-lg p-1 select-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]",
  "focus-visible:ring-(--focus-ring) focus-visible:ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
];

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

/** A pencil drawn in the chevron's dots: a tip and two body edges. */
export function DottedPencil({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="3" cy="21" r="2" fill="currentColor" />
      <circle cx="4" cy="13" r="2" fill="currentColor" />
      <circle cx="9" cy="8" r="2" fill="currentColor" />
      <circle cx="14" cy="3" r="2" fill="currentColor" />
      <circle cx="11" cy="20" r="2" fill="currentColor" />
      <circle cx="16" cy="15" r="2" fill="currentColor" />
      <circle cx="21" cy="10" r="2" fill="currentColor" />
    </svg>
  );
}

interface Handlers<E extends HTMLElement> {
  onMouseEnter?: (event: MouseEvent<E>) => void;
  onMouseLeave?: (event: MouseEvent<E>) => void;
  onFocus?: (event: FocusEvent<E>) => void;
  onBlur?: (event: FocusEvent<E>) => void;
}

/** Expanded while hovered (on hover-capable devices) or keyboard-focused. */
function useExpanded<E extends HTMLElement>(handlers: Handlers<E>) {
  const reduce = useReducedMotion() ?? false;
  const canHover = useHoverCapable();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return {
    active: (canHover && hovered) || focused,
    reduce,
    handlers: {
      onMouseEnter: (event: MouseEvent<E>) => {
        setHovered(true);
        handlers.onMouseEnter?.(event);
      },
      onMouseLeave: (event: MouseEvent<E>) => {
        setHovered(false);
        handlers.onMouseLeave?.(event);
      },
      onFocus: (event: FocusEvent<E>) => {
        setFocused(event.currentTarget.matches(":focus-visible"));
        handlers.onFocus?.(event);
      },
      onBlur: (event: FocusEvent<E>) => {
        setFocused(false);
        handlers.onBlur?.(event);
      },
    },
  };
}

function ExpandingParts({
  active,
  reduce,
  icon,
  accentClassName,
  labelClassName,
  children,
}: ExpandingOwnProps & { active: boolean; reduce: boolean }) {
  const layoutTransition = reduce ? { duration: 0 } : SPRING_LAYOUT;
  return (
    <>
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
          {icon ?? <DottedChevron className="h-5 w-3.5" />}
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
    </>
  );
}

export const ExpandingArrowButton = forwardRef<
  HTMLAnchorElement,
  ExpandingArrowButtonProps
>(function ExpandingArrowButton(
  {
    children,
    icon,
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
  const { active, reduce, handlers } = useExpanded<HTMLAnchorElement>({
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
  });
  return (
    <motion.a
      ref={ref}
      {...handlers}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={SPRING_PRESS}
      className={cn(...rootClassName, className)}
      {...rest}
    >
      <ExpandingParts
        active={active}
        reduce={reduce}
        icon={icon}
        accentClassName={accentClassName}
        labelClassName={labelClassName}
      >
        {children}
      </ExpandingParts>
    </motion.a>
  );
});

/** The same control as a button, for actions that do not navigate. */
export const ExpandingActionButton = forwardRef<
  HTMLButtonElement,
  ExpandingActionButtonProps
>(function ExpandingActionButton(
  {
    children,
    icon,
    className,
    accentClassName,
    labelClassName,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    type = "button",
    ...rest
  },
  ref,
) {
  const { active, reduce, handlers } = useExpanded<HTMLButtonElement>({
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
  });
  return (
    <motion.button
      ref={ref}
      type={type}
      {...handlers}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={SPRING_PRESS}
      className={cn(...rootClassName, "cursor-pointer", className)}
      {...rest}
    >
      <ExpandingParts
        active={active}
        reduce={reduce}
        icon={icon}
        accentClassName={accentClassName}
        labelClassName={labelClassName}
      >
        {children}
      </ExpandingParts>
    </motion.button>
  );
});
