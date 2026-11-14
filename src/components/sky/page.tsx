import { useEffect, useRef, useState } from "react";
import {
  ArrowClockwiseIcon,
  CalendarBlankIcon,
  ClockIcon,
  CrosshairIcon,
  MapPinIcon,
  NavigationArrowIcon,
} from "@phosphor-icons/react";
import { ActionButton } from "@/components/arc/action-button/action-button";
import { Chart } from "@/components/chart";
import {
  KpiStrip,
  MetaFact,
  type SummaryItem,
} from "@/components/chart/page";
import { ChartCalculating, ChartFailure } from "@/components/chart/results";
import { useChartSession } from "@/components/chart/session";
import { ChartSignHouseCharts } from "@/components/chart/sign-house-chart";
import {
  gutterClassName,
  SiteFrame,
  SiteHeader,
} from "@/components/site-frame";
import { Button } from "@/components/arc/button/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ChartBirthInput, ChartResult } from "@/lib/chart";
import { ChartRequestError } from "@/lib/chart-errors";
import { reversePlace } from "@/lib/place";
import { formatTimeZoneLabel } from "@/lib/timezone";
import { formatLongitude } from "@/lib/zodiac";
import { getChart } from "@/server/chart.functions";

const TITLE = "Current sidereal planetary position";

interface SkyPlace {
  place: string;
  latitude: number;
  longitude: number;
}

/** Ujjain, the traditional prime meridian of Indian astronomy. */
const DEFAULT_PLACE: SkyPlace = {
  place: "Ujjain, Madhya Pradesh, India",
  latitude: 23.1765,
  longitude: 75.7885,
};

const PLACE_STORAGE_KEY = "ascendant:sky-place";

function loadPlace(): SkyPlace {
  try {
    const raw = window.localStorage.getItem(PLACE_STORAGE_KEY);
    if (raw) {
      const value = JSON.parse(raw) as Partial<SkyPlace>;
      if (
        typeof value.place === "string" &&
        typeof value.latitude === "number" &&
        typeof value.longitude === "number"
      ) {
        return {
          place: value.place,
          latitude: value.latitude,
          longitude: value.longitude,
        };
      }
    }
  } catch {
    // Storage blocked or corrupt: fall back to the default place.
  }
  return DEFAULT_PLACE;
}

function savePlace(place: SkyPlace): void {
  try {
    window.localStorage.setItem(PLACE_STORAGE_KEY, JSON.stringify(place));
  } catch {
    // A remembered place is a convenience; losing it is harmless.
  }
}

const pad = (value: number) => String(value).padStart(2, "0");

/** The present moment as the session's wall-clock birth, on this device's clock. */
function nowAt(place: SkyPlace): ChartBirthInput {
  const now = new Date();
  return {
    name: TITLE,
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    ...place,
  };
}

