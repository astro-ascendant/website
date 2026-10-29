import {
  BodyId,
  HouseSystem,
  Perspective,
  SiderealMode,
  ZodiacType,
  type CelestialPosition,
  type ChartData,
  type HouseCusp,
} from "@astrologer/astro-core";
import type { ChartResult } from "./chart";
import { bodyShortName, normalizeLongitude, signGlyph } from "./zodiac";

/**
 * The circular KP wheel as data. `buildChartWheel` turns a chart result into
 * everything the wheel draws: the Co-Star library's `ChartData`, the overlay
 * marks the library omits (house numbers, cusp lines that meet the sign band,
 * two-letter planet labels nudged apart, the Ascendant marker) and the
 * screen-reader description. Planets and cusps both come from the KP
 * calculation, so every body sits in the Placidus house the server placed it
 * in. The component only renders the result.
 */
export const WHEEL_SIZE = 600;

const CENTER = WHEEL_SIZE / 2;
const SIGN_RING_OUTER = 290;
const SIGN_RING_INNER = 250;
const HOUSE_NUMBER_RADIUS = 192;
const HOUSE_LINE_INNER = 201;
const ASC_INNER_RADIUS = 196;
const ASC_LABEL_RADIUS = 174;
const PLANET_LABEL_RADIUS = 223;
const PLANET_TICK_INNER = 240;
/** Glyphs are narrower than the two-letter labels, so labels need more room. */
const LABEL_SEPARATION = 7.5;
const LABEL_CUSP_GAP = 4;
/** The Ascendant is drawn at 9 o'clock; the wheel rotates to put it there. */
const ASC_ANGLE = 180;

const BODY_IDS: Record<string, BodyId> = {
  Sun: BodyId.Sun,
  Moon: BodyId.Moon,
  Mars: BodyId.Mars,
  Mercury: BodyId.Mercury,
  Jupiter: BodyId.Jupiter,
  Venus: BodyId.Venus,
  Saturn: BodyId.Saturn,
  Rahu: BodyId.TrueNode,
  Ketu: BodyId.SouthNode,
};

const PHASE_NAMES = [
  "New Moon",
  "Waxing Crescent",
  "First Quarter",
  "Waxing Gibbous",
  "Full Moon",
  "Waning Gibbous",
  "Last Quarter",
  "Waning Crescent",
] as const;

