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
import { HeroConversation } from "@/components/chart/hero-conversation";
import { ChartDetailsEditor } from "@/components/chart/details-editor";
import {
  gutterClassName,
  heroLeadClassName,
  heroTitleClassName,
  SiteFrame,
  SiteFrameEnd,
  SiteHeader,
} from "@/components/site-frame";
import { ChartActions } from "@/components/chart/results";
import { useChartSession } from "@/components/chart/session";
import { Button } from "@/components/arc/button/button";
import {
  DottedPencil,
  ExpandingActionButton,
} from "@/components/motion/expanding-arrow-button";
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
      { label: "Dasha", value: facts.dasha },
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

/** The landing hero's type, a step smaller: a name sits beside the edit action. */
export const reportTitleClassName =
  "text-foreground text-3xl font-medium tracking-tight text-balance sm:text-4xl lg:text-5xl";

/**
 * The chart generator, outside the docs shell. Opens as a report on one
 * person (headline facts, then the analysis as one page of bands) with the birth-details
 * form behind one action, in a dialog on desktop and a drawer on mobile.
 */
export function ChartPage() {
  const {
    state: { status, result, attempt },
  } = useChartSession();
  const summary = useChartSummary();
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

        {hasBirth ? (
          <section className="section-ticks">
            <div className={`w-full py-10 sm:py-16 ${gutterClassName}`}>
              <div className="flex items-start justify-between gap-3">
                <h1 className={`min-w-0 ${reportTitleClassName}`}>
                  {birth.name || "Untitled chart"}
                </h1>
                <Button
                  type="button"
                  variant="secondary"
                  aria-label="Edit birth details"
                  className="shrink-0 max-sm:size-9 max-sm:px-0!"
                  onClick={() => setEditorOpen(true)}
                >
                  <PencilSimpleIcon aria-hidden="true" />
                  <span className="hidden sm:inline">Edit details</span>
                </Button>
              </div>
              <dl className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 sm:mt-5 sm:gap-x-6 sm:gap-y-2">
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
              {result ? <ChartActions className="mt-6 sm:mt-8" /> : null}
              {summary ? (
                <KpiStrip items={summary.items} className="mt-8 sm:mt-12" />
              ) : null}
            </div>
          </section>
        ) : (
          <section
            id={showResults ? undefined : "content"}
            aria-label="Create horoscope"
            className="section-ticks divide-border grid flex-1 md:grid-cols-2 md:divide-x"
          >
            <div
              className={`flex flex-col items-center justify-center py-16 text-center sm:py-24 md:items-start md:text-left ${gutterClassName}`}
            >
              <h1 className={`max-w-xl ${heroTitleClassName}`}>
                Create horoscope
              </h1>
              <p className={heroLeadClassName}>
                Uncover personalised insights about your career,
                relationships, timing, and life patterns with{" "}
                <span className="text-primary font-semibold whitespace-nowrap">
                  <ChatGptIcon
                    aria-hidden="true"
                    className="-my-2 me-0.5 inline-block size-8 align-middle"
                  />
                  ChatGPT
                </span>{" "}
                using the{" "}
                <code className="bg-muted rounded-[0.3rem] px-[0.3rem] py-[0.15rem] font-mono text-[0.9em]">
                  /ascendant
                </code>{" "}
                astrology skill.
              </p>
              <ExpandingActionButton
                icon={<DottedPencil className="size-5" />}
                className="mt-8 w-full sm:w-auto"
                onClick={() => setEditorOpen(true)}
              >
                Enter birth details
              </ExpandingActionButton>
            </div>
            <div
              className={`border-border flex items-center justify-center py-14 max-md:border-t sm:py-20 ${gutterClassName}`}
            >
              <HeroConversation />
            </div>
          </section>
        )}

        {showResults ? (
          <main id="content" className="w-full flex-1">
            <Chart.ResultSwitch onEditDetails={() => setEditorOpen(true)} />
          </main>
        ) : null}

        <SiteFrameEnd />
      </SiteFrame>

      <ChartDetailsEditor open={editorOpen} onOpenChange={setEditorOpen} />
    </div>
  );
}
