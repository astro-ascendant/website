import type { ChartDashaPeriod } from "@/lib/chart";
import { useChartSession } from "@/components/chart/session";
import { DashaLifeline } from "@/components/chart/dasha-lifeline";

const dashaIntros: Record<string, string> = {
  Vimshottari:
    "Vimshottari breaks your life into planetary periods. The period running now is the planet steering your life. Pick a period to zoom into its Antardashas, Pratyantaras and Sookshmas.",
  Chara:
    "Chara dasha treats your life as chapters, each owned by a zodiac sign. The sign in charge today shows the area of life in the spotlight right now.",
  Sthira:
    "Sthira dasha walks your chart through the fixed signs. It is the reading astrologers lean on when the question is about health, stability and how long something will last.",
};

function DashaSystem({
  name,
  periods,
  now,
  depth,
}: {
  name: string;
  periods: ChartDashaPeriod[];
  now: string;
  depth: 2 | 4;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-foreground text-base font-medium">{name}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
          {dashaIntros[name]}
        </p>
      </div>
      <DashaLifeline periods={periods} now={now} depth={depth} label={name} />
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
  return (
    <div className="flex flex-col gap-14 sm:gap-16">
      <DashaSystem
        name="Vimshottari"
        periods={result.dasha.vimshottari}
        now={now}
        depth={4}
      />
      <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-10">
        <DashaSystem name="Chara" periods={result.dasha.chara} now={now} depth={2} />
        <DashaSystem name="Sthira" periods={result.dasha.sthira} now={now} depth={2} />
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
    <DashaLifeline
      periods={result.kp.dasha.vimshottari}
      now={clock()}
      depth={4}
      label="KP Vimshottari"
    />
  );
}
