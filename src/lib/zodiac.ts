/**
 * The zodiac vocabulary every chart view shares: the twelve signs in order,
 * their short names and glyphs, the planets' two-letter labels, and the
 * longitude arithmetic. One list, so server mapping, tables, the South Indian
 * grid and the wheel cannot disagree about a sign's name or position.
 */
export const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

type Sign = (typeof SIGNS)[number];

const SIGN_GLYPHS: Record<Sign, string> = {
  Aries: "♈",
  Taurus: "♉",
  Gemini: "♊",
  Cancer: "♋",
  Leo: "♌",
  Virgo: "♍",
  Libra: "♎",
  Scorpio: "♏",
  Sagittarius: "♐",
  Capricorn: "♑",
  Aquarius: "♒",
  Pisces: "♓",
};

function isSign(value: string): value is Sign {
  return (SIGNS as readonly string[]).includes(value);
}

/** Three-letter rasi label used by the tables and text summaries, e.g. "Sag". */
export function signShortName(sign: string): string {
  return sign.slice(0, 3);
}

export function signGlyph(sign: string): string {
  return isSign(sign) ? SIGN_GLYPHS[sign] : "";
}

const BODY_SHORT: Record<string, string> = {
  Lagna: "As",
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

/** Two-letter planet label, the convention shared by the charts and tables. */
export function bodyShortName(body: string): string {
  return BODY_SHORT[body] ?? body.slice(0, 2);
}

/** Wrap an angle into the half-open range [0, 360). */
export function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}

/**
 * Absolute sidereal longitude rendered as sign-relative degrees and arcminutes:
 * "1°51'". Minutes round to the nearest one; a value that would round up to
 * 30° is held at 29°59' so the degree never contradicts the sign shown beside
 * it. A missing or non-finite longitude renders as an empty string.
 */
export function formatLongitude(longitude: number | null | undefined): string {
  if (
    longitude === null ||
    longitude === undefined ||
    !Number.isFinite(longitude)
  ) {
    return "";
  }
  const totalMinutes = Math.min(
    Math.round((normalizeLongitude(longitude) % 30) * 60),
    29 * 60 + 59,
  );
  const degrees = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${degrees}°${String(minutes).padStart(2, "0")}'`;
}
