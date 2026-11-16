import type { ReactNode } from "react";

/** Inline value chip for a value in running text, such as an ayanamsa name. */
export function ChartCode({ children }: { children: ReactNode }) {
  return (
    <code className="bg-muted rounded-[0.3rem] px-[0.3rem] py-[0.15rem] font-mono text-[0.9em]">
      {children}
    </code>
  );
}
