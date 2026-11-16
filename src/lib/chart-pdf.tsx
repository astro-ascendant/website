import type { ReactNode } from "react";
import { Document, Fixed, Page, Svg, Text, View } from "@formepdf/react";
import type { FontRegistration, Style } from "@formepdf/react";
import type {
  ChartDashaPeriod,
  ChartDivision,
  ChartResult,
} from "@/lib/chart";
import { formatSignifyingHouses } from "@/lib/chart-report";
import { buildDivisionView, type DivisionCell } from "@/lib/chart-view";
import {
  findCurrentPeriodIndex,
  formatDashaDate,
  formatDashaDuration,
} from "@/lib/dasha-time";
import { libraryVersion, siteUrl } from "@/lib/shared";
import { formatTimeZoneLabel } from "@/lib/timezone";
import { formatLongitude, signShortName, starAt } from "@/lib/zodiac";

/* ------------------------------- brand ------------------------------- */

/** The site's light theme, as print colours. */
const C = {
  ink: "#202020",
  body: "#3a3a3a",
  muted: "#6c6c6c",
  faint: "#9a9a9a",
  rule: "#e4e4e4",
  ruleStrong: "#c9c9c9",
  wash: "#f7f6f5",
  brand: "#874c48",
  brandWash: "#f5ecea",
};

const SANS = "Inter";
const SERIF = "Libre Baskerville";
const MONO = "JetBrains Mono";

/** Font files, as URLs in the browser or bytes when rendering from disk. */
export interface PdfAssets {
  fonts: Record<
    | "interRegular"
    | "interMedium"
    | "interSemibold"
    | "serifRegular"
    | "serifItalic"
    | "mono",
    string | Uint8Array
  >;
  /** The wordmark SVG file, as text. */
  wordmark: string;
}

function fontsFrom(assets: PdfAssets): FontRegistration[] {
  const { fonts } = assets;
  return [
    { family: SANS, src: fonts.interRegular, fontWeight: 400 },
    { family: SANS, src: fonts.interMedium, fontWeight: 500 },
    { family: SANS, src: fonts.interSemibold, fontWeight: 600 },
    { family: SERIF, src: fonts.serifRegular, fontStyle: "normal" },
    { family: SERIF, src: fonts.serifItalic, fontStyle: "italic" },
    { family: MONO, src: fonts.mono, fontWeight: 400 },
  ];
}

/** Shifts every coordinate pair of an absolute path (M, L, Q, C only) by (dx, dy). */
function shiftPath(d: string, dx: number, dy: number): string {
  let index = 0;
  return d.replace(/-?\d*\.?\d+/g, (number) => {
    const value = Number(number) + (index % 2 === 0 ? dx : dy);
    index += 1;
    return String(Math.round(value * 100) / 100);
  });
}

/**
 * The wordmark's drawing, coloured in the brand rose. The PDF engine ignores
 * `transform` on groups, so each letter's translate is baked into its path;
 * the screen-only filter is dropped.
 */
function wordmarkMarkup(svg: string): { viewBox: string; content: string } {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1] ?? "0 0 390 110";
  const inner = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/<defs>[\s\S]*?<\/defs>/g, "")
    .replace(
      /<g transform="translate\(([-\d.]+)[ ,]+([-\d.]+)\)">([\s\S]*?)<\/g>/g,
      (_, dx: string, dy: string, body: string) =>
        body.replace(/\sd="([^"]*)"/g, (__, d: string) => ` d="${shiftPath(d, Number(dx), Number(dy))}"`),
    )
    .replace(/<g[^>]*>|<\/g>/g, "")
    .replaceAll("currentColor", C.brand);
  return { viewBox, content: inner };
}

/* ----------------------------- primitives ----------------------------- */

const eyebrow: Style = {
  fontFamily: SANS,
  fontWeight: 600,
  fontSize: 6.5,
  letterSpacing: 1.1,
  textTransform: "uppercase",
  color: C.muted,
};

