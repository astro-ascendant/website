import type { ReactNode } from "react";
import { Document, Fixed, Image, Page, Text, View } from "@formepdf/react";
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

const SANS = "Allo";
const SERIF = "Libre Baskerville";
const MONO = "JetBrains Mono";

/** Font files, as URLs in the browser or bytes when rendering from disk. */
export interface PdfAssets {
  fonts: Record<
    | "sansRegular"
    | "sansMedium"
    | "sansSemibold"
    | "serifRegular"
    | "serifItalic"
    | "mono",
    string | Uint8Array
  >;
  /**
   * The official wordmark image, as a URL or data URI. The SVG wordmark
   * cannot be used: the engine ignores group transforms and joins subpaths.
   */
  wordmark: string;
}

function fontsFrom(assets: PdfAssets): FontRegistration[] {
  const { fonts } = assets;
  return [
    { family: SANS, src: fonts.sansRegular, fontWeight: 400 },
    { family: SANS, src: fonts.sansMedium, fontWeight: 500 },
    { family: SANS, src: fonts.sansSemibold, fontWeight: 600 },
    { family: SERIF, src: fonts.serifRegular, fontStyle: "normal" },
    { family: SERIF, src: fonts.serifItalic, fontStyle: "italic" },
    { family: MONO, src: fonts.mono, fontWeight: 400 },
  ];
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
  title,
  children,
  keepTogether = false,
  newPage = false,
}: {
  title: string;
  children: ReactNode;
  keepTogether?: boolean;
  /** Starts the section on a fresh page, with no rule above it. */
  newPage?: boolean;
}) {
  return (
    <View
      wrap={!keepTogether}
      style={{
        ...(newPage ? { breakBefore: true } : {}),
        marginTop: newPage ? 0 : 16,
        paddingTop: newPage ? 0 : 12,
        borderTopWidth: newPage ? 0 : 0.75,
        borderTopColor: C.rule,
      }}
    >
      <Text
        style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, color: C.ink }}
      >
        {title}
      </Text>
      <View style={{ marginTop: 9 }}>{children}</View>
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
        <Text style={{ fontFamily: MONO, fontSize: 6.4, color: C.faint, marginLeft: 5 }}>
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
 * strong rule, then quiet row rules. Every row reads the same; the PDF is a
 * record, so nothing is marked as current.
 */
