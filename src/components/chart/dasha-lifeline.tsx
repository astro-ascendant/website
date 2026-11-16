// The dasha display: one rail on one time axis for a whole dasha system, in
// the visual language of evilrabbit/lifeline (MIT): a thin dashed rail, a
// tick where each period begins, small uppercase labels and a quiet "now"
// line. Zoomed out it shows Mahadashas; zooming in, the same rail fills in
// Antardashas, then (for Vimshottari) Pratyantaras and Sookshmas, as each
// level gets room. The code is this site's own.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useReducedMotion } from "motion/react";
import {
  ArrowsInLineHorizontalIcon,
  CrosshairIcon,
  MinusIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { cn } from "cn";
import type { ChartDashaPeriod, ChartSubPeriod } from "@/lib/chart";
import { formatDashaDate, formatDashaDuration } from "@/lib/dasha-time";
import { getDashaSubPeriods } from "@/server/dasha.functions";

/** One period on the rail, with the chain of lords that leads to it. */
interface Span {
  lord: string;
  start: number;
  end: number;
  /** Lords from the Mahadasha down to this period. */
  path: string[];
}

const LEVELS = ["Mahadasha", "Antardasha", "Pratyantara", "Sookshma"] as const;
const LEVEL_PLURAL = ["Mahadashas", "Antardashas", "Pratyantaras", "Sookshmas"] as const;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const YEAR = 365.2425 * DAY;

/** Typical length of a period at each level, for choosing what fits. */
const TYPICAL = [120 / 9, 120 / 81, 120 / 729, 120 / 6561].map((years) => years * YEAR);
/**
 * A level shows once its typical period would be at least this wide: room
 * for a two-letter name, so a phone-width rail still opens a level early.
 */
const LEVEL_ROOM_PX = 28;
/** The narrowest window the rail zooms to. */
const MIN_WINDOW = 2 * DAY;

const PLANET_SHORT: Record<string, string> = {
  Sun: "Su",
  Moon: "Mo",
  Mars: "Ma",
  Mercury: "Me",
  Jupiter: "Ju",
  Venus: "Ve",
  Saturn: "Sa",
  Rahu: "Ra",
  Ketu: "Ke",
};

/** Two letters for a planet, three for a sign (Chara and Sthira are sign-based). */
const shortName = (lord: string) => PLANET_SHORT[lord] ?? lord.slice(0, 3);

const iso = (time: number) => new Date(time).toISOString();

/** Length of a period; short Sookshmas run hours, not days. */
function formatLength(start: number, end: number): string {
  if (end - start < 2 * DAY) {
    return `${Math.max(1, Math.round((end - start) / HOUR))}h`;
  }
  return formatDashaDuration(iso(start), iso(end));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ---------------- fetching Pratyantaras and Sookshmas ---------------- */

interface SubRequest {
  mahadasha: string;
  antardasha: string;
  pratyantardasha?: string;
  start: string;
  end: string;
}

const subPeriodCache = new Map<string, Promise<ChartSubPeriod[]>>();

function fetchSubPeriods(request: SubRequest): Promise<ChartSubPeriod[]> {
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
  return pending;
}

function requestFor(parent: Span): SubRequest {
  const [mahadasha, antardasha, pratyantardasha] = parent.path;
  return {
    mahadasha: mahadasha!,
    antardasha: antardasha!,
    ...(pratyantardasha === undefined ? {} : { pratyantardasha }),
    start: iso(parent.start),
    end: iso(parent.end),
  };
}

type Loaded = Map<string, ChartSubPeriod[] | "failed">;

/**
 * Children of each parent in `parents`, fetched as they come into view.
 * Returns what has arrived so far, keyed by request, and a retry.
 */
function useChildren(parents: readonly Span[]) {
  const [loaded, setLoaded] = useState<Loaded>(() => new Map());
  const [attempt, setAttempt] = useState(0);
  const signature = parents.map((parent) => JSON.stringify(requestFor(parent))).join("|");
  useEffect(() => {
    let cancelled = false;
    for (const parent of parents) {
      const request = requestFor(parent);
      const key = JSON.stringify(request);
      fetchSubPeriods(request).then(
        (spans) => {
          if (!cancelled) {
            setLoaded((current) =>
              current.get(key) === spans ? current : new Map(current).set(key, spans),
            );
          }
        },
        () => {
          if (!cancelled) {
            setLoaded((current) => new Map(current).set(key, "failed"));
          }
        },
      );
    }
    return () => {
      cancelled = true;
    };
    // `signature` stands for `parents`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, attempt]);
  const retry = useCallback(() => {
    setLoaded((current) => {
      const next = new Map(current);
      for (const [key, value] of next) {
        if (value === "failed") {
          next.delete(key);
        }
      }
      return next;
    });
    setAttempt((count) => count + 1);
  }, []);
  return { loaded, retry };
}

/** Splits loaded children into spans; parents still loading come back in `pending`. */
function childrenOf(parents: readonly Span[], loaded: Loaded) {
  const spans: Span[] = [];
  const pending: Span[] = [];
  let failed = false;
  for (const parent of parents) {
    const value = loaded.get(JSON.stringify(requestFor(parent)));
    if (value === undefined) {
      pending.push(parent);
    } else if (value === "failed") {
      failed = true;
      pending.push(parent);
    } else {
      for (const child of value) {
        spans.push({
          lord: child.lord,
          start: Date.parse(child.start),
          end: Date.parse(child.end),
          path: [...parent.path, child.lord],
        });
      }
    }
  }
  return { spans, pending, failed };
}

/* ------------------------------ the view ------------------------------ */

interface View {
  start: number;
  end: number;
}

/** Keeps a view inside the timeline and no narrower than MIN_WINDOW. */
function clampView(view: View, extent: View): View {
  const full = extent.end - extent.start;
  const length = Math.min(full, Math.max(MIN_WINDOW, view.end - view.start));
  let start = Math.max(extent.start, Math.min(view.start, extent.end - length));
  if (!Number.isFinite(start)) {
    start = extent.start;
  }
  return { start, end: start + length };
}

/** The view, plus a tween towards a new one that respects reduced motion. */
function useView(extent: View) {
  const reduce = useReducedMotion();
  const [view, setViewState] = useState<View>(extent);
  const current = useRef(view);
  const frame = useRef(0);

  const setView = useCallback(
    (next: View) => {
      cancelAnimationFrame(frame.current);
      const clamped = clampView(next, extent);
      current.current = clamped;
      setViewState(clamped);
    },
    [extent],
  );

  const animateTo = useCallback(
    (target: View) => {
      const to = clampView(target, extent);
      if (reduce) {
        setView(to);
        return;
      }
      cancelAnimationFrame(frame.current);
      const from = current.current;
      const began = performance.now();
      const duration = 420;
      // Tween the width in log space, so deep zooms feel even.
      const fromLength = Math.log(from.end - from.start);
      const toLength = Math.log(to.end - to.start);
      const fromCentre = (from.start + from.end) / 2;
      const toCentre = (to.start + to.end) / 2;
      const step = (time: number) => {
        const t = Math.min(1, (time - began) / duration);
        const eased = 1 - (1 - t) ** 3;
        const length = Math.exp(fromLength + (toLength - fromLength) * eased);
        const centre = fromCentre + (toCentre - fromCentre) * eased;
        const next = clampView({ start: centre - length / 2, end: centre + length / 2 }, extent);
        current.current = next;
        setViewState(next);
        if (t < 1) {
          frame.current = requestAnimationFrame(step);
        }
      };
      frame.current = requestAnimationFrame(step);
    },
    [extent, reduce, setView],
  );

  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return { view, current, setView, animateTo };
}

/** The rendered width of an element, kept current as it resizes. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry?.contentRect.width ?? 0);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/* ------------------------------ the ruler ------------------------------ */

type TickUnit = "year" | "month" | "day";
const TICK_STEPS: { unit: TickUnit; every: number; approx: number }[] = [
  { unit: "year", every: 20, approx: 20 * YEAR },
  { unit: "year", every: 10, approx: 10 * YEAR },
  { unit: "year", every: 5, approx: 5 * YEAR },
  { unit: "year", every: 2, approx: 2 * YEAR },
  { unit: "year", every: 1, approx: YEAR },
  { unit: "month", every: 6, approx: YEAR / 2 },
  { unit: "month", every: 3, approx: YEAR / 4 },
  { unit: "month", every: 1, approx: YEAR / 12 },
  { unit: "day", every: 7, approx: 7 * DAY },
  { unit: "day", every: 2, approx: 2 * DAY },
  { unit: "day", every: 1, approx: DAY },
];

/** Calendar-aligned ruler ticks across the view, about 90px apart. */
function rulerTicks(view: View, width: number): { time: number; label: string }[] {
  const perPx = (view.end - view.start) / Math.max(width, 1);
  const step =
    [...TICK_STEPS].reverse().find((candidate) => candidate.approx / perPx >= 90) ??
    TICK_STEPS[0]!;
  const ticks: { time: number; label: string }[] = [];
  const first = new Date(view.start);
  let cursor: Date;
  if (step.unit === "year") {
    const year = Math.floor(first.getUTCFullYear() / step.every) * step.every;
    cursor = new Date(Date.UTC(year, 0, 1));
  } else if (step.unit === "month") {
    const month = Math.floor(first.getUTCMonth() / step.every) * step.every;
    cursor = new Date(Date.UTC(first.getUTCFullYear(), month, 1));
  } else {
    cursor = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), first.getUTCDate()));
  }
  for (let guard = 0; cursor.getTime() <= view.end && guard < 200; guard += 1) {
    const time = cursor.getTime();
    if (time >= view.start) {
      const month = MONTHS[cursor.getUTCMonth()]!;
      ticks.push({
        time,
        label:
          step.unit === "year"
            ? String(cursor.getUTCFullYear())
            : step.unit === "month"
              ? cursor.getUTCMonth() === 0
                ? String(cursor.getUTCFullYear())
                : month
              : `${cursor.getUTCDate()} ${month}`,
      });
    }
    if (step.unit === "year") {
      cursor = new Date(Date.UTC(cursor.getUTCFullYear() + step.every, 0, 1));
    } else if (step.unit === "month") {
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + step.every, 1));
    } else {
      cursor = new Date(time + step.every * DAY);
    }
  }
  return ticks;
}

