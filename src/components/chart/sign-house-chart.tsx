import type { ReactNode } from "react";
import {
  buildDivisionView,
  SOUTH_INDIAN_GRID_TEMPLATE,
  type DivisionOccupant,
} from "@/lib/chart-view";
import { useChartSession } from "@/components/chart/session";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatLongitude, starAt } from "@/lib/zodiac";

function Root({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col gap-4">
      <div
        role="img"
        aria-label={label}
        className="bg-foreground/25 mx-auto grid aspect-square w-full max-w-xl gap-px overflow-hidden border border-foreground/40"
        style={{
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gridTemplateRows: "repeat(4, minmax(0, 1fr))",
          gridTemplateAreas: SOUTH_INDIAN_GRID_TEMPLATE,
        }}
      >
        {children}
      </div>
    </figure>
  );
}

function Cell({
  area,
  isLagna,
  children,
}: {
  area: string;
  isLagna: boolean;
  children: ReactNode;
}) {
  return (
    <div
      style={{ gridArea: area }}
      className={cn(
        "bg-background relative flex min-h-0 flex-col overflow-hidden px-1.5 py-1.5 sm:px-2 sm:py-2",
        isLagna && "bg-accent shadow-[inset_0_0_0_1.5px_var(--foreground)]",
      )}
    >
      {children}
    </div>
  );
}

