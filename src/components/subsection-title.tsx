import type { ReactNode } from "react";
import { InfoTip } from "@/components/info-tip";

/** A subsection heading, with an optional note behind an info button. */
export function SubsectionTitle({
  title,
  info,
  label,
}: {
  title: ReactNode;
  info?: ReactNode;
  /** Names the note when `title` is not plain text. */
  label?: string;
}) {
  return (
    <h3 className="text-foreground flex items-center gap-1 text-base font-medium">
      <span>{title}</span>
      {info ? (
        <InfoTip label={label ?? (typeof title === "string" ? title : "this section")}>{info}</InfoTip>
      ) : null}
    </h3>
  );
}
