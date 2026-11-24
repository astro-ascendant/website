// The dasha display: a whole dasha system as a nested outline, read top to
// bottom like a table of contents. Each period opens in place to the periods
// inside it. Only the Mahadasha running now starts open, showing its
// Antardashas; everything deeper waits for a click.

import { useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import type { ChartDashaPeriod, ChartSubPeriod } from "@/lib/chart";
import { formatDashaDate, formatDashaDuration } from "@/lib/dasha-time";
import { getDashaSubPeriods } from "@/server/dasha.functions";

/** One period, with the chain of lords that leads to it. */
interface Span {
  lord: string;
  start: number;
  end: number;
  /** Lords from the Mahadasha down to this period. */
  path: string[];
}

const LEVELS = ["Mahadasha", "Antardasha", "Pratyantara", "Sookshma"] as const;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const YEAR = 365.2425 * DAY;

const iso = (time: number) => new Date(time).toISOString();
const spanKey = (span: Span) => span.path.join(">") + span.start;
const runs = (span: Span, time: number) => span.start <= time && time < span.end;

/** Length of a period; short Sookshmas run hours, not days. */
function formatLength(span: Span): string {
  if (span.end - span.start < 2 * DAY) {
    return `${Math.max(1, Math.round((span.end - span.start) / HOUR))}h`;
  }
  return formatDashaDuration(iso(span.start), iso(span.end));
}

/** Age in whole years at the start and end of a period: "5 to 15", or "38". */
function formatAges(span: Span, birth: number): string {
  const from = Math.max(0, Math.floor((span.start - birth) / YEAR));
  const to = Math.max(0, Math.floor((span.end - birth) / YEAR));
  return from === to ? String(from) : `${from} to ${to}`;
}

/* ---------------- fetching Pratyantaras and Sookshmas ---------------- */

const subPeriodCache = new Map<string, Promise<ChartSubPeriod[]>>();

function fetchChildren(parent: Span): Promise<Span[]> {
  const [mahadasha, antardasha, pratyantardasha] = parent.path;
  const request = {
    mahadasha: mahadasha!,
    antardasha: antardasha!,
    ...(pratyantardasha === undefined ? {} : { pratyantardasha }),
    start: iso(parent.start),
    end: iso(parent.end),
  };
  const key = JSON.stringify(request);
  let pending = subPeriodCache.get(key);
  if (!pending) {
    pending = getDashaSubPeriods({
      data: request as Parameters<typeof getDashaSubPeriods>[0]["data"],
    }).then((spans) => {
      // An empty answer is a failure too: every real period has nine parts.
      if (spans.length === 0) {
        throw new Error("No sub-periods");
      }
      return spans;
    });
    // A failure is not cached, so a retry asks the server again.
    pending.catch(() => subPeriodCache.delete(key));
    subPeriodCache.set(key, pending);
  }
  return pending.then((spans) =>
    spans.map((child) => ({
      lord: child.lord,
      start: Date.parse(child.start),
      end: Date.parse(child.end),
      path: [...parent.path, child.lord],
    })),
  );
}

type Loaded = Span[] | "loading" | "failed";

/** The Pratyantaras or Sookshmas of an open period, fetched once it opens. */
function useFetchedChildren(parent: Span, enabled: boolean) {
  const [state, setState] = useState<Loaded>("loading");
  const [attempt, setAttempt] = useState(0);
  const key = spanKey(parent);
  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    setState("loading");
    fetchChildren(parent).then(
      (spans) => !cancelled && setState(spans),
      () => !cancelled && setState("failed"),
    );
    return () => {
      cancelled = true;
    };
    // `key` stands for `parent`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, attempt]);
  return { state, retry: () => setAttempt((count) => count + 1) };
}

/* ------------------------------ the rows ------------------------------ */

interface Context {
  now: number;
  birth: number;
  depth: number;
  antardashas: Map<string, Span[]>;
}

/**
 * Columns from sm up: period, dates, length, age. Only the
 * period cell indents by level, so the other columns line up at every depth.
 */
const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-3 sm:grid-cols-[minmax(9.25rem,2fr)_minmax(12.5rem,2fr)_minmax(3rem,1fr)_minmax(4rem,1fr)] sm:[&>*]:whitespace-nowrap";
/** Indent of a level's period name; the caret and its gap add 1.375rem. */
const indentFor = (level: number) => `${level * 1.25}rem`;

function PeriodRow({ span, context }: { span: Span; context: Context }) {
  const { now, birth, depth } = context;
  const level = span.path.length - 1;
  const running = runs(span, now);
  const past = span.end <= now;
  const canOpen = level + 1 < depth;
  // Only the running Mahadasha starts open.
  const [open, setOpen] = useState(running && level === 0);
  const listId = useId();

  const cells = (
    <>
      <span
        className={cn("flex min-w-0 items-center gap-2 font-medium", level === 0 && "sm:text-base")}
        style={{ paddingInlineStart: indentFor(level) }}
      >
        <CaretRightIcon
          aria-hidden="true"
          className={cn(
            "text-muted-foreground size-3.5 shrink-0 transition-transform duration-150 ease-out",
            open && "rotate-90",
            !canOpen && "invisible",
          )}
        />
        <span className="truncate">{span.lord}</span>
        {running ? (
          <span className="bg-brand text-brand-foreground shrink-0 rounded-full px-1.5 py-px text-[10px] leading-tight font-medium">
            Now
          </span>
        ) : null}
      </span>
      <span className="text-muted-foreground text-xs tabular-nums sm:hidden">
        {formatLength(span)}
      </span>
      <span
        className="text-muted-foreground col-span-2 ps-(--date-indent) text-xs tabular-nums sm:col-span-1 sm:ps-0 sm:text-sm"
        style={{ "--date-indent": `calc(${indentFor(level)} + 1.375rem)` } as CSSProperties}
      >
        {formatDashaDate(iso(span.start))} to {formatDashaDate(iso(span.end))}
      </span>
      <span className="text-muted-foreground hidden tabular-nums sm:block">{formatLength(span)}</span>
      <span className="text-muted-foreground hidden tabular-nums sm:block">{formatAges(span, birth)}</span>
    </>
  );

  const rowClassName = cn(
    ROW_GRID,
    "w-full py-2 text-left text-sm",
    running && "bg-foreground/[0.04]",
    past && !running ? "text-muted-foreground" : "text-foreground",
  );
  return (
    <li>
      {canOpen ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={`${span.lord} ${LEVELS[level]}, ${formatDashaDate(iso(span.start))} to ${formatDashaDate(iso(span.end))}${running ? ", running now" : ""}`}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            rowClassName,
            "hover:bg-muted/60 focus-visible:ring-(--focus-ring) outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-inset",
          )}
        >
          {cells}
        </button>
      ) : (
        <div className={rowClassName}>
          {cells}
        </div>
      )}
      {canOpen && open ? (
        <Children id={listId} parent={span} context={context} />
      ) : null}
    </li>
  );
}