function Table({
  columns,
  rows,
  size = 7.5,
}: {
  columns: readonly Column[];
  rows: readonly Row[];
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
      {rows.map((row, index) => (
        <View
          key={index}
          wrap={false}
          style={{
            flexDirection: "row",
            paddingVertical: 2,
            borderBottomWidth: 0.5,
            borderBottomColor: C.rule,
          }}
        >
          {columns.map((column, columnIndex) => (
            <Text
              key={column.key}
              style={{
                ...cell(column),
                fontFamily: column.mono ? MONO : SANS,
                fontSize: column.mono ? size - 0.5 : size,
                fontWeight: columnIndex === 0 ? 500 : 400,
                color: columnIndex === 0 ? C.ink : C.body,
              }}
            >
              {row[column.key] ?? ""}
            </Text>
          ))}
        </View>
      ))}
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

/** Antardashas in the per-Mahadasha grid: the lord and its dates. */
const ANTARDASHA_COLUMNS: Column[] = [
  { key: "lord", header: "Period", flex: 1.05 },
  { key: "start", header: "Start", flex: 1, mono: true },
  { key: "end", header: "End", flex: 1, mono: true },
];

const mahadashaSpans = (periods: readonly ChartDashaPeriod[]) =>
  periods.map((period) => ({ lord: period.mahadasha, start: period.start, end: period.end }));

/* ---------------------------- the document ---------------------------- */

/** The wordmark image's proportions (3994 × 1126). */
const WORDMARK_RATIO = 3994 / 1126;

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

function Footer({ name }: { name: string }) {
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
        <Text style={{ fontFamily: SANS, fontSize: 6.5, color: C.faint }}>
          {`${name === "" ? "Horoscope" : name}   ·   astro-ascendant ${libraryVersion}`}
        </Text>
        <Text style={{ fontFamily: SANS, fontSize: 6.5, color: C.faint }}>
          {`${siteUrl.replace(/^https?:\/\//, "")}   ·   Page {{pageNumber}} of {{totalPages}}`}
        </Text>
      </View>
    </Fixed>
  );
}

export function ChartDocument({
  result,
  assets,
}: {
  result: ChartResult;
  assets: PdfAssets;
}) {
  const { birth } = result;
  const name = birth.name.trim();
  const wordmark = assets.wordmark;
  const d1 = result.divisions.find((division) => division.division === 1);
  const d9 = result.divisions.find((division) => division.division === 9);
  const moon = d1?.placements.find((placement) => placement.body === "Moon");
  const zone =
    birth.timeZone && birth.utcIso ? formatTimeZoneLabel(birth.timeZone, birth.utcIso) : null;
  // The Mahadasha the birth falls in: a fact of the chart, not of today.
  const birthDasha = birth.utcIso
    ? result.dasha.vimshottari[findCurrentPeriodIndex(result.dasha.vimshottari, birth.utcIso)]
    : undefined;
  const chartWidth = (CONTENT - 18) / 2;

  const headline = [
    { label: "Ascendant", value: `${result.lagna.sign} ${formatLongitude(result.lagna.longitude)}` },
    { label: "Moon", value: moon ? `${moon.sign} ${formatLongitude(moon.longitude)}` : "-" },
    { label: "Star", value: moon ? star(moon.star, moon.pada) : "-" },
    {
      label: "Dasha at birth",
      value: birthDasha ? `${birthDasha.mahadasha} Mahadasha` : "-",
      detail: birthDasha ? `until ${formatDashaDate(birthDasha.end)}` : "",
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
        <Footer name={name} />

        {/* Cover */}
        <View wrap={false}>
          <Image src={wordmark} width={120} height={120 / WORDMARK_RATIO} alt="Ascendant" />
          <Text style={{ fontFamily: SANS, fontWeight: 600, fontSize: 28, color: C.ink, marginTop: 24 }}>
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
                  flex: index === 3 ? 1.3 : 1,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderLeftWidth: index === 0 ? 0 : 0.5,
                  borderLeftColor: C.ruleStrong,
                }}
              >
                <Text style={eyebrow}>{item.label}</Text>
                <Text style={{ fontFamily: SANS, fontWeight: 500, fontSize: 9.5, color: C.ink, marginTop: 3 }}>
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

        <Section title="Rashi and Navamsha" keepTogether>
          <View style={{ flexDirection: "row", gap: 18 }}>
            {d1 ? <SouthIndianChart result={result} division={d1} title="Rashi" width={chartWidth} /> : null}
            {d9 ? <SouthIndianChart result={result} division={d9} title="Navamsha" width={chartWidth} /> : null}
          </View>
        </Section>

        <Section title="Planets" newPage>
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

        <Section title="Jaimini">
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
                  <Caption>Rashi Drishti, Argala, Karakamsha, Upapada</Caption>
                  <Table
                    columns={[
                      { key: "key", header: "Item", flex: 1.3 },
                      { key: "value", header: "Signs", flex: 1.4 },
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

        <Section title="Vimshottari dasha" newPage>
          <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 14 }}>
            {result.dasha.vimshottari.map((period) => (
              <View key={`${period.mahadasha}-${period.start}`} wrap={false} style={{ width: (CONTENT - 28) / 3 }}>
                <Caption detail={`${formatDashaDate(period.start)} to ${formatDashaDate(period.end)}`}>
                  {period.mahadasha}
                </Caption>
                <Table
                  size={6.6}
                  columns={ANTARDASHA_COLUMNS}
                  rows={periodRows(
                    period.antardashas.map((antar) => ({
                      lord: antar.antardasha,
                      start: antar.start,
                      end: antar.end,
                    })),
                  )}
                />
              </View>
            ))}
          </View>
        </Section>

        <Section title="Chara and Sthira dasha" newPage>
          <TwoUp>
            {[
              <View key="chara">
                <Caption>Chara</Caption>
                <Table columns={PERIOD_COLUMNS} rows={periodRows(mahadashaSpans(result.dasha.chara))} size={7} />
              </View>,
              <View key="sthira">
                <Caption>Sthira</Caption>
                <Table columns={PERIOD_COLUMNS} rows={periodRows(mahadashaSpans(result.dasha.sthira))} size={7} />
              </View>,
            ]}
          </TwoUp>
        </Section>

        <Section title="Sarvashtakavarga" keepTogether>
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
          />
        </Section>

        <Section title="Krishnamurthi Paddhati" newPage>
          <Text style={{ fontFamily: MONO, fontSize: 7, color: C.muted, marginBottom: 8 }}>
            {`${result.kp.astroParams.ayanamsa} ayanamsa · ${words(result.kp.astroParams.houseSystem)} houses`}
          </Text>
          <Caption>Significators</Caption>
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



        {divisions.length > 0 ? (
          <Section title="Divisional charts" keepTogether>
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

      </Page>
    </Document>
  );
}

/** Renders the chart into a PDF; fonts and the wordmark load with the first save. */
export async function buildChartPdf(result: ChartResult): Promise<Blob> {
  const [{ renderDocument }, { loadPdfAssets }] = await Promise.all([
    import("@formepdf/core"),
    import("@/lib/pdf-assets"),
  ]);
  const assets = await loadPdfAssets();
  const bytes = await renderDocument(<ChartDocument result={result} assets={assets} />);
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}