function Header({
  signShort,
  house,
  isLagna,
}: {
  signShort: string;
  house: number | null;
  isLagna: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-1">
      <span
        className={cn(
          "text-[10px] tracking-[0.12em] uppercase",
          isLagna ? "text-foreground/70" : "text-muted-foreground",
        )}
      >
        {signShort}
      </span>
      {house !== null ? (
        <span
          className={cn(
            "font-mono text-[10px] tabular-nums",
            isLagna ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {house}
        </span>
      ) : null}
    </div>
  );
}

function Body({ children }: { children: ReactNode }) {
  return (
    <ul className="flex min-h-0 flex-1 flex-col justify-center gap-0.2">
      {children}
    </ul>
  );
}

function Entry({ entry }: { entry: DivisionOccupant }) {
  return (
    <li
      className={cn(
        "flex items-baseline justify-between gap-1 font-mono text-[11px] leading-tight sm:text-xs",
        entry.isLagna ? "font-medium" : "font-normal",
      )}
    >
      <span>
        {entry.short}
        {entry.retrograde ? (
          <span className="text-muted-foreground"> r</span>
        ) : null}
      </span>
      <span className="text-muted-foreground tabular-nums">{entry.degree}</span>
    </li>
  );
}

function Center({ title }: { title: string }) {
  return (
    <div
      style={{ gridArea: "center" }}
      className="bg-background flex items-center justify-center px-3 text-center"
    >
      <span className="text-sm font-medium tracking-wide">{title}</span>
    </div>
  );
}

/**
 * Compound South Indian chart primitives. Callers compose Cell/Header/Body/
 * Entry pieces instead of passing variant flags through a monolith.
 */
export const SouthIndianChart = Object.assign(Root, {
  Cell,
  Header,
  Body,
  Entry,
  Center,
});

function SignHouseChart({ division }: { division: number }) {
  const {
    state: { result },
  } = useChartSession();

  if (!result) {
    return null;
  }

  const divisionData = result.divisions.find(
    (entry) => entry.division === division,
  );
  if (!divisionData) {
    return null;
  }
  const chart = buildDivisionView({
    lagna: result.lagna,
    division: divisionData,
  });

  return (
    <SouthIndianChart label={chart.label}>
      {chart.cells.map((cell) => (
        <SouthIndianChart.Cell
          key={cell.sign}
          area={cell.area}
          isLagna={cell.isLagna}
        >
          <SouthIndianChart.Header
            signShort={cell.signShort}
            house={cell.house}
            isLagna={cell.isLagna}
          />
          <SouthIndianChart.Body>
            {cell.occupants.map((occupant) => (
              <SouthIndianChart.Entry
                key={`${occupant.body}-${occupant.degree}`}
                entry={occupant}
              />
            ))}
          </SouthIndianChart.Body>
        </SouthIndianChart.Cell>
      ))}
      <SouthIndianChart.Center title={chart.title} />
    </SouthIndianChart>
  );
}

/** Traditional graha order; anything else follows in the order given. */
const BODY_ORDER = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
  "Rahu",
  "Ketu",
];

function bodyRank(body: string): number {
  const index = BODY_ORDER.indexOf(body);
  return index === -1 ? BODY_ORDER.length : index;
}

/**
 * One division as a table, read in the order of the chart above it: Lagna
 * first, then each planet's sign, house, degree and star in that division.
 * Rashi stars come from the engine; divisional stars are read from the
 * divisional longitude.
 */
function DivisionTable({ division }: { division: number }) {
  const {
    state: { result },
  } = useChartSession();
  if (!result) {
    return null;
  }
  const divisionData = result.divisions.find(
    (entry) => entry.division === division,
  );
  if (!divisionData) {
    return null;
  }
  const isRashi = division === 1;
  const lagnaHouse = divisionData.houses.find((house) => house.number === 1);
  const lagna = {
    sign: isRashi ? result.lagna.sign : (lagnaHouse?.sign ?? result.lagna.sign),
    longitude: isRashi
      ? result.lagna.longitude
      : (divisionData.lagna?.longitude ?? lagnaHouse?.cusp ?? null),
  };
  const placements = [...divisionData.placements].sort(
    (a, b) => bodyRank(a.body) - bodyRank(b.body),
  );
  const star = (name: string, pada: number | undefined | null) => (
    <>
      {name === "" ? "-" : name}
      {pada ? <span className="text-muted-foreground"> · {pada}</span> : null}
    </>
  );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Planet</TableHead>
          <TableHead>Sign</TableHead>
          <TableHead>House</TableHead>
          <TableHead>Degree</TableHead>
          <TableHead>Star</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody tone="muted">
        <TableRow>
          <TableCell tone="default">Lagna</TableCell>
          <TableCell>{lagna.sign}</TableCell>
          <TableCell className="tabular-nums">1</TableCell>
          <TableCell className="tabular-nums">
            {formatLongitude(lagna.longitude) || "-"}
          </TableCell>
          <TableCell>
            {isRashi
              ? star(result.lagna.star ?? "", result.lagna.pada)
              : star(starAt(lagna.longitude)?.name ?? "", starAt(lagna.longitude)?.pada)}
          </TableCell>
        </TableRow>
        {placements.map((placement) => (
          <TableRow key={placement.body}>
            <TableCell tone="default">
              {placement.body}
              {placement.state === "Retrograde" ? (
                <span className="text-muted-foreground ms-1" title="Retrograde">
                  (R)
                </span>
              ) : null}
            </TableCell>
            <TableCell>{placement.sign}</TableCell>
            <TableCell className="tabular-nums">
              {placement.house > 0 ? placement.house : "-"}
            </TableCell>
            <TableCell className="tabular-nums">
              {formatLongitude(placement.longitude) || "-"}
            </TableCell>
            <TableCell>
              {isRashi
                ? star(placement.star, placement.pada)
                : star(
                    starAt(placement.longitude)?.name ?? "",
                    starAt(placement.longitude)?.pada,
                  )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const BIRTH_CAPTIONS = {
  d1: "Your chart as the sky was at the moment of birth: where each planet sat, and the sign rising on the eastern horizon.",
  d9: "The chart of what ripens underneath. Read for marriage and for a planet's true strength.",
};

const DIVISIONS = [
  { division: 1, name: "Rashi", code: "D1", caption: "d1" },
  { division: 9, name: "Navamsha", code: "D9", caption: "d9" },
] as const;

/**
 * Rashi and Navamsha side by side (stacked on narrower screens), each with
 * its own planets table underneath, so a row never mixes the two charts.
 * `captions` swaps the birth-chart copy; `null` hides it.
 */
export function ChartSignHouseCharts({
  captions = BIRTH_CAPTIONS,
}: {
  captions?: { d1: string; d9: string } | null;
} = {}) {
  return (
    <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-x-8 lg:gap-y-4">
      {DIVISIONS.map((entry) => (
        // On desktop each column is a subgrid of three shared rows (caption,
        // chart, table), so both charts start level whatever the caption length.
        <section
          key={entry.division}
          className="flex min-w-0 flex-col gap-4 lg:row-span-3 lg:grid lg:grid-rows-subgrid"
        >
          <div className="flex flex-col gap-1">
            <h3 className="text-foreground text-base font-medium">
              {entry.name}{" "}
              <span className="text-muted-foreground font-mono text-sm font-normal">
                {entry.code}
              </span>
            </h3>
            {captions ? (
              <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
                {captions[entry.caption]}
              </p>
            ) : null}
          </div>
          <SignHouseChart division={entry.division} />
          <DivisionTable division={entry.division} />
        </section>
      ))}
    </div>
  );
}
