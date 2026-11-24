import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { gutterClassName, SectionHeading } from "@/components/site-frame";
import { cn } from "cn";
import { InfoTip } from "@/components/info-tip";
import { SubsectionTitle } from "@/components/subsection-title";
import { ChartActions } from "@/components/chart/results";
import { useChartSession } from "@/components/chart/session";
import { ChartSignHouseCharts } from "@/components/chart/sign-house-chart";
import {
  ChartDashaTimelines,
  ChartKpDashaTimeline,
} from "@/components/chart/dasha-timeline";
import {
  ChartKpCuspTable,
  ChartKpTable,
} from "@/components/chart/kp-table";
import { ChartKpCircularChart } from "@/components/chart/kp-circular-chart";

/** One Jaimini reading, styled like the chart subsections: heading, then table. */
function JaiminiPart({
  title,
  info,
  children,
}: {
  title: string;
  info: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <SubsectionTitle title={title} info={info} />
      {children}
    </section>
  );
}

const listOrDash = (values: readonly string[]) =>
  values.length > 0 ? values.join(", ") : "-";

function ChartJaiminiTables() {
  const {
    state: { result },
  } = useChartSession();
  if (!result) {
    return null;
  }
  const { jaimini } = result;
  return (
    <div className="grid items-start gap-12 md:grid-cols-2 md:gap-x-8 md:gap-y-14">
      <JaiminiPart
        title="Chara Karakas"
        info="Planets ranked by degree. The highest is your Atmakaraka, the soul of the chart."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Planet</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody tone="muted">
            {jaimini.karakas.map((karaka) => (
              <TableRow key={karaka.role}>
                <TableCell tone="default">{karaka.role}</TableCell>
                <TableCell>{karaka.planet}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </JaiminiPart>

      <JaiminiPart
        title="Arudha Pada"
        info="How the world sees each house, as against what it truly holds."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>House</TableHead>
              <TableHead>Pada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody tone="muted">
            {jaimini.arudha.map((entry) => (
              <TableRow key={entry.house}>
                <TableCell tone="default">{entry.house}</TableCell>
                <TableCell>{entry.pada === "" ? "-" : entry.pada}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </JaiminiPart>

      <JaiminiPart
        title="Karakamsha and Upapada"
        info="Karakamsha is read for purpose and livelihood; Upapada for marriage."
      >
        <Table>
          <TableBody tone="muted">
            <TableRow>
              <TableHead>Karakamsha</TableHead>
              <TableCell>{jaimini.karakamsha === "" ? "-" : jaimini.karakamsha}</TableCell>
            </TableRow>
            <TableRow>
              <TableHead>Upapada</TableHead>
              <TableCell>{jaimini.upapada === "" ? "-" : jaimini.upapada}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </JaiminiPart>

      <JaiminiPart
        title="Drishti and Argala"
        info="Drishti: the signs that aspect your Lagna. Argala: what supports or blocks it."
      >
        <Table>
          <TableBody tone="muted">
            <TableRow>
              <TableHead>Rashi Drishti on Lagna</TableHead>
              <TableCell>{listOrDash(jaimini.drishti)}</TableCell>
            </TableRow>
            <TableRow>
              <TableHead>Supporting Argala</TableHead>
              <TableCell>{listOrDash(jaimini.argala.supporting)}</TableCell>
            </TableRow>
            <TableRow>
              <TableHead>Obstructing Argala</TableHead>
              <TableCell>{listOrDash(jaimini.argala.obstructing)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </JaiminiPart>
    </div>
  );
}

function Subsection({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-4", className)}>
      <SubsectionTitle title={title} />
      {children}
    </div>
  );
}

/** The wheel beside the planets, then the cusps and the KP dasha. */
function ChartKpPanels() {
  const {
    state: { result },
  } = useChartSession();
  if (!result) {
    return null;
  }
  return (
    <div className="flex flex-col gap-12 sm:gap-14">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8">
        <ChartKpCircularChart />
        <Subsection title="Planets">
          <ChartKpTable />
        </Subsection>
      </div>
      <Subsection title="Cusps">
        <ChartKpCuspTable />
      </Subsection>
      <Subsection title="Vimshottari, KP ayanamsa">
        <ChartKpDashaTimeline />
      </Subsection>
    </div>
  );
}

function ChartSavTable() {
  const {
    state: { result },
  } = useChartSession();
  if (!result) {
    return null;
  }
  const peakByPlanet = new Map(
    result.sav.rows.map((row) => [row.planet, Math.max(...row.points)]),
  );
  const troughByPlanet = new Map(
    result.sav.rows.map((row) => [row.planet, Math.min(...row.points)]),
  );
  return (
    <Table className="text-[11px] sm:text-sm [&_td]:px-2 [&_td]:py-2 [&_th]:h-auto [&_th]:px-2 [&_th]:py-2 sm:[&_td]:px-3 sm:[&_td]:py-3 sm:[&_th]:h-12 sm:[&_th]:px-3">
      <TableHeader>
        <TableRow>
          <TableHead>Sign</TableHead>
          {result.sav.rows.map((row) => (
            <TableHead key={row.planet}>{row.planet}</TableHead>
          ))}
          <TableHead>Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody tone="muted">
        {result.sav.signs.map((sign, signIndex) => (
          <TableRow key={sign}>
            <TableCell tone="muted">{sign}</TableCell>
            {result.sav.rows.map((row) => {
              const value = row.points[signIndex] ?? 0;
              const tone =
                value === peakByPlanet.get(row.planet)
                  ? "primary"
                  : value === troughByPlanet.get(row.planet)
                    ? "destructive"
                    : "muted";
              return (
                <TableCell
                  key={row.planet}
                  tone={tone}
                  className="tabular-nums"
                >
                  {value}
                </TableCell>
              );
            })}
            <TableCell tone="muted" className="tabular-nums">
              {result.sav.signTotals[signIndex]}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Total</TableCell>
          {result.sav.rows.map((row) => (
            <TableCell key={row.planet} tone="muted" className="tabular-nums">
              {row.total}
            </TableCell>
          ))}
          <TableCell tone="muted" className="tabular-nums">
            {result.sav.total}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

const REPORT_SECTIONS = [
  { id: "charts", label: "Charts" },
  { id: "dasha", label: "Dasha" },
  { id: "kp", label: "KP" },
  { id: "jaimini", label: "Jaimini" },
  { id: "sav", label: "SAV" },
] as const;

type SectionId = (typeof REPORT_SECTIONS)[number]["id"];

/** One band of the report, laid out like a landing page section. */
function ReportSection({
  id,
  title,
  info,
  children,
}: {
  id: SectionId;
  title: string;
  /** The essentials, behind an info button beside the title. */
  info?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`section-ticks scroll-mt-6 py-14 sm:py-20 ${gutterClassName}`}
    >
      <SectionHeading
        id={`${id}-title`}
        title={title}
        info={info ? <InfoTip label={title}>{info}</InfoTip> : undefined}
      />
      <div className="mt-10 sm:mt-14">{children}</div>
    </section>
  );
}

/** The section whose band has reached a third of the way down the screen. */
function useCurrentSection(): SectionId {
  const [current, setCurrent] = useState<SectionId>(REPORT_SECTIONS[0].id);
  useEffect(() => {
    const update = () => {
      const line = window.innerHeight / 3;
      let next: SectionId = REPORT_SECTIONS[0].id;
      for (const section of REPORT_SECTIONS) {
        const element = document.getElementById(section.id);
        if (element && element.getBoundingClientRect().top <= line) {
          next = section.id;
        }
      }
      setCurrent(next);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return current;
}

/**
 * Jump links to each band, in a frosted pill floating at the foot of the
 * screen where a thumb reaches. Every section stays on the page; the pill only
 * scrolls to one and marks the one being read.
 */
function ReportNav() {
  const current = useCurrentSection();
  const reduce = useReducedMotion();
  return (
    <nav
      aria-label="Report sections"
      className="border-border/60 bg-background/70 fixed bottom-4 left-1/2 z-40 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 rounded-full border p-1 shadow-lg backdrop-blur-xl backdrop-saturate-150"
    >
      <ul className="flex">
        {REPORT_SECTIONS.map((section) => {
          const active = section.id === current;
          return (
            <li key={section.id} className="flex-1">
              <a
                href={`#${section.id}`}
                aria-current={active ? "location" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  document.getElementById(section.id)?.scrollIntoView({
                    behavior: reduce ? "auto" : "smooth",
                    block: "start",
                  });
                  window.history.replaceState(null, "", `#${section.id}`);
                }}
                className={cn(
                  "relative flex h-9 items-center justify-center rounded-full px-2 text-xs font-medium transition-colors duration-150 ease-out sm:text-sm",
                  active
                    ? "text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="report-nav-active"
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "spring", bounce: 0.15, duration: 0.4 }
                    }
                    className="bg-foreground absolute inset-0 rounded-full"
                  />
                ) : null}
                <span className="relative">{section.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * The whole report on one page: every section is a band, nothing hidden.
 * ChartResultSwitch loads it on demand, so the form opens without it.
 */
export default function ChartReport() {
  const {
    state: { result },
  } = useChartSession();
  if (!result) {
    return null;
  }
  return (
    <>
      <ReportSection
        id="charts"
        title="Birth charts"
      >
        <ChartSignHouseCharts />
      </ReportSection>

      <ReportSection
        id="dasha"
        title="Dashas"
        info="Periods of your life, each ruled by a planet or a sign. Open one to see the periods inside it."
      >
        <ChartDashaTimelines />
      </ReportSection>

      <ReportSection
        id="kp"
        title="Krishnamurthi Paddhati"
        info={`A timing system using the ${result.kp.astroParams.ayanamsa} ayanamsa and ${result.kp.astroParams.houseSystem} houses.`}
      >
        <ChartKpPanels />
      </ReportSection>

      <ReportSection
        id="jaimini"
        title="Jaimini"
      >
        <ChartJaiminiTables />
      </ReportSection>

      <ReportSection
        id="sav"
        title="Sarvashtakavarga"
        info="How strongly each sign supports each planet. Highlighted is a planet's strongest sign; red its weakest."
      >
        <ChartSavTable />
      </ReportSection>

      <section
        className={`section-ticks bg-card/40 flex flex-col items-center py-16 text-center sm:py-24 ${gutterClassName}`}
      >
        <h2 className="text-foreground text-2xl font-medium tracking-tight text-balance sm:text-3xl">
          Ask about your chart
        </h2>
        <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed text-pretty sm:text-base">
          Send this chart to ChatGPT, Claude or Gemini with the /ascendant
          skill, or keep a copy as a PDF.
        </p>
        <ChartActions className="mt-8 justify-center" />
      </section>

      {/* Clearance so the floating nav never covers the last band. */}
      <div aria-hidden="true" className="h-20" />
      <ReportNav />
    </>
  );
}
