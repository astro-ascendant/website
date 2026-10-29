import type {
  Argala,
  ArudhaPada,
  CharaKarakas,
  Chart,
  Dasha,
  Karakamsha,
  RashiDrishti,
  SAV,
  Upapada,
} from "astro-ascendant";
import { DateTime } from "effect";
import type { Effect } from "effect";
import type {
  ChartDashaPeriod,
  ChartResult,
  KpCuspRow,
  KpSignificatorRow,
} from "@/lib/chart";
import { SIGNS } from "@/lib/zodiac";
import type { CalculateChartInput } from "./calculate-chart";
import { kpSubLordOf } from "./kp-sub-lord";

export const HOUSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const PLANET_ORDER = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
  "Rahu",
  "Ketu",
] as const;

const SAV_PLANETS = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
] as const;

type DashaResult = Effect.Success<ReturnType<typeof Dasha.calculate>>;
type CharaResult = Effect.Success<ReturnType<typeof Dasha.calculateChara>>;
type SthiraResult = Effect.Success<ReturnType<typeof Dasha.calculateSthira>>;
type SavResult = Effect.Success<ReturnType<typeof SAV.calculate>>;
type KarakasResult = Effect.Success<ReturnType<typeof CharaKarakas.calculate>>;
type KarakamshaResult = Effect.Success<ReturnType<typeof Karakamsha.calculate>>;
type UpapadaResult = Effect.Success<ReturnType<typeof Upapada.calculate>>;
type DrishtiResult = Effect.Success<ReturnType<typeof RashiDrishti.calculate>>;
type ArgalaResult = Effect.Success<ReturnType<typeof Argala.calculate>>;
export type ArudhaMappingResult = Effect.Success<
  ReturnType<typeof ArudhaPada.calculate>
>;

/** Optional calculations, already resolved from their Effect results. */
export interface ChartMappingOptional {
  readonly vimshottari: DashaResult | null;
  readonly kpVimshottari: DashaResult | null;
  readonly chara: CharaResult | null;
  readonly sthira: SthiraResult | null;
  readonly sav: SavResult | null;
  readonly karakas: KarakasResult | null;
  readonly karakamsha: KarakamshaResult | null;
  readonly upapada: UpapadaResult | null;
  readonly drishti: DrishtiResult | null;
  readonly argala: ArgalaResult | null;
  readonly arudha: readonly (ArudhaMappingResult | null)[];
}

export interface ChartMappingInput {
  readonly input: CalculateChartInput;
  readonly calculation: Chart.ChartCalculation;
  readonly kpCalculation: Chart.ChartCalculation;
  readonly optional: ChartMappingOptional;
}

/**
 * Pure assembly of the chart contract: the library's calculations and the
 * optional Jaimini, dasha, and Ashtakavarga results become a `ChartResult`.
 * No Effect, no ephemeris, no clock. Internal to the chart calculation: only
 * `calculate-chart.ts` imports this module.
 */
export function toChartResult({
  input,
  calculation,
  kpCalculation,
  optional,
}: ChartMappingInput): ChartResult {
  const lagna = d1Lagna(calculation);
  return {
    birth: {
      name: input.name ?? "",
      utcIso: DateTime.formatIso(input.moment.date),
      date: input.localDate ?? "",
      time: input.localTime ?? "",
      timeZone: input.timeZone ?? null,
      utcOffset: input.offset ?? null,
      place: input.place,
      latitude: input.latitude,
      longitude: input.longitude,
    },
    // Report the method the engine actually used.
    astroParams: {
      ayanamsa: calculation.astroParams.ayanamsa,
      houseSystem: calculation.astroParams.houseSystem,
    },
    lagna: {
      sign: lagna.sign,
      longitude: lagna.longitude,
      house: 1,
    },
    kp: readKpChart(
      kpCalculation,
      toDashaPeriods(optional.kpVimshottari ?? []),
    ),
    divisions: readDivisions(calculation, calculation.placements.planets),
    dasha: {
      vimshottari: toDashaPeriods(optional.vimshottari ?? []),
      chara: toDashaPeriods(optional.chara?.mahadashas ?? []),
      sthira: toDashaPeriods(optional.sthira?.mahadashas ?? []),
    },
    jaimini: readJaimini(optional),
    sav: readSav(optional.sav),
  };
}

