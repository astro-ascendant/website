import type { ReactNode } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/arc/tabs/tabs";
import { ChartQuote } from "@/components/chart/quote";
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
import { formatLongitude } from "@/lib/zodiac";

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
 * The same division as a table: Lagna, then each planet's sign, degree and
 * house. Star shows on D1 only, where the star is the planet's own.
 */
function DivisionPlanetsTable({ division }: { division: number }) {
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
  const isD1 = division === 1;
  const lagnaHouse = divisionData.houses.find((house) => house.number === 1);
  const lagna = {
    sign: isD1 ? result.lagna.sign : (lagnaHouse?.sign ?? result.lagna.sign),
    longitude: isD1
      ? result.lagna.longitude
      : (divisionData.lagna?.longitude ?? lagnaHouse?.cusp ?? null),
  };
  const placements = [...divisionData.placements].sort(
    (a, b) => bodyRank(a.body) - bodyRank(b.body),
  );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Planet</TableHead>
          <TableHead>Sign</TableHead>
          <TableHead>Degree</TableHead>
          {isD1 ? <TableHead>Star</TableHead> : null}
          <TableHead>House</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody tone="muted">
        <TableRow>
          <TableCell tone="default">Lagna</TableCell>
          <TableCell>{lagna.sign}</TableCell>
          <TableCell className="tabular-nums">
            {formatLongitude(lagna.longitude) || "-"}
          </TableCell>
          {isD1 ? (
            <TableCell>
              {result.lagna.star ? result.lagna.star : "-"}
              {result.lagna.pada ? (
                <span className="text-muted-foreground">
                  {" "}
                  · {result.lagna.pada}
                </span>
              ) : null}
            </TableCell>
          ) : null}
          <TableCell className="tabular-nums">1</TableCell>
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
              {formatLongitude(placement.longitude) || "-"}
            </TableCell>
            {isD1 ? (
              <TableCell>
                {placement.star === "" ? "-" : placement.star}
                {placement.pada ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · {placement.pada}
                  </span>
                ) : null}
              </TableCell>
            ) : null}
            <TableCell className="tabular-nums">
              {placement.house > 0 ? placement.house : "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Chart and its table side by side on wide screens, stacked below. */
function DivisionPanel({ division }: { division: number }) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
      <SignHouseChart division={division} />
      <DivisionPlanetsTable division={division} />
    </div>
  );
}

const BIRTH_CAPTIONS = {
  d1: "D1 is your chart as the sky was at the moment of birth. Every other division in this report zooms into it, so start here for the whole picture: where each planet sat, and the sign that was rising on your eastern horizon.",
  d9: "D9 is the chart of what ripens underneath the surface. Astrologers read it for marriage and for the true strength of a planet, since a planet that looks powerful in D1 but sits poorly here delivers less in real life.",
};

/** Rashi and Navamsha tabs. `captions` swaps the birth-chart copy; `null` hides it. */
export function ChartSignHouseCharts({
  captions = BIRTH_CAPTIONS,
}: {
  captions?: { d1: string; d9: string } | null;
} = {}) {
  return (
    <Tabs defaultValue="D1">
      <TabsList variant="line" containerClassName="max-w-full self-start">
        <TabsTrigger value="D1">D1 · Rashi</TabsTrigger>
        <TabsTrigger value="D9">D9 · Navamsha</TabsTrigger>
      </TabsList>
      <TabsContent value="D1" className="flex flex-col gap-4">
        {captions ? <ChartQuote>{captions.d1}</ChartQuote> : null}
        <DivisionPanel division={1} />
      </TabsContent>
      <TabsContent value="D9" className="flex flex-col gap-4">
        {captions ? <ChartQuote>{captions.d9}</ChartQuote> : null}
        <DivisionPanel division={9} />
      </TabsContent>
    </Tabs>
  );
}
