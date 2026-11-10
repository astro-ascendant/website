import { useState } from "react";
import {
  CalendarBlankIcon,
  ClockIcon,
  MapPinIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import { cn } from "cn";
import { Chart } from "@/components/chart";
import { ChatGptIcon } from "@/components/chart/chatgpt-icon";
import { ChartDetailsEditor } from "@/components/chart/details-editor";
import {
  gutterClassName,
  SiteFrame,
  SiteHeader,
} from "@/components/site-frame";
import { useChartSession } from "@/components/chart/session";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { buildHeadlineView } from "@/lib/chart-view";
import { formatTimeZoneLabel } from "@/lib/timezone";

function formatLongDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return value === "" ? "-" : value;
  }
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** 24-hour input to a 12-hour clock, e.g. 09:45 becomes 9:45 AM. */
function formatClockTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) {
    return value === "" ? "-" : value;
  }
  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours < 12 ? "AM" : "PM";
  const clock = hours % 12 === 0 ? 12 : hours % 12;
  return `${clock}:${minutes} ${suffix}`;
}

/** The zone the chart was cast against, e.g. IST. The numeric offset is omitted. */
function formatZoneHint(
  timeZone: string | null,
  instantIso: string | null,
): string | undefined {
  if (timeZone === null || instantIso === null) {
    return undefined;
  }
  return formatTimeZoneLabel(timeZone, instantIso) ?? undefined;
}

/** One fact about the birth moment: leading icon, label for assistive tech, value. */
export function MetaFact({
  icon: Icon,
  label,
  value,
  hint,
  title,
  className,
}: {
  icon: typeof CalendarBlankIcon;
  label: string;
  value: string;
  hint?: string;
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("flex max-w-full min-w-0 items-center gap-1.5", className)}
    >
      <Icon
        aria-hidden="true"
        className="text-muted-foreground size-3.5 shrink-0"
      />
      <dt className="sr-only">{label}</dt>
      <dd
        className="text-muted-foreground truncate text-xs tabular-nums sm:text-sm"
        title={title ?? value}
      >
        {value}
        {hint ? (
          <span className="text-muted-foreground ms-1.5">{hint}</span>
        ) : null}
      </dd>
    </div>
  );
}

export interface SummaryItem {
  label: string;
  value: string;
}

/** Headline facts for the band under the name, derived from the live result. */
function useChartSummary(): { items: SummaryItem[] } | null {
  const {
    state: { result },
    clock,
  } = useChartSession();
  if (!result) {
    return null;
  }
  const d1 = result.divisions.find((division) => division.division === 1);
  const facts = buildHeadlineView(
    {
      lagna: result.lagna,
      d1,
      vimshottari: result.dasha.vimshottari,
    },
    clock(),
  );

  return {
    items: [
      { label: "Ascendant", value: facts.ascendant },
      { label: "Moon", value: facts.moon },
      { label: "Star", value: facts.star },
      { label: "Mahadasha", value: facts.mahadasha },
    ],
  };
}

/**
 * What the header shows about the birth: the resolved result when there is
 * one, or the submitted details when the calculation failed.
 */
interface ReportBirth {
  name: string;
  date: string;
  time: string;
  place: string;
  timeZone: string | null;
  utcIso: string | null;
}