function findD1(calculation: Chart.ChartCalculation): Chart.Chart {
  return (
    calculation.charts.find((chart) => chart.division === 1) ??
    calculation.charts[0]
  );
}

export function d1Lagna(calculation: Chart.ChartCalculation): {
  sign: Chart.Rashis;
  longitude: number | null;
} {
  const d1 = findD1(calculation);
  const lagnaHouse =
    HOUSES.map((houseNumber) => d1.houses[houseNumber]).find(
      (house) => house.lagna !== null,
    ) ?? d1.houses[1];
  return {
    sign: lagnaHouse.sign,
    longitude: lagnaHouse.lagna?.longitude ?? null,
  };
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) =>
      word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word,
    )
    .join(" ");
}

function dignityLabel(
  dignities: readonly (
    | "EXALTED"
    | "MOOLA_TRIKONA"
    | "OWN"
    | "FRIEND"
    | "NEUTRAL"
    | "ENEMY"
    | "DEBILITATED"
  )[],
): string {
  const meaningful = dignities.find(
    (entry) =>
      entry === "EXALTED" ||
      entry === "MOOLA_TRIKONA" ||
      entry === "OWN" ||
      entry === "DEBILITATED",
  );
  return meaningful ? titleCase(meaningful) : "";
}

function toIsoDate(moment: DateTime.Utc): string {
  return DateTime.toDateUtc(moment).toISOString();
}

function toDashaPeriods(
  periods: readonly {
    readonly mahadasha: string;
    readonly start: DateTime.Utc;
    readonly end: DateTime.Utc;
    readonly antardashas: readonly {
      readonly antardasha: string;
      readonly start: DateTime.Utc;
      readonly end: DateTime.Utc;
    }[];
  }[],
): ChartDashaPeriod[] {
  return periods.map((period) => ({
    mahadasha: period.mahadasha,
    start: toIsoDate(period.start),
    end: toIsoDate(period.end),
    antardashas: period.antardashas.map((antara) => ({
      antardasha: antara.antardasha,
      start: toIsoDate(antara.start),
      end: toIsoDate(antara.end),
    })),
  }));
}

function readDivisions(
  calculation: Chart.ChartCalculation,
  sourcePlanets: readonly Chart.SourcePlanet[],
): ChartResult["divisions"] {
  return calculation.charts.map((chart) => {
    const division = chart.division;
    const planetHouse = new Map<string, number>();
    const houses: ChartResult["divisions"][number]["houses"] = HOUSES.map(
      (houseNumber) => {
        const house = chart.houses[houseNumber];
        const occupants = house.planets.map((planet) => {
          planetHouse.set(planet.name, houseNumber);
          return planet.name;
        });
        return {
          number: houseNumber,
          sign: house.sign,
          cusp: house.cusp ?? null,
          lord: house.signLord ?? "",
          occupants,
          significators: (house.significations ?? []).filter(
            (entry) => entry !== "",
          ),
        };
      },
    );
    const isSourceDivision = division === 1;
    const placements = HOUSES.flatMap((houseNumber) =>
      chart.houses[houseNumber].planets.map((planet) => {
        const source = sourcePlanets.find((item) => item.name === planet.name);
        return {
          body: planet.name,
          sign: planet.sign.name,
          longitude: planet.longitude,
          house: planetHouse.get(planet.name) ?? 0,
          // Star and pada are source (D1) evidence; divisional charts
          // reuse projected signs and houses, so only D1 rows carry them.
          star: isSourceDivision ? (source?.star.name ?? "") : "",
          pada: isSourceDivision ? (source?.star.pada ?? null) : null,
          state: planet.is_retrograde
            ? "Retrograde"
            : dignityLabel(planet.in_sign),
        };
      }),
    );
    return { division, placements, houses };
  });
}

/** First-seen order across KP signification levels (star, occupancy, ownership). */
function uniqueHousesInOrder(groups: readonly (readonly number[])[]): number[] {
  const seen = new Set<number>();
  const houses: number[] = [];
  for (const group of groups) {
    for (const house of group) {
      if (!seen.has(house)) {
        seen.add(house);
        houses.push(house);
      }
    }
  }
  return houses;
}

function signifyingHousesOf(
  signification: Chart.PlanetSignification | undefined,
): number[] {
  if (signification === undefined) {
    return [];
  }
  return uniqueHousesInOrder([
    signification.level1,
    signification.level2,
    signification.level3,
    signification.level4,
  ]);
}