/** This device's UTC offset, e.g. "+05:30". */
function deviceOffset(): string {
  const minutes = -new Date().getTimezoneOffset();
  const sign = minutes < 0 ? "-" : "+";
  const absolute = Math.abs(minutes);
  return `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

/**
 * Casts the device's present instant. The wall clock is the device's own, so
 * it goes over with the device's offset; reading it at the chosen place's zone
 * would shift the moment by the difference between the two.
 */
async function requestNow(
  birth: ChartBirthInput,
  signal: AbortSignal,
): Promise<ChartResult> {
  const response = await getChart({
    data: {
      utcIso: `${birth.date}T${birth.time}${deviceOffset()}`,
      latitude: birth.latitude,
      longitude: birth.longitude,
      place: birth.place,
      name: birth.name,
    },
    signal,
  });
  if (!response.ok) {
    throw new ChartRequestError(response.code);
  }
  return response.result;
}

/** Headline facts for the band under the title. */
function skySummary(result: ChartResult): SummaryItem[] {
  const d1 = result.divisions.find((division) => division.division === 1);
  const find = (body: string) =>
    d1?.placements.find((placement) => placement.body === body) ?? null;
  const at = (body: string) => {
    const placement = find(body);
    return placement
      ? `${placement.sign} ${formatLongitude(placement.longitude)}`
      : "-";
  };
  const moon = find("Moon");
  return [
    { label: "Sun", value: at("Sun") },
    { label: "Moon", value: at("Moon") },
    {
      label: "Moon star",
      value:
        moon && moon.star !== ""
          ? `${moon.star}${moon.pada ? ` · Pada ${moon.pada}` : ""}`
          : "-",
    },
    {
      label: "Ascendant",
      value: `${result.lagna.sign} ${formatLongitude(result.lagna.longitude)}`,
    },
  ];
}

function SkyResults({ onChangePlace }: { onChangePlace: () => void }) {
  const {
    state: { status, result },
  } = useChartSession();
  return (
    <div role="status" className="flex flex-col gap-4">
      {result === null && status !== "failure" ? <ChartCalculating /> : null}
      {status === "failure" ? (
        <ChartFailure onEditDetails={onChangePlace} />
      ) : null}
      {result !== null ? (
        <>
          <h2 className="sr-only">Rashi and Navamsha charts</h2>
          <ChartSignHouseCharts captions={null} />
        </>
      ) : null}
    </div>
  );
}

/** Place picker in a dialog on desktop and a drawer on touch screens. */
function SkyPlaceEditor({
  open,
  onOpenChange,
  onApply,
  onUseLocation,
  locationError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: () => Promise<void>;
  onUseLocation: () => Promise<void>;
  locationError: string;
}) {
  const isMobile = useIsMobile();
  const title = "Change place";
  const body = (
    <>
      <p className="text-muted-foreground text-sm">
        Planet positions are the same everywhere. The place sets the ascendant
        and the houses.
      </p>
      <Chart.PlaceField label="Place" />
      {locationError !== "" ? (
        <p role="alert" className="text-destructive text-sm">
          {locationError}
        </p>
      ) : null}
    </>
  );
  const actions = (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={() => void onUseLocation()}
      >
        <CrosshairIcon aria-hidden="true" />
        Use my location
      </Button>
      <ActionButton
        label="Show positions"
        pendingLabel="Calculating"
        successLabel="Updated"
        onAction={onApply}
        className="w-fit"
      />
    </div>
  );
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="down">
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          {body}
          <DrawerFooter>{actions}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {body}
        <DialogFooter>{actions}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatInstant(iso: string) {
  const instant = new Date(iso);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    date: instant.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    time: instant.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    zone: formatTimeZoneLabel(zone, iso) ?? undefined,
  };
}

/** How often the positions follow the clock while the page is visible. */
const REFRESH_MS = 60_000;

type PlaceSource = "device" | "chosen" | "fallback";

function locateDevice(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      reject,
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    );
  });
}

/** Two decimals is about a kilometre: precise enough for the ascendant, vague enough to share. */
const roughly = (value: number) => Math.round(value * 100) / 100;

/** The device's position, named by a reverse lookup when one succeeds. */
async function currentPlace(): Promise<SkyPlace> {
  const coords = await locateDevice();
  const latitude = roughly(coords.latitude);
  const longitude = roughly(coords.longitude);
  let place = "Current location";
  try {
    place = (await reversePlace(latitude, longitude)) ?? place;
  } catch {
    // The name is cosmetic; the coordinates are what the chart needs.
  }
  return { place, latitude, longitude };
}

const LOCATION_BLOCKED =
  "Location access is blocked. Allow it for this site in your browser, or pick a place.";

function SkyContent() {
  const {
    state: { result, status, selectedPlace },
    actions: { calculateFor, selectPlace },
  } = useChartSession();
  const [place, setPlace] = useState<SkyPlace>(DEFAULT_PLACE);
  const [source, setSource] = useState<PlaceSource | null>(null);
  const [locating, setLocating] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [locationError, setLocationError] = useState("");

  const cast = (target: SkyPlace) => calculateFor(nowAt(target));

  // The clock tick reads the latest place and editor state without re-arming.
  const latest = useRef({ cast, place, editorOpen, source });
  latest.current = { cast, place, editorOpen, source };

  // Show the last chosen place (or Ujjain) at once, then move to the device's
  // location when it arrives. A location prompt the reader never answers has
  // no timeout, so nothing waits on it. Runs after mount, so the server render
  // and hydration agree.
  useEffect(() => {
    let cancelled = false;
    const start = loadPlace();
    setPlace(start);
    setSource("fallback");
    void latest.current.cast(start).catch(() => {});
    setLocating(true);
    currentPlace()
      .then((next) => {
        // A place picked while the device was still locating wins.
        if (cancelled || latest.current.source === "chosen") {
          return;
        }
        setPlace(next);
        setSource("device");
        void latest.current.cast(next).catch(() => {});
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setLocating(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep "now" current: recast every minute, and on returning to the tab.
  useEffect(() => {
    if (source === null) {
      return;
    }
    const tick = () => {
      const { cast: run, place: at, editorOpen: editing } = latest.current;
      if (document.visibilityState === "visible" && !editing) {
        void run(at).catch(() => {});
      }
    };
    const timer = setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [source]);

  // The picker mirrors the place in use: it shows it when opened, drops an
  // unapplied pick when reopened, and never lets a stale pick override a place
  // that arrived from the device.
  useEffect(() => {
    if (source === null) {
      return;
    }
    selectPlace({
      id: `sky:${place.latitude},${place.longitude}`,
      name: place.place.split(",")[0]?.trim() || place.place,
      displayName: place.place,
      latitude: place.latitude,
      longitude: place.longitude,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place, source, editorOpen]);

  // Casting in progress closes the picker; the result updates behind it.
  useEffect(() => {
    if (editorOpen && status === "calculating") {
      setEditorOpen(false);
    }
  }, [editorOpen, status]);

  const applyPlace = async () => {
    const next: SkyPlace = selectedPlace
      ? {
          place: selectedPlace.displayName,
          latitude: selectedPlace.latitude,
          longitude: selectedPlace.longitude,
        }
      : place;
    await cast(next);
    setPlace(next);
    setSource("chosen");
    savePlace(next);
  };

  const switchToDeviceLocation = async () => {
    setLocationError("");
    try {
      const next = await currentPlace();
      await cast(next);
      setPlace(next);
      setSource("device");
    } catch {
      setLocationError(LOCATION_BLOCKED);
    }
  };

  const loading = source === null;
  const shown = loading ? "-" : place.place;
  const placeLabel = shown.split(",")[0]?.trim() || shown;
  const instant = result?.birth.utcIso
    ? formatInstant(result.birth.utcIso)
    : null;

  return (
    <>
      <section className="section-ticks">
        <div className={`w-full py-6 sm:py-10 ${gutterClassName}`}>
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-heading min-w-0 text-xl font-medium tracking-tight text-balance sm:text-3xl">
              {TITLE}
            </h1>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Refresh positions"
                disabled={loading || status === "calculating"}
                onClick={() => void cast(place).catch(() => {})}
              >
                <ArrowClockwiseIcon aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                aria-label="Change place"
                className="max-sm:size-9 max-sm:px-0!"
                disabled={loading}
                onClick={() => {
                  setLocationError("");
                  setEditorOpen(true);
                }}
              >
                <MapPinIcon aria-hidden="true" />
                <span className="hidden sm:inline">Change place</span>
              </Button>
            </div>
          </div>
          <dl className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 sm:mt-3 sm:gap-x-6 sm:gap-y-2">
            <MetaFact
              icon={CalendarBlankIcon}
              label="Date"
              value={instant?.date ?? "-"}
            />
            <MetaFact
              icon={ClockIcon}
              label="Time"
              value={instant?.time ?? "-"}
              hint={instant?.zone}
            />
            <MetaFact
              icon={source === "device" ? NavigationArrowIcon : MapPinIcon}
              label={source === "device" ? "Your location" : "Place"}
              value={placeLabel}
              hint={locating ? "Finding your location…" : undefined}
              title={shown !== placeLabel ? shown : undefined}
              className="max-sm:basis-full"
            />
          </dl>
          {result ? (
            <KpiStrip items={skySummary(result)} className="mt-4 sm:mt-8" />
          ) : null}
        </div>
      </section>

      <main id="content" className="section-ticks w-full flex-1">
        <div className={`w-full pt-4 pb-4 sm:py-10 ${gutterClassName}`}>
          <SkyResults onChangePlace={() => setEditorOpen(true)} />
        </div>
      </main>

      <SkyPlaceEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onApply={applyPlace}
        onUseLocation={switchToDeviceLocation}
        locationError={locationError}
      />
    </>
  );
}

/**
 * The sky at this moment, laid out like the chart report: headline facts,
 * then positions, the Rashi and Navamsha charts, and the KP views.
 */
export function SkyPage() {
  return (
    <Chart.Provider
      deps={{
        requestChart: requestNow,
        loadProfiles: () => [],
        saveProfiles: () => {},
      }}
    >
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
          <SkyContent />
        </SiteFrame>
      </div>
    </Chart.Provider>
  );
}
