import type { ChartDashaPeriod, ChartDivision } from "./chart";
import { findCurrentPeriodIndex } from "./dasha-time";
import { bodyShortName, formatLongitude, signShortName } from "./zodiac";

/** Fixed South Indian rasi boxes, clockwise from Pisces at top-left. */
const SOUTH_INDIAN_LAYOUT = [
  { sign: "Pisces", area: "pisces" },
  { sign: "Aries", area: "aries" },
  { sign: "Taurus", area: "taurus" },
  { sign: "Gemini", area: "gemini" },
  { sign: "Cancer", area: "cancer" },
  { sign: "Leo", area: "leo" },
  { sign: "Virgo", area: "virgo" },
  { sign: "Libra", area: "libra" },
  { sign: "Scorpio", area: "scorpio" },
  { sign: "Sagittarius", area: "sagittarius" },
  { sign: "Capricorn", area: "capricorn" },
  { sign: "Aquarius", area: "aquarius" },
] as const;

export const SOUTH_INDIAN_GRID_TEMPLATE = `
"pisces aries taurus gemini"
"aquarius center center cancer"
"capricorn center center leo"
"sagittarius scorpio libra virgo"
`;

export interface DivisionOccupant {
  body: string;
  short: string;
  degree: string;
  retrograde: boolean;
  isLagna: boolean;
}

export interface DivisionCell {
  sign: string;
  area: string;
  signShort: string;
  house: number | null;
  isLagna: boolean;
  occupants: DivisionOccupant[];
}

export interface DivisionView {
  division: number;
  title: string;
  lagnaSign: string;
  lagnaDegree: string;
  cells: DivisionCell[];
  /** Screen-reader description of the whole chart. */
  label: string;
}

export interface DivisionViewInput {
  readonly lagna: {
    readonly sign: string;
    readonly longitude: number | null;
  };
  readonly division: ChartDivision;
}

/**
 * Sign-fixed South Indian chart: twelve rasi boxes stay in place, lagna
 * and planets sit in the sign they occupy. House numbers are counted
 * from the lagna sign when the division includes house data.
 */
export function buildDivisionView({
  lagna,
  division,
}: DivisionViewInput): DivisionView {
  const lagnaHouse = division.houses.find((house) => house.number === 1);
  const lagnaSign =
    division.division === 1 ? lagna.sign : (lagnaHouse?.sign ?? lagna.sign);
  const lagnaDegree =
    division.division === 1
      ? formatLongitude(lagna.longitude)
      : formatLongitude(lagnaHouse?.cusp);

  const cells = SOUTH_INDIAN_LAYOUT.map((slot) => {
    const house = division.houses.find((entry) => entry.sign === slot.sign);
    const occupants: DivisionOccupant[] = division.placements
      .filter((planet) => planet.sign === slot.sign)
      .sort(
        (a, b) =>
          (a.longitude ?? Number.POSITIVE_INFINITY) -
          (b.longitude ?? Number.POSITIVE_INFINITY),
      )
      .map((planet) => ({
        body: planet.body,
        short: bodyShortName(planet.body),
        degree: formatLongitude(planet.longitude),
        retrograde: planet.state === "Retrograde",
        isLagna: false,
      }));

    if (slot.sign === lagnaSign) {
      occupants.unshift({
        body: "Lagna",
        short: "As",
        degree: lagnaDegree,
        retrograde: false,
        isLagna: true,
      });
    }

    return {
      sign: slot.sign,
      area: slot.area,
      signShort: signShortName(slot.sign),
      house: house?.number ?? (slot.sign === lagnaSign ? 1 : null),
      isLagna: slot.sign === lagnaSign,
      occupants,
    };
  });

  const title = divisionTitle(division.division);
  return {
    division: division.division,
    title,
    lagnaSign,
    lagnaDegree,
    cells,
    label: describeDivisionView({ title, lagnaSign, lagnaDegree, cells }),
  };
}

function divisionTitle(division: number): string {
  if (division === 1) {
    return "Rashi";
  }
  if (division === 9) {
    return "Navamsha";
  }
  return `D${division}`;
}

function describeDivisionCell(cell: DivisionCell): string {
  const house = cell.house === null ? "" : `, house ${cell.house}`;
  if (cell.occupants.length === 0) {
    return `${cell.sign}${house}: empty`;
  }
  const bodies = cell.occupants
    .map((occupant) => {
      const retro = occupant.retrograde ? " retrograde" : "";
      return `${occupant.body}${retro} ${occupant.degree}`.trim();
    })
    .join(", ");
  return `${cell.sign}${house}: ${bodies}`;
}

function describeDivisionView({
  title,
  lagnaSign,
  lagnaDegree,
  cells,
}: Pick<
  DivisionView,
  "title" | "lagnaSign" | "lagnaDegree" | "cells"
>): string {
  return `${title} South Indian chart. Lagna ${lagnaSign} ${lagnaDegree}. ${cells
    .map(describeDivisionCell)
    .join(". ")}`;
}

export interface HeadlineInput {
  readonly lagna: {
    readonly sign: string;
    readonly longitude: number | null;
  };
  readonly d1: ChartDivision | undefined;
  readonly vimshottari: readonly ChartDashaPeriod[];
}

export interface HeadlineFacts {
  ascendant: string;
  moon: string;
  star: string;
  mahadasha: string;
}

/** Headline facts under the name, with the current mahadasha evaluated at `now`. */
export function buildHeadlineView(
  { lagna, d1, vimshottari }: HeadlineInput,
  now: string,
): HeadlineFacts {
  const dashaIndex = findCurrentPeriodIndex(vimshottari, now);
  const currentDasha =
    dashaIndex === -1 ? null : (vimshottari[dashaIndex] ?? null);
  const moon =
    d1?.placements.find((placement) => placement.body === "Moon") ?? null;

  return {
    ascendant: `${lagna.sign} ${formatLongitude(lagna.longitude)}`,
    moon: moon ? `${moon.sign} ${formatLongitude(moon.longitude)}` : "—",
    star:
      moon && moon.star !== ""
        ? `${moon.star}${moon.pada ? ` · Pada ${moon.pada}` : ""}`
        : "—",
    mahadasha: currentDasha ? currentDasha.mahadasha : "—",
  };
}