function planetSignification(
  chart: Chart.Chart,
  planet: string,
): Chart.PlanetSignification | undefined {
  if (planet === "" || planet === "Lagna") {
    return undefined;
  }
  return chart.planetSignifications?.[planet as Chart.Planets];
}

/**
 * KP significators and cusps, all from the KP calculation (KP ayanamsa,
 * Placidus). Each row carries the body's KP longitude and the Placidus house
 * it occupies, so no view has to place Lahiri longitudes into KP cusps.
 */
function readKpChart(
  calculation: Chart.ChartCalculation,
  vimshottari: ChartDashaPeriod[],
): ChartResult["kp"] {
  const d1 = findD1(calculation);
  const sourceByName = new Map(
    calculation.placements.planets.map((planet) => [planet.name, planet]),
  );
  const placed = new Map<string, { planet: Chart.Planet; house: number }>();
  for (const houseNumber of HOUSES) {
    for (const planet of d1.houses[houseNumber].planets) {
      placed.set(planet.name, { planet, house: houseNumber });
    }
  }

  const lagnaHouse = d1.houses[1];
  const rows: KpSignificatorRow[] = [
    {
      name: "Lagna",
      sign: lagnaHouse.sign,
      longitude: lagnaHouse.cusp,
      house: 1,
      retrograde: false,
      signLord: lagnaHouse.signLord,
      starLord: lagnaHouse.starLord,
      subLord: lagnaHouse.subLord,
      signifyingHouses: signifyingHousesOf(
        planetSignification(d1, lagnaHouse.subLord),
      ),
    },
  ];

  for (const name of PLANET_ORDER) {
    const entry = placed.get(name);
    const planet = entry?.planet;
    rows.push({
      name,
      sign: planet?.sign.name ?? "",
      longitude: planet?.longitude ?? null,
      house: entry?.house ?? null,
      retrograde: planet?.is_retrograde ?? false,
      signLord: planet?.sign.lord ?? "",
      starLord: sourceByName.get(name)?.star.lord ?? "",
      subLord: planet === undefined ? "" : kpSubLordOf(planet.longitude),
      signifyingHouses: signifyingHousesOf(planetSignification(d1, name)),
    });
  }

  const cusps: KpCuspRow[] = HOUSES.map((houseNumber) => {
    const house = d1.houses[houseNumber];
    return {
      house: houseNumber,
      sign: house.sign,
      longitude: house.cusp,
      signLord: house.signLord,
      starLord: house.starLord,
      subLord: house.subLord,
      subSubLord: house.subSubLord,
    };
  });

  return {
    astroParams: {
      ayanamsa: calculation.astroParams.ayanamsa,
      houseSystem: calculation.astroParams.houseSystem,
    },
    rows,
    cusps,
    dasha: { vimshottari },
  };
}

function readJaimini(optional: ChartMappingOptional): ChartResult["jaimini"] {
  const karakas: ChartResult["jaimini"]["karakas"] = [];
  if (optional.karakas) {
    for (const [role, holders] of Object.entries(
      optional.karakas.assignments,
    )) {
      for (const holder of holders) {
        karakas.push({ role, planet: holder.planet });
      }
    }
  }
  return {
    karakas,
    karakamsha: optional.karakamsha?.placements[0]?.sign ?? "",
    upapada: optional.upapada?.sign ?? "",
    arudha: HOUSES.map((house, index) => ({
      house,
      pada: optional.arudha[index]?.sign ?? "",
    })),
    drishti: [...(optional.drishti?.targets ?? [])],
    argala: {
      supporting: (optional.argala?.supporting ?? []).map(
        (relation) => relation.sign,
      ),
      obstructing: (optional.argala?.obstructing ?? []).map(
        (relation) => relation.sign,
      ),
    },
  };
}

function readSav(sav: SavResult | null): ChartResult["sav"] {
  if (sav === null) {
    return { signs: [...SIGNS], rows: [], signTotals: [], total: 0 };
  }
  return {
    signs: [...SIGNS],
    rows: SAV_PLANETS.map((planet) => ({
      planet,
      points: SIGNS.map((sign) => sav.bhinna[planet][sign]),
      total: sav.totals[planet],
    })),
    signTotals: SIGNS.map((sign) => sav.sarva[sign]),
    total: sav.totals.sarva,
  };
}
