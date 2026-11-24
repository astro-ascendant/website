import { useSyncExternalStore, type ReactNode } from "react";
import { InfoIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import { Popover } from "@base-ui/react/popover";

const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

function subscribeToHover(callback: () => void) {
  const query = window.matchMedia(HOVER_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/**
 * Whether the main pointer can hover. On a touch screen a tap would first
 * fire the hover open and then toggle it shut, so hover stays off there.
 */
function useCanHover() {
  return useSyncExternalStore(
    subscribeToHover,
    () => window.matchMedia(HOVER_QUERY).matches,
    () => false,
  );
}

/**
 * A small info button beside a heading. Hover shows the note where there is
 * a mouse; a touch opens it on phones and tablets, and a touch outside closes it.
 */
export function InfoTip({
  label,
  children,
  className,
}: {
  /** What the note explains, for the button's accessible name. */
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const canHover = useCanHover();
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover={canHover}
        delay={150}
        aria-label={`About ${label}`}
        className={cn(
          "text-muted-foreground hover:text-foreground focus-visible:ring-(--focus-ring) data-popup-open:text-foreground relative inline-flex size-6 shrink-0 touch-manipulation items-center justify-center rounded-full align-middle outline-none transition-colors duration-150 ease-out focus-visible:ring-2",
          // A finger needs more than the 24px icon; the hit area grows unseen.
          "after:absolute after:-inset-2.5 after:content-['']",
          className,
        )}
      >
        <InfoIcon aria-hidden="true" className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" sideOffset={6} collisionPadding={16} className="isolate z-50">
          <Popover.Popup className="bg-popover text-popover-foreground ring-foreground/5 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 w-64 max-w-[calc(100vw-2rem)] origin-(--transform-origin) rounded-xl p-3 text-left text-sm leading-relaxed font-normal tracking-normal text-pretty shadow-lg ring-1 outline-hidden duration-100">
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
