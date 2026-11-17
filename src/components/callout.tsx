import { Callout as BaseCallout } from "fumadocs-ui/components/callout";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Fumadocs sets callouts at text-sm with its tight default leading, which
// crowds two-line notes. Give every docs callout a 28px line, and drop the
// icon to sit on the first line instead of above it.
export function Callout({ className, ...props }: ComponentProps<typeof BaseCallout>) {
  return (
    <BaseCallout
      {...props}
      className={cn("leading-7 [&_p]:leading-7 [&_strong]:leading-7 [&>svg]:mt-1", className)}
    />
  );
}