/* ---------------------------- the timeline ---------------------------- */

const visibleIn = (spans: readonly Span[], view: View) =>
  spans.filter((span) => span.end > view.start && span.start < view.end);

const containing = (spans: readonly Span[], time: number) =>
  spans.find((span) => span.start <= time && time < span.end);

/**
 * A whole dasha system on one zoomable rail. Opens on the whole life, then
 * settles on the Mahadasha running now. Tap a period to zoom to it; drag or
 * scroll sideways to pan; pinch or Ctrl+scroll to zoom.
 */
export function DashaLifeline({
  periods,
  now: nowIso,
  depth,
  label,
}: {
  periods: readonly ChartDashaPeriod[];
  now: string;
  /** 2 for sign-based systems (Chara, Sthira); 4 for Vimshottari. */
  depth: 2 | 4;
  label: string;
}) {
  const now = Date.parse(nowIso);
  const reduce = useReducedMotion();

  const mahadashas = useMemo<Span[]>(
    () =>
      periods.map((period) => ({
        lord: period.mahadasha,
        start: Date.parse(period.start),
        end: Date.parse(period.end),
        path: [period.mahadasha],
      })),
    [periods],
  );
  const antardashas = useMemo<Span[]>(
    () =>
      periods.flatMap((period) =>
        period.antardashas.map((antar) => ({
          lord: antar.antardasha,
          start: Date.parse(antar.start),
          end: Date.parse(antar.end),
          path: [period.mahadasha, antar.antardasha],
        })),
      ),
    [periods],
  );
  const extent = useMemo<View>(
    () => ({
      start: mahadashas[0]?.start ?? 0,
      end: mahadashas[mahadashas.length - 1]?.end ?? 1,
    }),
    [mahadashas],
  );

  const [trackRef, width] = useWidth<HTMLDivElement>();
  const { view, current, setView, animateTo } = useView(extent);
  const span = view.end - view.start;
  const px = (time: number) => ((time - view.start) / span) * width;

  // The deepest level whose typical period has room at this zoom.
  const level = width
    ? Math.max(
        0,
        ...TYPICAL.slice(0, depth).map((typical, index) =>
          (typical / span) * width >= LEVEL_ROOM_PX ? index : 0,
        ),
      )
    : 0;

  // Pratyantaras for the Antardashas in view, Sookshmas for the Pratyantaras in view.
  const adsInView = level >= 2 ? visibleIn(antardashas, view) : [];
  const pratyantaraLoad = useChildren(adsInView);
  const pratyantaras = childrenOf(adsInView, pratyantaraLoad.loaded);
  const pdsInView = level >= 3 ? visibleIn(pratyantaras.spans, view) : [];
  const sookshmaLoad = useChildren(pdsInView);
  const sookshmas = childrenOf(pdsInView, sookshmaLoad.loaded);

  // The running chain, for the summary under the rail.
  const nowMd = containing(mahadashas, now);
  const nowAd = containing(antardashas, now);
  const nowAdList = useMemo(() => (depth === 4 && nowAd ? [nowAd] : []), [depth, nowAd]);
  const nowPdLoad = useChildren(nowAdList);
  const nowPd = containing(childrenOf(nowAdList, nowPdLoad.loaded).spans, now);
  const nowPdKey = nowPd ? nowPd.path.join(">") + nowPd.start : "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const nowPdList = useMemo(() => (nowPd ? [nowPd] : []), [nowPdKey]);
  const nowSdLoad = useChildren(nowPdList);
  const nowSd = containing(childrenOf(nowPdList, nowSdLoad.loaded).spans, now);
  const chain = [nowMd, nowAd, nowPd, nowSd].slice(0, depth);

  // Settle on the Mahadasha running now, after a beat on the whole life.
  const settled = useRef(false);
  useEffect(() => {
    if (settled.current || !width || !nowMd) {
      return;
    }
    // Marked only once it runs: a resize before then re-arms the timer.
    const timer = setTimeout(
      () => {
        settled.current = true;
        animateTo(nowMd);
      },
      reduce ? 0 : 500,
    );
    return () => clearTimeout(timer);
  }, [width, nowMd, animateTo, reduce]);

  // What the rail draws: the chosen level, with parents standing in while
  // their children load, and the level above as context.
  const levelSpans = [
    mahadashas,
    antardashas,
    [...pratyantaras.spans, ...pratyantaras.pending],
    [...sookshmas.spans, ...sookshmas.pending],
  ];
  const pendingSet = new Set(
    level === 2 ? pratyantaras.pending : level === 3 ? sookshmas.pending : [],
  );
  const failed = (level >= 2 && pratyantaras.failed) || (level >= 3 && sookshmas.failed);
  const segments = visibleIn(levelSpans[level]!, view);
  const parents = level > 0 ? visibleIn(levelSpans[level - 1]!, view) : [];
  const ticks = width ? rulerTicks(view, width) : [];

  /* ----------------------------- controls ----------------------------- */

  const zoomBy = (factor: number) => {
    const at = current.current;
    const centre = (at.start + at.end) / 2;
    const length = (at.end - at.start) * factor;
    return { start: centre - length / 2, end: centre + length / 2 };
  };
  const zoomToSpan = (target: Span) => {
    const pad = (target.end - target.start) * 0.04;
    animateTo({ start: target.start - pad, end: target.end + pad });
  };
  const goToNow = () => {
    const target = level >= 1 ? (containing(levelSpans[level - 1]!, now) ?? nowMd) : nowMd;
    if (target) {
      zoomToSpan(target);
    }
  };

  // Sideways wheel pans; pinch (a Ctrl+wheel) zooms at the pointer. A plain
  // vertical wheel is left to the page.
  useEffect(() => {
    const node = trackRef.current;
    if (!node) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      const at = current.current;
      const rect = node.getBoundingClientRect();
      const length = at.end - at.start;
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const anchor = at.start + ((event.clientX - rect.left) / rect.width) * length;
        const next = length * Math.exp(event.deltaY * 0.01);
        const ratio = (anchor - at.start) / length;
        setView({ start: anchor - next * ratio, end: anchor - next * ratio + next });
        return;
      }
      const sideways = event.shiftKey ? event.deltaY : event.deltaX;
      if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        event.preventDefault();
        const shift = (sideways / rect.width) * length;
        setView({ start: at.start + shift, end: at.end + shift });
      }
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [trackRef, current, setView]);

  // Drag to pan. A press that barely moves stays a tap on the period.
  const drag = useRef<{ x: number; view: View; moved: boolean } | null>(null);
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    drag.current = { x: event.clientX, view: current.current, moved: false };
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) {
      return;
    }
    const dx = event.clientX - state.x;
    if (!state.moved && Math.abs(dx) < 5) {
      return;
    }
    if (!state.moved) {
      state.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const shift = (-dx / Math.max(width, 1)) * (state.view.end - state.view.start);
    setView({ start: state.view.start + shift, end: state.view.end + shift });
  };
  const endDrag = () => {
    // The click that follows a drag still sees `moved`; forget it after.
    setTimeout(() => {
      drag.current = null;
    }, 0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const at = current.current;
    const length = at.end - at.start;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => animateTo({ start: at.start - length * 0.25, end: at.end - length * 0.25 }),
      ArrowRight: () => animateTo({ start: at.start + length * 0.25, end: at.end + length * 0.25 }),
      "+": () => animateTo(zoomBy(0.5)),
      "=": () => animateTo(zoomBy(0.5)),
      "-": () => animateTo(zoomBy(2)),
      Home: () => animateTo(extent),
    };
    const action = keys[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  };

  if (periods.length === 0) {
    return <p className="text-muted-foreground text-sm">No dasha periods.</p>;
  }

  const atWholeLife = span >= extent.end - extent.start - 1;
  const atMinimum = span <= MIN_WINDOW + 1;
  const controlClassName =
    "text-muted-foreground hover:text-foreground hover:bg-muted inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors duration-150 ease-out disabled:pointer-events-none disabled:opacity-40";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {/* Where the rail is, and the ways to move it. */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-muted-foreground text-xs sm:text-sm">
            <span className="text-foreground font-medium">{LEVEL_PLURAL[level]}</span>
            <span className="tabular-nums">
              {" · "}
              {formatDashaDate(iso(view.start))} to {formatDashaDate(iso(view.end))}
            </span>
          </p>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className={controlClassName}
              onClick={() => animateTo(zoomBy(2))}
              disabled={atWholeLife}
              aria-label="Zoom out"
            >
              <MinusIcon aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              className={controlClassName}
              onClick={() => animateTo(zoomBy(0.5))}
              disabled={atMinimum}
              aria-label="Zoom in"
            >
              <PlusIcon aria-hidden="true" className="size-4" />
            </button>
            <button type="button" className={controlClassName} onClick={goToNow} disabled={!nowMd}>
              <CrosshairIcon aria-hidden="true" className="size-4" />
              Now
            </button>
            <button
              type="button"
              className={controlClassName}
              onClick={() => animateTo(extent)}
              disabled={atWholeLife}
            >
              <ArrowsInLineHorizontalIcon aria-hidden="true" className="size-4" />
              Whole life
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          role="group"
          tabIndex={0}
          aria-label={`${label} timeline, showing ${LEVEL_PLURAL[level]}. Arrow keys pan, plus and minus zoom, Home shows the whole life.`}
          aria-roledescription="zoomable timeline"
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="focus-visible:ring-(--focus-ring) relative cursor-grab touch-pan-y overflow-hidden rounded-sm outline-none select-none focus-visible:ring-2 active:cursor-grabbing"
        >
          {/* Context: the level above, named over the stretch it covers. */}
          <div aria-hidden="true" className="relative h-6">
            {parents.map((parent) => {
              const left = px(parent.start);
              const right = px(parent.end);
              const labelLeft = Math.max(left, 0) + 6;
              const room = Math.min(right, width) - labelLeft;
              return (
                <div key={parent.path.join(">") + parent.start}>
                  <span className="bg-border absolute top-1 bottom-0 w-px" style={{ left }} />
                  {room > 24 ? (
                    <span
                      className="text-muted-foreground absolute top-0.5 overflow-hidden text-[10px] font-medium tracking-[0.14em] whitespace-nowrap uppercase sm:text-[11px]"
                      style={{ left: labelLeft, maxWidth: room }}
                    >
                      {room > 70 ? parent.path.join(" › ") : shortName(parent.lord)}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* The rail. */}
          <div className="relative h-16">
            <span
              aria-hidden="true"
              className="border-border absolute inset-x-0 top-0 origin-left border-t border-dashed motion-safe:animate-[dasha-rail-in_700ms_ease-out_both]"
            />
            {segments.map((segment) => {
              const left = px(segment.start);
              const segmentWidth = px(segment.end) - left;
              // A period cut off at the left edge keeps its label in view.
              const hidden = Math.max(0, -left);
              const room = Math.min(segmentWidth - hidden, width);
              const isNow = segment.start <= now && now < segment.end;
              const loading = pendingSet.has(segment);
              const name = LEVELS[segment.path.length - 1]!;
              return (
                <button
                  key={segment.path.join(">") + segment.start}
                  type="button"
                  tabIndex={-1}
                  title={`${segment.path.join(" › ")}: ${formatDashaDate(iso(segment.start))} to ${formatDashaDate(iso(segment.end))} (${formatLength(segment.start, segment.end)})`}
                  aria-label={`${segment.lord} ${name}, ${formatDashaDate(iso(segment.start))} to ${formatDashaDate(iso(segment.end))}${isNow ? ", running now" : ""}`}
                  onClick={() => {
                    if (!drag.current?.moved) {
                      zoomToSpan(segment);
                    }
                  }}
                  style={{ left, width: segmentWidth, paddingInlineStart: hidden + 6 }}
                  className={cn(
                    "group absolute inset-y-0 flex flex-col items-start overflow-hidden pt-3 text-left outline-none transition-colors duration-150 ease-out",
                    isNow
                      ? "bg-foreground/[0.06] text-foreground"
                      : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground",
                    loading && "motion-safe:animate-pulse",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="bg-border group-hover:bg-foreground/50 absolute top-0 left-0 h-2.5 w-px"
                  />
                  {room >= 22 ? (
                    <span className="max-w-full overflow-hidden text-xs font-medium whitespace-nowrap sm:text-sm">
                      {room >= 64 ? segment.lord : shortName(segment.lord)}
                    </span>
                  ) : null}
                  {room >= 74 ? (
                    <span className="text-muted-foreground mt-0.5 max-w-full overflow-hidden text-[10px] whitespace-nowrap tabular-nums sm:text-[11px]">
                      {formatLength(segment.start, segment.end)}
                    </span>
                  ) : null}
                </button>
              );
            })}
            {now >= view.start && now < view.end ? (
              <span
                aria-hidden="true"
                style={{ left: px(now) }}
                className="bg-brand pointer-events-none absolute -top-1 bottom-0 w-0.5 -translate-x-1/2 rounded-full"
              >
                <span className="bg-brand absolute -top-0.5 left-1/2 size-2 -translate-x-1/2 rounded-full" />
              </span>
            ) : null}
          </div>

          {/* The ruler. */}
          <div aria-hidden="true" className="border-border relative h-6 border-t">
            {ticks.map((tick) => (
              <span key={tick.time} className="absolute top-0" style={{ left: px(tick.time) }}>
                <span className="bg-border absolute top-0 left-0 h-1.5 w-px" />
                <span className="text-muted-foreground absolute top-2 left-0 -translate-x-1/2 text-[10px] whitespace-nowrap tabular-nums sm:text-[11px]">
                  {tick.label}
                </span>
              </span>
            ))}
          </div>
        </div>

        {failed ? (
          <button
            type="button"
            onClick={() => {
              pratyantaraLoad.retry();
              sookshmaLoad.retry();
            }}
            className="text-foreground self-start text-xs font-medium underline-offset-4 hover:underline"
          >
            Some periods didn't load. Try again
          </button>
        ) : null}
      </div>

      {/* The chain running now, in reading order. */}
      <div className="border-border/70 flex flex-col rounded-xl border">
        <div className="border-border/70 border-b px-4 py-2.5">
          <span className="text-foreground text-sm font-medium">Running now</span>
        </div>
        <dl className="divide-border/70 divide-y">
          {chain.map((period, index) => (
            <div
              key={LEVELS[index]}
              className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-baseline gap-3 px-4 py-2.5 text-sm sm:grid-cols-[8rem_9rem_minmax(0,1fr)_auto]"
            >
              <dt className="text-muted-foreground text-[10px] font-medium tracking-[0.14em] uppercase sm:text-[11px]">
                {LEVELS[index]}
              </dt>
              <dd className="text-foreground font-medium">{period?.lord ?? "…"}</dd>
              <dd className="text-muted-foreground col-span-2 col-start-2 row-start-2 text-xs tabular-nums sm:col-span-1 sm:col-start-auto sm:row-start-auto sm:text-sm">
                {period
                  ? `${formatDashaDate(iso(period.start))} to ${formatDashaDate(iso(period.end))}`
                  : ""}
              </dd>
              <dd className="text-muted-foreground col-start-3 row-start-1 text-xs tabular-nums sm:col-start-auto sm:row-start-auto sm:text-sm">
                {period ? formatLength(period.start, period.end) : ""}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