function Children({ id, parent, context }: { id: string; parent: Span; context: Context }) {
  const level = parent.path.length;
  // Antardashas come with the chart; deeper levels are fetched.
  const known = level === 1 ? context.antardashas.get(spanKey(parent)) : undefined;
  const { state, retry } = useFetchedChildren(parent, known === undefined);
  const spans = known ?? state;
  const indent = { paddingInlineStart: `calc(0.75rem + ${indentFor(level)} + 1.375rem)` };
  return (
    <ul id={id} aria-label={`${LEVELS[level]}s of ${parent.path.join(" › ")}`} className="divide-border/40 divide-y">
      {spans === "loading" ? (
        <li style={indent} className="text-muted-foreground py-2 text-xs motion-safe:animate-pulse">
          Loading {LEVELS[level]}s…
        </li>
      ) : spans === "failed" ? (
        <li style={indent} className="py-2">
          <button
            type="button"
            onClick={retry}
            className="text-foreground text-xs font-medium underline-offset-4 hover:underline"
          >
            These periods didn't load. Try again
          </button>
        </li>
      ) : (
        spans.map((span) => (
          <PeriodRow key={spanKey(span)} span={span} context={context} />
        ))
      )}
    </ul>
  );
}

/* ---------------------------- the outline ---------------------------- */

/**
 * A whole dasha system as a nested list. Mahadashas first, each opening to
 * its Antardashas, then (for Vimshottari) Pratyantaras and Sookshmas.
 */
export function DashaOutline({
  periods,
  now: nowIso,
  birth: birthIso,
  depth,
  label,
}: {
  periods: readonly ChartDashaPeriod[];
  now: string;
  /** Birth moment, for the age at each period. */
  birth: string;
  /** 2 for sign-based systems (Chara, Sthira); 4 for Vimshottari. */
  depth: 2 | 4;
  label: string;
}) {
  const now = Date.parse(nowIso);
  const birth = Date.parse(birthIso);
  // Remounting the list closes everything but the running Mahadasha.
  const [resetCount, setResetCount] = useState(0);

  const { mahadashas, antardashas } = useMemo(() => {
    const mahadashas: Span[] = periods.map((period) => ({
      lord: period.mahadasha,
      start: Date.parse(period.start),
      end: Date.parse(period.end),
      path: [period.mahadasha],
    }));
    const antardashas = new Map<string, Span[]>();
    periods.forEach((period, index) => {
      antardashas.set(
        spanKey(mahadashas[index]!),
        period.antardashas.map((antar) => ({
          lord: antar.antardasha,
          start: Date.parse(antar.start),
          end: Date.parse(antar.end),
          path: [period.mahadasha, antar.antardasha],
        })),
      );
    });
    return { mahadashas, antardashas };
  }, [periods]);

  if (mahadashas.length === 0) {
    return <p className="text-muted-foreground text-sm">No dasha periods.</p>;
  }

  const context: Context = { now, birth, depth, antardashas };
  const headingClassName =
    "text-muted-foreground text-xs font-medium";

  return (
    <div className="flex flex-col gap-2">
      <div className="border-border/70 overflow-hidden rounded-xl border">
        <div aria-hidden="true" className={cn(ROW_GRID, "border-border/70 hidden border-b py-2 sm:grid")}>
          <span className={cn(headingClassName, "ps-[1.375rem]")}>
            {/* Chara and Sthira periods are ruled by signs, not planets. */}
            {depth === 4 ? "Planet" : "Sign"}
          </span>
          <span className={headingClassName}>Period</span>
          <span className={headingClassName}>Length</span>
          <span className={headingClassName}>Age</span>
        </div>
        <ul key={resetCount} aria-label={`${label} Mahadashas`} className="divide-border/50 divide-y">
          {mahadashas.map((span) => (
            <PeriodRow key={spanKey(span)} span={span} context={context} />
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={() => setResetCount((count) => count + 1)}
        className="text-muted-foreground hover:text-foreground self-start text-xs font-medium transition-colors duration-150 ease-out"
      >
        Collapse to the running Mahadasha
      </button>
    </div>
  );
}