interface WheelLine {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

interface WheelCuspMark extends WheelLine {
  readonly house: number;
  /** Houses 1, 4, 7 and 10, drawn heavier. */
  readonly angular: boolean;
}

interface WheelHouseNumber {
  readonly house: number;
  readonly x: number;
  readonly y: number;
}

interface WheelPlanetMark {
  readonly body: string;
  readonly label: string;
  readonly retrograde: boolean;
  /** Tick on the planet's true longitude. */
  readonly tick: WheelLine;
  /** Label position after spreading crowded labels apart. */
  readonly x: number;
  readonly y: number;
}

export interface ChartWheel {
  /** Input for `<CostarChart>`. */
  readonly data: ChartData;
  readonly center: number;
  readonly signRings: readonly number[];
  readonly cusps: readonly WheelCuspMark[];
  readonly houseNumbers: readonly WheelHouseNumber[];
  readonly planets: readonly WheelPlanetMark[];
  readonly ascendant: WheelLine & {
    readonly labelX: number;
    readonly labelY: number;
  };
  /** Screen-reader description of the whole wheel. */
  readonly label: string;
}

/** Forward distance from `from` to `to` along the zodiac, in [0, 360). */
function forward(from: number, to: number): number {
  return normalizeLongitude(to - from);
}

function point(angle: number, radius: number): [number, number] {
  const radians = (angle * Math.PI) / 180;
  return [
    CENTER + radius * Math.cos(radians),
    CENTER - radius * Math.sin(radians),
  ];
}

function line(angle: number, inner: number, outer: number): WheelLine {
  const [x1, y1] = point(angle, inner);
  const [x2, y2] = point(angle, outer);
  return { x1, y1, x2, y2 };
}

function housesFromKp(result: ChartResult): HouseCusp[] {
  return result.kp.cusps
    .flatMap((cusp) =>
      cusp.longitude === null
        ? []
        : [
            {
              house: cusp.house,
              longitude: cusp.longitude,
              degree: normalizeLongitude(cusp.longitude) % 30,
              sign: cusp.sign,
              emoji: signGlyph(cusp.sign),
            },
          ],
    )
    .sort((a, b) => a.house - b.house);
}

function bodiesFromKp(result: ChartResult): CelestialPosition[] {
  return result.kp.rows.flatMap((row) => {
    const id = BODY_IDS[row.name];
    if (id === undefined || row.longitude === null) {
      return [];
    }
    const longitude = normalizeLongitude(row.longitude);
    return [
      {
        id,
        name: row.name,
        longitude,
        degree: longitude % 30,
        latitude: 0,
        declination: 0,
        distance: 0,
        speed: 0,
        isRetrograde: row.retrograde,
        house: row.house ?? 1,
        sign: row.sign,
        emoji: signGlyph(row.sign),
      },
    ];
  });
}

function lunarPhase(
  bodies: readonly CelestialPosition[],
): ChartData["lunarPhase"] {
  const sun = bodies.find((body) => body.id === BodyId.Sun);
  const moon = bodies.find((body) => body.id === BodyId.Moon);
  const elongation =
    sun && moon ? normalizeLongitude(moon.longitude - sun.longitude) : 0;
  return {
    phaseName:
      PHASE_NAMES[Math.floor(((elongation + 22.5) % 360) / 45)] ?? "New Moon",
    illumination: (1 - Math.cos((elongation * Math.PI) / 180)) / 2,
    age: (elongation / 360) * 29.530_59,
    isWaxing: elongation < 180,
  };
}

/**
 * Relax overlapping labels apart while each tick stays on the true longitude,
 * and push labels off cusp lines. Returns each body's label longitude.
 */
export function spreadLabels(
  longitudes: readonly number[],
  cusps: readonly number[],
): number[] {
  const list = longitudes
    .map((original, index) => ({ index, current: original }))
    .sort((a, b) => a.current - b.current);
  const count = list.length;

  for (let pass = 0; pass < 100; pass += 1) {
    let moved = false;

    for (let index = 0; index < count; index += 1) {
      const body = list[index];
      const next = list[(index + 1) % count];
      if (!body || !next || body === next) {
        continue;
      }
      const gap = forward(body.current, next.current);
      if (gap < LABEL_SEPARATION - 1e-3) {
        const push = (LABEL_SEPARATION - gap) / 2 + 0.05;
        body.current = normalizeLongitude(body.current - push);
        next.current = normalizeLongitude(next.current + push);
        moved = true;
      }
    }

    for (const body of list) {
      for (const cusp of cusps) {
        let distance = Math.abs(body.current - cusp);
        if (distance > 180) {
          distance = 360 - distance;
        }
        if (distance < LABEL_CUSP_GAP) {
          const ahead = forward(cusp, body.current) < 180;
          const push = LABEL_CUSP_GAP - distance + 0.1;
          body.current = normalizeLongitude(
            ahead ? body.current + push : body.current - push,
          );
          moved = true;
        }
      }
    }

    for (let index = 0; index < count; index += 1) {
      const body = list[index];
      const next = list[(index + 1) % count];
      if (!body || !next || body === next) {
        continue;
      }
      if (forward(body.current, next.current) > 300) {
        next.current = normalizeLongitude(body.current + LABEL_SEPARATION);
        moved = true;
      }
    }

    if (!moved) {
      break;
    }
  }

  const spread = Array.from({ length: count }, () => 0);
  for (const entry of list) {
    spread[entry.index] = entry.current;
  }
  return spread;
}

function describeWheel(
  houses: readonly HouseCusp[],
  bodies: readonly CelestialPosition[],
): string {
  const asc = houses.find((house) => house.house === 1);
  const spoken = bodies
    .map(
      (body) =>
        `${body.name}${body.isRetrograde ? " retrograde" : ""} ${body.sign} ${body.degree.toFixed(1)} degrees`,
    )
    .join(". ");
  return `Circular chart. Ascendant ${asc?.sign ?? ""} ${asc?.degree.toFixed(1) ?? ""} degrees. ${spoken}`;
}

/** The wheel for a chart result, or null when the KP cusps are incomplete. */
export function buildChartWheel(result: ChartResult): ChartWheel | null {
  const houses = housesFromKp(result);
  if (houses.length !== 12) {
    return null;
  }
  const bodies = bodiesFromKp(result);
  const asc = houses.find((house) => house.house === 1)?.longitude ?? 0;
  const mc = houses.find((house) => house.house === 10)?.longitude ?? 0;
  const rotation = ASC_ANGLE - asc;
  const onWheel = (longitude: number) =>
    normalizeLongitude(longitude + rotation);

  const houseNumbers = houses.map((house, index) => {
    const next = houses[(index + 1) % houses.length];
    const span =
      next === undefined ? 30 : forward(house.longitude, next.longitude) || 30;
    const [x, y] = point(
      onWheel(house.longitude + span / 2),
      HOUSE_NUMBER_RADIUS,
    );
    return { house: house.house, x, y };
  });

  // The library stops each cusp short of the sign band; these meet it.
  const cusps = houses.map((house) => ({
    house: house.house,
    angular: [1, 4, 7, 10].includes(house.house),
    ...line(onWheel(house.longitude), HOUSE_LINE_INNER, SIGN_RING_INNER),
  }));

  const labelLongitudes = spreadLabels(
    bodies.map((body) => body.longitude),
    houses.map((house) => house.longitude),
  );
  const planets = bodies.map((body, index) => {
    const [x, y] = point(
      onWheel(labelLongitudes[index] ?? body.longitude),
      PLANET_LABEL_RADIUS,
    );
    return {
      body: body.name,
      label: bodyShortName(body.name),
      retrograde: body.isRetrograde,
      tick: line(onWheel(body.longitude), SIGN_RING_INNER, PLANET_TICK_INNER),
      x,
      y,
    };
  });

  const [labelX, labelY] = point(ASC_ANGLE, ASC_LABEL_RADIUS);
  return {
    data: {
      bodies,
      houses,
      angles: {
        Asc: asc,
        MC: mc,
        Dsc: normalizeLongitude(asc + 180),
        IC: normalizeLongitude(mc + 180),
      },
      aspects: [],
      lunarPhase: lunarPhase(bodies),
      meta: {
        date: result.birth.utcIso,
        location: {
          latitude: result.birth.latitude,
          longitude: result.birth.longitude,
        },
        houseSystem: HouseSystem.Placidus,
        zodiacType: ZodiacType.Sidereal,
        siderealMode: SiderealMode.Krishnamurti,
        perspective: Perspective.Geocentric,
        bodies: bodies.map((body) => body.id),
      },
    },
    center: CENTER,
    signRings: [SIGN_RING_OUTER, SIGN_RING_INNER],
    cusps,
    houseNumbers,
    planets,
    ascendant: {
      ...line(ASC_ANGLE, ASC_INNER_RADIUS, SIGN_RING_INNER),
      labelX,
      labelY,
    },
    label: describeWheel(houses, bodies),
  };
}