function Section({
  eyebrow: label,
  title,
  lead,
  children,
  keepTogether = false,
  newPage = false,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  children: ReactNode;
  keepTogether?: boolean;
  /** Starts the section on a fresh page, with no rule above it. */
  newPage?: boolean;
  /** A tighter header, for a part that shares a page with the one above. */
  compact?: boolean;
}) {
  return (
    <View
      wrap={!keepTogether}
      style={{
        ...(newPage ? { breakBefore: true } : {}),
        marginTop: newPage ? 0 : compact ? 14 : 22,
        paddingTop: newPage ? 0 : compact ? 10 : 14,
        borderTopWidth: newPage ? 0 : 0.75,
        borderTopColor: C.rule,
      }}
    >
      <View wrap={false}>
        <Text style={{ ...eyebrow, color: C.brand }}>{label}</Text>
        <Text
          style={{
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: compact ? 11.5 : 14,
            color: C.ink,
            marginTop: 3,
          }}
        >
          {title}
        </Text>
        {lead ? (
          <Text
            style={{
              fontFamily: SANS,
              fontSize: 8,
              lineHeight: 1.5,
              color: C.muted,
              marginTop: 3,
              maxWidth: 420,
            }}
          >
            {lead}
          </Text>
        ) : null}
      </View>
      <View style={{ marginTop: 10 }}>{children}</View>
    </View>
  );
}

