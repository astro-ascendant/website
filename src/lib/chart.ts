/**
 * The chart contract: what the client sends to cast a chart, how that input
 * is validated, and the `ChartResult` the server returns. Server-safe: no
 * presentation code lives here.
 */
export interface ChartBirthInput {
  name: string;
  date: string;
  time: string;
  place: string;
  latitude: number;
  longitude: number;
  sex?: "Male" | "Female";
}
export type ChartFieldKey = "name" | "date" | "time" | "place";

export interface ChartInputValidation {
  ok: boolean;
  fields: Partial<Record<ChartFieldKey, string>>;
}

function isFiniteLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isFiniteLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function validateChartInput(
  input: ChartBirthInput,
): ChartInputValidation {
  const fields: ChartInputValidation["fields"] = {};
  if (input.name.trim() === "") {
    fields.name = "Enter a name.";
  }
  if (input.date.trim() === "") {
    fields.date = "Enter a birth date.";
  }
  if (input.time.trim() === "") {
    fields.time = "Enter a birth time.";
  }
  if (input.place.trim() === "") {
    fields.place = "Enter a birth place.";
  } else if (
    !isFiniteLatitude(input.latitude) ||
    !isFiniteLongitude(input.longitude)
  ) {
    fields.place = "Choose a birth place from the suggestions.";
  }
  return { ok: Object.keys(fields).length === 0, fields };
}

export const ALL_DIVISIONS = [
  1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60,
] as const;

export interface ChartPlacement {
  body: string;
  sign: string;
  longitude: number | null;
  house: number;
  star: string;
  pada: number | null;
  state: string;
}

export interface ChartHouse {
  number: number;
  sign: string;
  cusp: number | null;
  lord: string;
  occupants: string[];
  significators: string[];
}

export interface ChartDivision {
  division: number;
  placements: ChartPlacement[];
  houses: ChartHouse[];
}

export interface ChartDashaPeriod {
  mahadasha: string;
  start: string;
  end: string;
  antardashas: { antardasha: string; start: string; end: string }[];
}

export interface KpSignificatorRow {
  name: string;
  /** Sign by the KP ayanamsa; may differ from the Lahiri D1 sign. */
  sign: string;
  /** Sidereal longitude by the KP ayanamsa. */
  longitude: number | null;
  /** Placidus house the body occupies; 1 for the Lagna row. */
  house: number | null;
  retrograde: boolean;
  signLord: string;
  starLord: string;
  subLord: string;
  signifyingHouses: number[];
}

export interface KpCuspRow {
  house: number;
  sign: string;
  longitude: number | null;
  signLord: string;
  starLord: string;
  subLord: string;
  subSubLord: string;
}

export interface KpChart {
  astroParams: {
    ayanamsa: string;
    houseSystem: string;
  };
  rows: KpSignificatorRow[];
  cusps: KpCuspRow[];
  /** Vimshottari periods from the KP calculation's own Moon position. */
  dasha: {
    vimshottari: ChartDashaPeriod[];
  };
}

export interface ChartResult {
  birth: {
    name: string;
    utcIso: string;
    /** Wall-clock birth date as entered, YYYY-MM-DD. */
    date: string;
    /** Wall-clock birth time as entered, HH:MM(:SS). */
    time: string;
    /** IANA zone resolved from the birth coordinates, when known. */
    timeZone: string | null;
    /** Verbatim offset the instant was built from, e.g. "+03:00", when known. */
    utcOffset: string | null;
    place: string;
    latitude: number;
    longitude: number;
  };
  astroParams: {
    ayanamsa: string;
    houseSystem: string;
  };
  lagna: {
    sign: string;
    longitude: number | null;
    house: number;
  };
  kp: KpChart;
  divisions: ChartDivision[];
  dasha: {
    vimshottari: ChartDashaPeriod[];
    chara: ChartDashaPeriod[];
    sthira: ChartDashaPeriod[];
  };
  jaimini: {
    karakas: { role: string; planet: string }[];
    karakamsha: string;
    upapada: string;
    arudha: { house: number; pada: string }[];
    drishti: string[];
    argala: {
      supporting: string[];
      obstructing: string[];
    };
  };
  sav: {
    signs: string[];
    rows: { planet: string; points: number[]; total: number }[];
    signTotals: number[];
    total: number;
  };
}
