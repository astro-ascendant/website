import type { ChartDashaPeriod } from "@/lib/chart";
import { SubsectionTitle } from "@/components/subsection-title";
import { useChartSession } from "@/components/chart/session";
import { DashaOutline } from "@/components/chart/dasha-outline";

const dashaIntros: Record<string, string> = {
  Vimshottari:
    "Planetary periods, four levels deep. The planet running now steers your life.",
  Chara:
    "Chapters ruled by signs. Today's sign shows the area of life in focus.",
  Sthira:
    "Periods through the fixed signs, read for health and stability.",
};

function DashaSystem({
  name,
  periods,
  now,
  birth,
  depth,
}: {
  name: string;
  birth: string;
  periods: ChartDashaPeriod[];
  now: string;
  depth: 2 | 4;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <SubsectionTitle title={name} info={dashaIntros[name]} />
      <DashaOutline periods={periods} now={now} birth={birth} depth={depth} label={name} />
    </div>
  );
}

/** Vimshottari across the full width, to four levels; Chara and Sthira side by side. */
export function ChartDashaTimelines() {
  const {
    state: { result },
    clock,
  } = useChartSession();
  if (!result) {
    return null;
  }
  const now = clock();
  const birth = result.birth.utcIso;
  return (
    <div className="flex flex-col gap-14 sm:gap-16">
      <DashaSystem
        name="Vimshottari"
        periods={result.dasha.vimshottari}
        now={now}
        birth={birth}
        depth={4}
      />
      <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-6">
        <DashaSystem name="Chara" periods={result.dasha.chara} now={now} birth={birth} depth={2} />
        <DashaSystem name="Sthira" periods={result.dasha.sthira} now={now} birth={birth} depth={2} />
      </div>
    </div>
  );
}

/**
 * Vimshottari periods for the KP chart. Same engine and same period maths as
 * the Dasha section, but fed by the KP calculation's own Moon position, so the
 * nakshatra balance follows the KP ayanamsa.
 */
export function ChartKpDashaTimeline() {
  const {
    state: { result },
    clock,
  } = useChartSession();
  if (!result) {
    return null;
  }
  return (
    <DashaOutline
      periods={result.kp.dasha.vimshottari}
      now={clock()}
      birth={result.birth.utcIso}
      depth={4}
      label="KP Vimshottari"
    />
  );
}