/** A small heading inside a section, over a table or chart. */
function Caption({ children, detail }: { children: string; detail?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 5 }}>
      <Text style={{ fontFamily: SANS, fontWeight: 600, fontSize: 9, color: C.ink }}>
        {children}
      </Text>
      {detail ? (
        <Text style={{ fontFamily: MONO, fontSize: 7, color: C.faint, marginLeft: 5 }}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

interface Column {
  key: string;
  header: string;
  /** Relative width; columns share the row in proportion. */
  flex?: number;
  align?: "left" | "right";
  mono?: boolean;
  /** Short codes like "D2" read better without the label tracking. */
  tight?: boolean;
}

type Row = Record<string, string>;

/**
 * A hairline table in the site's style: a muted uppercase header over a
 * strong rule, quiet row rules, and highlighted rows washed in the brand rose
 * with a rose bar at the start.
 */
function Table({
  columns,
  rows,
  highlight = () => false,
  size = 7.5,
}: {
  columns: readonly Column[];
  rows: readonly Row[];
  highlight?: (row: Row, index: number) => boolean;
  size?: number;
}) {
  const cell = (column: Column): Style => ({
    flex: column.flex ?? 1,
    textAlign: column.align ?? "left",
    paddingHorizontal: 4,
  });
  return (
    <View>
      <View
        wrap={false}
        style={{
          flexDirection: "row",
          paddingVertical: 4,
          borderBottomWidth: 0.75,
          borderBottomColor: C.ruleStrong,
        }}
      >
        {columns.map((column) => (
          <Text
            key={column.key}
            style={{ ...eyebrow, ...cell(column), ...(column.tight ? { letterSpacing: 0.2 } : {}) }}
          >
            {column.header}
          </Text>
        ))}
      </View>
      {rows.map((row, index) => {
        const marked = highlight(row, index);
        return (
          <View
            key={index}
            wrap={false}
            style={{
              flexDirection: "row",
              paddingVertical: 2.2,
              borderBottomWidth: 0.5,
              borderBottomColor: C.rule,
              borderLeftWidth: 1.5,
              borderLeftColor: marked ? C.brand : "#ffffff",
              backgroundColor: marked ? C.brandWash : "#ffffff",
            }}
          >
            {columns.map((column, columnIndex) => (
              <Text
                key={column.key}
                style={{
                  ...cell(column),
                  fontFamily: column.mono ? MONO : SANS,
                  fontSize: column.mono ? size - 0.5 : size,
                  fontWeight: marked || columnIndex === 0 ? 500 : 400,
                  color: marked || columnIndex === 0 ? C.ink : C.body,
                }}
              >
                {row[column.key] ?? ""}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
}

function TwoUp({ children }: { children: [ReactNode, ReactNode] }) {
  return (
    <View style={{ flexDirection: "row", gap: 18 }}>
      <View style={{ flex: 1 }}>{children[0]}</View>
      <View style={{ flex: 1 }}>{children[1]}</View>
    </View>
  );
}

/* ---------------------------- South Indian ---------------------------- */

/** Grid positions of the twelve signs, as on the site: [row, column]. */
const SIGN_SLOT: Record<string, [number, number]> = {
  Pisces: [0, 0],
  Aries: [0, 1],
  Taurus: [0, 2],
  Gemini: [0, 3],
  Cancer: [1, 3],
  Leo: [2, 3],
  Virgo: [3, 3],
  Libra: [3, 2],
  Scorpio: [3, 1],
  Sagittarius: [3, 0],
  Capricorn: [2, 0],
  Aquarius: [1, 0],
};

function ChartCell({ cell, size }: { cell: DivisionCell | undefined; size: number }) {
  if (!cell) {
    return <View style={{ width: size, height: size, flexShrink: 0 }} />;
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        padding: 3.5,
        borderWidth: 0.35,
        borderColor: C.ruleStrong,
        backgroundColor: cell.isLagna ? C.brandWash : "#ffffff",
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ ...eyebrow, fontSize: 5.5, letterSpacing: 0.6 }}>
          {cell.signShort}
        </Text>
        <Text style={{ fontFamily: MONO, fontSize: 5.5, color: C.faint }}>
          {cell.house ?? ""}
        </Text>
      </View>
      <View style={{ marginTop: 3, gap: 1.2 }}>
        {cell.occupants.map((occupant) => (
          <View
            key={`${occupant.body}-${occupant.degree}`}
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text
              style={{
                fontFamily: MONO,
                fontSize: 6.2,
                color: occupant.isLagna ? C.brand : C.ink,
              }}
            >
              {occupant.short}
              {occupant.retrograde ? " r" : ""}
            </Text>
            <Text style={{ fontFamily: MONO, fontSize: 6.2, color: C.muted }}>
              {occupant.degree}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** A South Indian chart: signs fixed around a 4 × 4 square, the centre left for the title. */
function SouthIndianChart({
  result,
  division,
  title,
  width,
}: {
  result: ChartResult;
  division: ChartDivision;
  title: string;
  width: number;
}) {
  const view = buildDivisionView({ lagna: result.lagna, division });
  const size = width / 4;
  const at = (row: number, column: number) =>
    view.cells.find((cell) => {
      const slot = SIGN_SLOT[cell.sign];
      return slot?.[0] === row && slot[1] === column;
    });
  const rowOf = (row: number) => (
    <View style={{ flexDirection: "row" }}>
      {[0, 1, 2, 3].map((column) => (
        <ChartCell key={column} cell={at(row, column)} size={size} />
      ))}
    </View>
  );
  return (
    <View wrap={false} style={{ width, flexShrink: 0 }}>
      {rowOf(0)}
      <View style={{ flexDirection: "row" }}>
        <View>
          <ChartCell cell={at(1, 0)} size={size} />
          <ChartCell cell={at(2, 0)} size={size} />
        </View>
        <View
          style={{
            width: size * 2,
            height: size * 2,
            flexShrink: 0,
            borderWidth: 0.35,
            borderColor: C.ruleStrong,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: 13,
              color: C.brand,
            }}
          >
            {title}
          </Text>
          <Text style={{ fontFamily: MONO, fontSize: 6.5, color: C.faint, marginTop: 3 }}>
            {`D${division.division} · Lagna ${view.lagnaSign} ${view.lagnaDegree}`}
          </Text>
        </View>
        <View>
          <ChartCell cell={at(1, 3)} size={size} />
          <ChartCell cell={at(2, 3)} size={size} />
        </View>
      </View>
      {rowOf(3)}
    </View>
  );
}

/* ------------------------------ the data ------------------------------ */

const BODY_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
const byBody = (a: { body: string }, b: { body: string }) =>
  BODY_ORDER.indexOf(a.body) - BODY_ORDER.indexOf(b.body);

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function longDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match
    ? `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`
    : value;
}

function clockTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) {
    return value;
  }
  const hours = Number(match[1]);
  return `${hours % 12 === 0 ? 12 : hours % 12}:${match[2]} ${hours < 12 ? "AM" : "PM"}`;
}

/** "WholeSign" becomes "Whole sign"; names that are one word stay as they are. */
const words = (value: string) =>
  value.replace(/([a-z])([A-Z])/g, (_, a: string, b: string) => `${a} ${b.toLowerCase()}`);

const PLANET_SHORT: Record<string, string> = {
  Sun: "Su",
  Moon: "Mo",
  Mars: "Ma",
  Mercury: "Me",
  Jupiter: "Ju",
  Venus: "Ve",
  Saturn: "Sa",
};

const star = (name: string | undefined, pada: number | null | undefined) =>
  !name ? "-" : pada ? `${name} · ${pada}` : name;

/** Planet rows for one division; divisional stars are read from the divisional longitude. */
function planetRows(result: ChartResult, division: ChartDivision): Row[] {
  const isRashi = division.division === 1;
  const lagnaHouse = division.houses.find((house) => house.number === 1);
  const lagnaLongitude = isRashi
    ? result.lagna.longitude
    : (division.lagna?.longitude ?? lagnaHouse?.cusp ?? null);
  const lagnaStar = isRashi
    ? star(result.lagna.star, result.lagna.pada)
    : star(starAt(lagnaLongitude)?.name, starAt(lagnaLongitude)?.pada);
  return [
    {
      body: "Lagna",
      sign: isRashi ? result.lagna.sign : (lagnaHouse?.sign ?? "-"),
      house: "1",
      degree: formatLongitude(lagnaLongitude) || "-",
      star: lagnaStar,
    },
    ...[...division.placements].sort(byBody).map((placement) => ({
      body: `${placement.body}${placement.state === "Retrograde" ? " (R)" : ""}`,
      sign: placement.sign,
      house: placement.house > 0 ? String(placement.house) : "-",
      degree: formatLongitude(placement.longitude) || "-",
      star: isRashi
        ? star(placement.star, placement.pada)
        : star(starAt(placement.longitude)?.name, starAt(placement.longitude)?.pada),
    })),
  ];
}

const PLANET_COLUMNS: Column[] = [
  { key: "body", header: "Planet", flex: 1.15 },
  { key: "sign", header: "Sign", flex: 1.15 },
  { key: "house", header: "Ho.", flex: 0.45, tight: true },
  { key: "degree", header: "Degree", flex: 0.85, mono: true },
  { key: "star", header: "Star", flex: 2.1 },
];

const PERIOD_COLUMNS: Column[] = [
  { key: "lord", header: "Period", flex: 1.1 },
  { key: "start", header: "Start", flex: 1.2, mono: true },
  { key: "end", header: "End", flex: 1.2, mono: true },
  { key: "length", header: "Length", flex: 1, mono: true },
];

function periodRows(
  periods: readonly { lord: string; start: string; end: string }[],
): Row[] {
  return periods.map((period) => ({
    lord: period.lord,
    start: formatDashaDate(period.start),
    end: formatDashaDate(period.end),
    length: formatDashaDuration(period.start, period.end),
  }));
}

const mahadashaSpans = (periods: readonly ChartDashaPeriod[]) =>
  periods.map((period) => ({ lord: period.mahadasha, start: period.start, end: period.end }));

/** The running Vimshottari chain at `now`, as far as the chart carries it. */
function runningChain(result: ChartResult, now: string) {
  const mahadasha = result.dasha.vimshottari[findCurrentPeriodIndex(result.dasha.vimshottari, now)];
  const antardasha = mahadasha?.antardashas[findCurrentPeriodIndex(mahadasha.antardashas, now)];
  const set = result.dasha.currentPratyantaras;
  const pratyantaras =
    set && mahadasha && antardasha &&
    set.mahadasha === mahadasha.mahadasha &&
    set.antardasha === antardasha.antardasha
      ? set.periods
      : null;
  const pratyantara = pratyantaras?.[findCurrentPeriodIndex(pratyantaras, now)];
  return { mahadasha, antardasha, pratyantaras, pratyantara };
}

/* ---------------------------- the document ---------------------------- */

const PAGE_WIDTH = 595.28;
const MARGIN = 44;
const CONTENT = PAGE_WIDTH - MARGIN * 2;

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: "50%", paddingVertical: 4, paddingRight: 10, flexDirection: "row" }}>
      <Text style={{ ...eyebrow, width: 74, paddingTop: 1.2 }}>{label}</Text>
      <Text style={{ fontFamily: SANS, fontSize: 8, color: C.ink, flex: 1 }}>{value}</Text>
    </View>
  );
}

function Footer({ name, wordmark }: { name: string; wordmark: { viewBox: string; content: string } }) {
  return (
    <Fixed position="footer">
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 8,
          marginBottom: 22,
          borderTopWidth: 0.5,
          borderTopColor: C.rule,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Svg width={50} height={14} viewBox={wordmark.viewBox} content={wordmark.content} />
          <Text style={{ fontFamily: SANS, fontSize: 6.5, color: C.faint }}>
            {name === "" ? "Horoscope" : `${name} · Horoscope`}
          </Text>
        </View>
        <Text style={{ fontFamily: SANS, fontSize: 6.5, color: C.faint }}>
          {`${siteUrl.replace(/^https?:\/\//, "")}   ·   Page {{pageNumber}} of {{totalPages}}`}
        </Text>
      </View>
    </Fixed>
  );
}

export function ChartDocument({
  result,
  now,
  assets,
}: {
  result: ChartResult;
  /** The instant "now" for running periods, as an ISO string. */
  now: string;
  assets: PdfAssets;
}) {
  const { birth } = result;
  const name = birth.name.trim();
  const wordmark = wordmarkMarkup(assets.wordmark);
  const d1 = result.divisions.find((division) => division.division === 1);
  const d9 = result.divisions.find((division) => division.division === 9);
  const moon = d1?.placements.find((placement) => placement.body === "Moon");
  const zone =
    birth.timeZone && birth.utcIso ? formatTimeZoneLabel(birth.timeZone, birth.utcIso) : null;
  const chain = runningChain(result, now);
  const chainLabel = [chain.mahadasha?.mahadasha, chain.antardasha?.antardasha, chain.pratyantara?.lord]
    .filter(Boolean)
    .join(" · ");
  const nowTime = Date.parse(now);
  const isRunning = (row: Row) => {
    const start = Date.parse(row.startIso ?? "");
    const end = Date.parse(row.endIso ?? "");
    return start <= nowTime && nowTime < end;
  };
  const withBounds = (periods: readonly { lord: string; start: string; end: string }[]) =>
    periodRows(periods).map((row, index) => ({
      ...row,
      startIso: periods[index]!.start,
      endIso: periods[index]!.end,
    }));
  const chartWidth = (CONTENT - 18) / 2;

  const headline = [
    { label: "Ascendant", value: `${result.lagna.sign} ${formatLongitude(result.lagna.longitude)}` },
    { label: "Moon", value: moon ? `${moon.sign} ${formatLongitude(moon.longitude)}` : "-" },
    { label: "Moon star", value: moon ? star(moon.star, moon.pada) : "-" },
    {
      label: "Running dasha",
      value: chainLabel || "-",
      detail: ["Mahadasha", "Antardasha", "Pratyantara"].slice(0, chainLabel.split(" · ").length).join(" · "),
    },
  ];

  const divisions = result.divisions.filter((division) => division.division !== 1);
  const bodies = ["Lagna", ...BODY_ORDER];
  const signIn = (division: ChartDivision, body: string) => {
    if (body === "Lagna") {
      const sign = division.houses.find((house) => house.number === 1)?.sign;
      return sign ? signShortName(sign) : "-";
    }
    const placement = division.placements.find((entry) => entry.body === body);
    return placement ? signShortName(placement.sign) : "-";
  };

  return (
    <Document
      title={name === "" ? "Horoscope" : `${name}, horoscope`}
      author="Ascendant"
      creator={`Ascendant (astro-ascendant ${libraryVersion})`}
      lang="en"
      fonts={fontsFrom(assets)}
      style={{ fontFamily: SANS, color: C.ink }}
    >
      <Page size="A4" margin={[MARGIN, MARGIN, 70, MARGIN]}>
        <Footer name={name} wordmark={wordmark} />

        {/* Cover */}
        <View wrap={false}>
          <Svg width={112} height={32} viewBox={wordmark.viewBox} content={wordmark.content} />
          <Text style={{ ...eyebrow, color: C.brand, marginTop: 26 }}>Horoscope</Text>
          <Text style={{ fontFamily: SANS, fontWeight: 600, fontSize: 28, color: C.ink, marginTop: 4 }}>
            {name === "" ? "Birth chart" : name}
          </Text>
          <Text style={{ fontFamily: SANS, fontSize: 9.5, color: C.muted, marginTop: 6 }}>
            {[
              birth.date ? longDate(birth.date) : null,
              birth.time ? `${clockTime(birth.time)}${zone ? ` ${zone}` : ""}` : null,
              birth.place || null,
            ]
              .filter(Boolean)
              .join("   ·   ")}
          </Text>

          <View
            style={{
              flexDirection: "row",
              marginTop: 18,
              borderWidth: 0.5,
              borderColor: C.ruleStrong,
              borderRadius: 4,
            }}
          >
            {headline.map((item, index) => (
              <View
                key={item.label}
                style={{
                  flex: index === 3 ? 1.5 : 1,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderLeftWidth: index === 0 ? 0 : 0.5,
                  borderLeftColor: C.ruleStrong,
                }}
              >
                <Text style={eyebrow}>{item.label}</Text>
                <Text style={{ fontFamily: SANS, fontWeight: 500, fontSize: 9.5, color: index === 3 ? C.brand : C.ink, marginTop: 3 }}>
                  {item.value}
                </Text>
                {"detail" in item && item.detail ? (
                  <Text style={{ fontFamily: SANS, fontSize: 6, color: C.faint, marginTop: 2 }}>
                    {item.detail}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12 }}>
            <Fact label="Date" value={birth.date ? longDate(birth.date) : "-"} />
            <Fact label="Time" value={birth.time ? `${clockTime(birth.time)}${zone ? ` ${zone}` : ""}` : "-"} />
            <Fact label="Place" value={birth.place || "-"} />
            <Fact label="Coordinates" value={`${birth.latitude.toFixed(4)}, ${birth.longitude.toFixed(4)}`} />
            <Fact label="UTC" value={birth.utcIso ? birth.utcIso.replace(".000Z", "Z") : "-"} />
            <Fact label="Settings" value={`${result.astroParams.ayanamsa} ayanamsa, ${words(result.astroParams.houseSystem).toLowerCase()} houses`} />
          </View>
        </View>

        <Section
          eyebrow="Birth charts"
          title="Rashi and Navamsha"
          lead="The Rashi is the sky at the moment of birth. The Navamsha zooms into it, and is read for marriage and for the real strength of each planet."
          keepTogether
        >
          <View style={{ flexDirection: "row", gap: 18 }}>
            {d1 ? <SouthIndianChart result={result} division={d1} title="Rashi" width={chartWidth} /> : null}
            {d9 ? <SouthIndianChart result={result} division={d9} title="Navamsha" width={chartWidth} /> : null}
          </View>
        </Section>

        <Section eyebrow="Planets" title="Positions in Rashi and Navamsha" newPage>
          <TwoUp>
            {[
              d1 ? (
                <View key="d1">
                  <Caption detail="D1">Rashi</Caption>
                  <Table columns={PLANET_COLUMNS} rows={planetRows(result, d1)} size={7} />
                </View>
              ) : null,
              d9 ? (
                <View key="d9">
                  <Caption detail="D9">Navamsha</Caption>
                  <Table columns={PLANET_COLUMNS} rows={planetRows(result, d9)} size={7} />
                </View>
              ) : null,
            ]}
          </TwoUp>
        </Section>

        <Section
          eyebrow="Jaimini"
          title="Karakas, padas and aspects"
          lead="The cast of the chart, how the world sees each house, and which houses help or block each other."
        >
          <TwoUp>
            {[
              <View key="karakas">
                <Caption>Chara Karakas</Caption>
                <Table
                  columns={[
                    { key: "role", header: "Role", flex: 1.3 },
                    { key: "planet", header: "Planet" },
                  ]}
                  rows={result.jaimini.karakas.map((karaka) => ({ role: karaka.role, planet: karaka.planet }))}
                />
                <View style={{ marginTop: 14 }}>
                  <Caption>Readings</Caption>
                  <Table
                    columns={[
                      { key: "key", header: "Reading", flex: 1.3 },
                      { key: "value", header: "Value", flex: 1.4 },
                    ]}
                    rows={[
                      { key: "Karakamsha", value: result.jaimini.karakamsha || "-" },
                      { key: "Upapada", value: result.jaimini.upapada || "-" },
                      { key: "Rashi Drishti on Lagna", value: result.jaimini.drishti.join(", ") || "-" },
                      { key: "Supporting Argala", value: result.jaimini.argala.supporting.join(", ") || "-" },
                      { key: "Obstructing Argala", value: result.jaimini.argala.obstructing.join(", ") || "-" },
                    ]}
                  />
                </View>
              </View>,
              <View key="arudha">
                <Caption>Arudha Pada</Caption>
                <Table
                  columns={[
                    { key: "house", header: "House", flex: 0.6 },
                    { key: "pada", header: "Pada" },
                  ]}
                  rows={result.jaimini.arudha.map((entry) => ({ house: String(entry.house), pada: entry.pada || "-" }))}
                />
              </View>,
            ]}
          </TwoUp>
        </Section>

        <Section
          eyebrow="Dashas"
          title="Vimshottari"
          newPage
          lead="The planetary periods of a life. The rows in rose are running now."
        >
          <Table
            columns={PERIOD_COLUMNS}
            rows={withBounds(mahadashaSpans(result.dasha.vimshottari))}
            highlight={isRunning}
          />
          <View style={{ marginTop: 14 }}>
            <TwoUp>
              {[
                chain.mahadasha ? (
                  <View key="antar">
                    <Caption detail={`in ${chain.mahadasha.mahadasha}`}>Antardashas</Caption>
                    <Table
                      columns={PERIOD_COLUMNS}
                      rows={withBounds(
                        chain.mahadasha.antardashas.map((antar) => ({
                          lord: antar.antardasha,
                          start: antar.start,
                          end: antar.end,
                        })),
                      )}
                      highlight={isRunning}
                      size={7}
                    />
                  </View>
                ) : null,
                chain.pratyantaras && chain.antardasha ? (
                  <View key="pratyantar">
                    <Caption detail={`in ${chain.antardasha.antardasha}`}>Pratyantaras</Caption>
                    <Table
                      columns={PERIOD_COLUMNS}
                      rows={withBounds(chain.pratyantaras)}
                      highlight={isRunning}
                      size={7}
                    />
                  </View>
                ) : null,
              ]}
            </TwoUp>
          </View>
        </Section>

        <Section
          eyebrow="Jaimini dashas"
          title="Chara and Sthira"
          compact
        >
          <TwoUp>
            {[
              <View key="chara">
                <Caption>Chara</Caption>
                <Table columns={PERIOD_COLUMNS} rows={withBounds(mahadashaSpans(result.dasha.chara))} highlight={isRunning} size={7} />
              </View>,
              <View key="sthira">
                <Caption>Sthira</Caption>
                <Table columns={PERIOD_COLUMNS} rows={withBounds(mahadashaSpans(result.dasha.sthira))} highlight={isRunning} size={7} />
              </View>,
            ]}
          </TwoUp>
        </Section>

        <Section
          eyebrow="Krishnamurthi Paddhati"
          title="KP significators and cusps"
          newPage
          lead={`Calculated with the ${result.kp.astroParams.ayanamsa} ayanamsa and ${result.kp.astroParams.houseSystem} houses.`}
        >
          <Table
            columns={[
              { key: "name", header: "Body", flex: 1 },
              { key: "house", header: "House", flex: 0.55 },
              { key: "signLord", header: "Sign lord", flex: 0.95 },
              { key: "starLord", header: "Star lord", flex: 0.95 },
              { key: "subLord", header: "Sub lord", flex: 0.95 },
              { key: "subSubLord", header: "Sub-sub", flex: 0.95 },
              { key: "houses", header: "Signifies", flex: 1.4, mono: true },
            ]}
            rows={result.kp.rows.map((row) => ({
              name: row.name,
              house: row.house === null ? "-" : String(row.house),
              signLord: row.signLord,
              starLord: row.starLord,
              subLord: row.subLord,
              subSubLord: row.subSubLord,
              houses: formatSignifyingHouses(row.signifyingHouses),
            }))}
          />
          <View style={{ marginTop: 14 }}>
            <Caption>Cusps</Caption>
            <Table
              columns={[
                { key: "house", header: "House", flex: 0.55 },
                { key: "sign", header: "Sign", flex: 1 },
                { key: "cusp", header: "Cusp", flex: 0.75, mono: true },
                { key: "signLord", header: "Sign lord", flex: 0.95 },
                { key: "starLord", header: "Star lord", flex: 0.95 },
                { key: "subLord", header: "Sub lord", flex: 0.95 },
                { key: "subSubLord", header: "Sub-sub", flex: 0.95 },
              ]}
              rows={(result.kp.cusps ?? []).map((cusp) => ({
                house: String(cusp.house),
                sign: cusp.sign,
                cusp: formatLongitude(cusp.longitude),
                signLord: cusp.signLord,
                starLord: cusp.starLord,
                subLord: cusp.subLord,
                subSubLord: cusp.subSubLord,
              }))}
            />
          </View>
        </Section>


        <Section
          eyebrow="Ashtakavarga"
          title="Sarvashtakavarga"
          newPage
          lead="A score for every sign by how much it supports each planet. Totals above 28 are generally read as strong."
          keepTogether
        >
          <Table
            columns={[
              { key: "sign", header: "Sign", flex: 1.4 },
              ...result.sav.rows.map((row) => ({
                key: row.planet,
                header: PLANET_SHORT[row.planet] ?? row.planet.slice(0, 2),
                tight: true,
                align: "right" as const,
                mono: true,
              })),
              { key: "total", header: "Total", align: "right" as const, mono: true },
            ]}
            rows={result.sav.signs.map((sign, signIndex) => ({
              sign,
              ...Object.fromEntries(
                result.sav.rows.map((row) => [row.planet, String(row.points[signIndex] ?? 0)]),
              ),
              total: String(result.sav.signTotals[signIndex] ?? 0),
            }))}
            highlight={(row) => Number(row.total) > 28}
          />
        </Section>

        {divisions.length > 0 ? (
          <Section
            eyebrow="Divisional charts"
            title="Every division at a glance"
            lead="The sign each body occupies in each divisional chart."
            keepTogether
          >
            <Table
              size={6.8}
              columns={[
                { key: "body", header: "Body", flex: 1.5 },
                ...divisions.map((division) => ({
                  key: `d${division.division}`,
                  header: `D${division.division}`,
                  mono: true,
                  tight: true,
                })),
              ]}
              rows={bodies.map((body) => ({
                body,
                ...Object.fromEntries(
                  divisions.map((division) => [`d${division.division}`, signIn(division, body)]),
                ),
              }))}
            />
          </Section>
        ) : null}

        <View wrap={false} style={{ marginTop: 26, paddingTop: 12, borderTopWidth: 0.75, borderTopColor: C.rule }}>
          <Text style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 9, lineHeight: 1.6, color: C.body }}>
            This chart is interpretive guidance, not certainty or a substitute for medical, legal, or
            financial advice.
          </Text>
          <Text style={{ fontFamily: SANS, fontSize: 6.5, color: C.faint, marginTop: 6 }}>
            {`Calculated with astro-ascendant ${libraryVersion}. Running periods as of ${longDate(now)}.`}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

/** Renders the chart into a PDF; fonts and the wordmark load with the first save. */
export async function buildChartPdf(result: ChartResult, now: string): Promise<Blob> {
  const [{ renderDocument }, { pdfAssets }] = await Promise.all([
    import("@formepdf/core"),
    import("@/lib/pdf-assets"),
  ]);
  const bytes = await renderDocument(<ChartDocument result={result} now={now} assets={pdfAssets} />);
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}