/** Hairline-divided stat row: one grid, space and a single divider line. */
export function KpiStrip({
  items,
  className,
}: {
  items: SummaryItem[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "border-border/70 bg-border/70 grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-4",
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-background min-w-0 px-2.5 py-2 sm:px-4 sm:py-3"
        >
          <dt className="text-muted-foreground text-[10px] font-medium tracking-[0.14em] uppercase sm:text-[11px]">
            {item.label}
          </dt>
          <dd
            className="text-foreground mt-0.5 truncate text-sm tabular-nums sm:mt-1"
            title={item.value}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * On phones the result tabs float at the bottom edge of the screen, where a
 * thumb actually reaches, instead of sitting above the analysis. Desktop keeps
 * the in-flow bar. Driven by the same breakpoint as the birth-details overlay
 * so the two can never disagree. `fill` splits the strip evenly, so all five
 * tabs stay visible instead of scrolling.
 */
export const MOBILE_TAB_LIST =
  "fixed! inset-x-3 bottom-3 z-40 flex w-auto max-w-none! items-center rounded-(--radius-panel)! border-border/70! bg-muted/90! shadow-lg backdrop-blur [&_[data-slot=tabs-trigger]]:min-w-0! [&_[data-slot=tabs-trigger]]:px-2! [&_[data-slot=tabs-trigger]]:text-xs! [&_[data-slot=tabs-trigger]]:rounded-(--radius-control)!";

/**
 * The chart generator, outside the docs shell. Opens as a report on one
 * person (headline facts, then the tabbed analysis) with the birth-details
 * form behind one action, in a dialog on desktop and a drawer on mobile.
 */
export function ChartPage() {
  const {
    state: { status, result, attempt },
  } = useChartSession();
  const summary = useChartSummary();
  const isMobile = useIsMobile();
  const [editorOpen, setEditorOpen] = useState(false);
  // A failed calculation has no result, so the header reads the submitted
  // details instead: the reader keeps their place and the way back in.
  const birth: ReportBirth | null =
    result !== null
      ? result.birth
      : attempt !== null
        ? { ...attempt, timeZone: null, utcIso: null }
        : null;
  const hasBirth = birth !== null;
  const showResults = status !== "empty";
  const placeLabel =
    birth !== null ? birth.place.split(",")[0]?.trim() || "-" : "-";
  const placeTitle =
    birth !== null && birth.place !== placeLabel ? birth.place : undefined;

  return (
    <div className="bg-background text-foreground relative flex min-h-[100dvh] flex-col">
      <a
        href="#content"
        className="focus-visible:ring-ring sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:start-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-background focus-visible:px-3 focus-visible:py-1.5 focus-visible:text-sm focus-visible:font-medium focus-visible:ring-2 focus-visible:outline-none"
      >
        Skip to content
      </a>
      <div aria-hidden="true" className="paper-grain" />

      <SiteFrame>
        <SiteHeader />

        <section className="section-ticks">
          <div className={`w-full py-6 sm:py-10 ${gutterClassName}`}>
            <div className="flex flex-col gap-0">
              <div className="flex items-start justify-between gap-3">
                <h1 className="font-heading min-w-0 text-xl font-medium tracking-tight text-balance sm:text-3xl">
                  {hasBirth ? birth.name || "Untitled chart" : "Create horoscope"}
                </h1>
                {hasBirth ? (
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label="Edit birth details"
                    className="size-9 shrink-0 px-0 sm:h-9 sm:w-auto sm:px-3"
                    onClick={() => setEditorOpen(true)}
                  >
                    <PencilSimpleIcon aria-hidden="true" />
                    <span className="hidden sm:inline">Edit details</span>
                  </Button>
                ) : null}
              </div>
              {hasBirth ? (
                <dl className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 sm:mt-3 sm:gap-x-6 sm:gap-y-2">
                  <MetaFact
                    icon={CalendarBlankIcon}
                    label="Birth date"
                    value={formatLongDate(birth.date)}
                  />
                  <MetaFact
                    icon={ClockIcon}
                    label="Birth time"
                    value={formatClockTime(birth.time)}
                    hint={formatZoneHint(birth.timeZone, birth.utcIso)}
                  />
                  <MetaFact
                    icon={MapPinIcon}
                    label="Birth place"
                    value={placeLabel}
                    title={placeTitle}
                    className="max-sm:basis-full"
                  />
                </dl>
              ) : (
                <p className="text-muted-foreground mt-2 max-w-prose text-sm leading-relaxed text-pretty sm:text-base">
                  Create your horoscope and uncover personalised insights about
                  your career, relationships, timing, and life patterns with{" "}
                  <span className="text-primary font-semibold whitespace-nowrap">
                    <ChatGptIcon
                      aria-hidden="true"
                      className="me-1 inline-block size-4 align-[-0.125em]"
                    />
                    ChatGPT
                  </span>{" "}
                  using the{" "}
                  <code className="bg-muted rounded-[0.3rem] px-[0.3rem] py-[0.15rem] font-mono text-[0.9em]">
                    /ascendant
                  </code>{" "}
                  astrology skill.
                </p>
              )}
            </div>

            {summary ? (
              <KpiStrip items={summary.items} className="mt-4 sm:mt-8" />
            ) : null}
          </div>
        </section>

        <main id="content" className="section-ticks w-full flex-1">
          <div
            className={cn(
              `w-full pb-4 sm:py-10 ${gutterClassName}`,
              showResults ? "pt-4" : "pt-6",
            )}
          >
            {showResults ? (
              <>
                <Chart.ResultSwitch
                  tabListContainerClassName={
                    isMobile ? MOBILE_TAB_LIST : undefined
                  }
                  tabListFill={isMobile}
                  onEditDetails={() => setEditorOpen(true)}
                />
                {/* Clearance for the floating tab bar; only where it floats. */}
                {isMobile ? <div aria-hidden="true" className="h-16" /> : null}
              </>
            ) : (
              <section className="border-border/70 bg-card/40 flex flex-col items-start gap-4 rounded-xl border p-4 sm:p-8">
                <div className="flex flex-col gap-1.5">
                  <h2 className="font-heading text-base font-medium">
                    No horoscope yet?
                  </h2>
                  <p className="text-muted-foreground max-w-prose text-sm text-pretty">
                    Enter a birth date, time and place to generate a Rashi chart,
                    Navamsha chart, KP chart, Vimshottari dasha, Jaimini karakas
                    and Sarvashtakavarga.
                  </p>
                </div>
                <Button type="button" onClick={() => setEditorOpen(true)}>
                  Enter birth details
                </Button>
              </section>
            )}
          </div>
        </main>
      </SiteFrame>

      <ChartDetailsEditor open={editorOpen} onOpenChange={setEditorOpen} />
    </div>
  );
}
