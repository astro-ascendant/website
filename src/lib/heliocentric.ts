/**
 * Low-precision sky positions for the decorative landing-page orrery: JPL's
 * "Approximate Positions of the Planets" Keplerian elements (Standish, valid
 * 1800-2050, about 1° accurate), a short lunar series, a mean lunar node and a
 * linear Lahiri ayanamsa. Chart calculations go through astro-ascendant instead.
 */
import { normalizeLongitude } from "./zodiac";

const DAY_MS = 86_400_000;
const J2000 = Date.UTC(2000, 0, 1, 12);
const DEG = Math.PI / 180;

export const ORRERY_PLANETS = [
  "mercury",
  "venus",
  "earth",
  "mars",
  "jupiter",
  "saturn",
] as const;

export type OrreryPlanet = (typeof ORRERY_PLANETS)[number];

// Each element is [value at J2000, change per Julian century]: semi-major axis
// (AU), eccentricity, inclination, mean longitude, longitude of perihelion,
// longitude of the ascending node.
const ELEMENTS: Record<OrreryPlanet, [number, number][]> = {
  mercury: [
    [0.38709927, 0.00000037],
    [0.20563593, 0.00001906],
    [7.00497902, -0.00594749],
    [252.2503235, 149472.67411175],
    [77.45779628, 0.16047689],
    [48.33076593, -0.12534081],
  ],
  venus: [
    [0.72333566, 0.0000039],
    [0.00677672, -0.00004107],
    [3.39467605, -0.0007889],
    [181.9790995, 58517.81538729],
    [131.60246718, 0.00268329],
    [76.67984255, -0.27769418],
  ],
  earth: [
    [1.00000261, 0.00000562],
    [0.01671123, -0.00004392],
    [-0.00001531, -0.01294668],
    [100.46457166, 35999.37244981],
    [102.93768193, 0.32327364],
    [0, 0],
  ],
  mars: [
    [1.52371034, 0.00001847],
    [0.0933941, 0.00007882],
    [1.84969142, -0.00813131],
    [-4.55343205, 19140.30268499],
    [-23.94362959, 0.44441088],
    [49.55953891, -0.29257343],
  ],
  jupiter: [
    [5.202887, -0.00011607],
    [0.04838624, -0.00013253],
    [1.30439695, -0.00183714],
    [34.39644051, 3034.74612775],
    [14.72847983, 0.21252668],
    [100.47390909, 0.20469106],
  ],
  saturn: [
    [9.53667594, -0.0012506],
    [0.05386179, -0.00050991],
    [2.48599187, 0.00193609],
    [49.95424423, 1222.49362201],
    [92.59887831, -0.41897216],
    [113.66242448, -0.28867794],
  ],
};

/** Heliocentric ecliptic x, y in AU, tropical. */
function heliocentricXY(planet: OrreryPlanet, timeMs: number): [number, number] {
  const T = (timeMs - J2000) / (36525 * DAY_MS);
  const [a, e, I, L, perihelion, node] = ELEMENTS[planet].map(
    ([value, rate]) => value + rate * T,
  ) as [number, number, number, number, number, number];
  const w = (perihelion - node) * DEG;
  const O = node * DEG;
  const inc = I * DEG;
  const M = normalizeLongitude(L - perihelion) * DEG;

  let E = M + e * Math.sin(M);
  for (let i = 0; i < 6; i++) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }

  // Orbital-plane coordinates, rotated into the ecliptic.
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const cO = Math.cos(O);
  const sO = Math.sin(O);
  const ci = Math.cos(inc);
  return [
    (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp,
    (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp,
  ];
}

/** Heliocentric tropical ecliptic longitude of a planet in degrees, [0, 360). */
export function heliocentricLongitude(planet: OrreryPlanet, timeMs: number): number {
  const [x, y] = heliocentricXY(planet, timeMs);
  return normalizeLongitude(Math.atan2(y, x) / DEG);
}

/**
 * Geocentric tropical longitude of the Moon in degrees, [0, 360). Meeus's
 * low-precision series (about 0.3° accurate), enough for the orrery's dot.
 */
export function geocentricMoonLongitude(timeMs: number): number {
  const d = (timeMs - J2000) / DAY_MS;
  const meanLongitude = 218.316 + 13.176396 * d;
  const meanAnomaly = (134.963 + 13.064993 * d) * DEG;
  return normalizeLongitude(meanLongitude + 6.289 * Math.sin(meanAnomaly));
}

/** Lahiri ayanamsa, linear approximation (good to a few arcminutes this century). */
function ayanamsa(timeMs: number) {
  const years = (timeMs - J2000) / (365.25 * DAY_MS);
  return 23.853 + years * 0.013969;
}

/** Heliocentric sidereal (Lahiri) longitude in degrees, [0, 360). */
export function heliocentricSidereal(planet: OrreryPlanet, timeMs: number) {
  return normalizeLongitude(heliocentricLongitude(planet, timeMs) - ayanamsa(timeMs));
}

export type Graha =
  | "Sun"
  | "Moon"
  | "Mars"
  | "Mercury"
  | "Jupiter"
  | "Venus"
  | "Saturn"
  | "Rahu"
  | "Ketu";

/** Vedic order, as the tables on the chart page list them. */
export const GRAHAS: Graha[] = [
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

const GRAHA_PLANET: Partial<Record<Graha, OrreryPlanet>> = {
  Mars: "mars",
  Mercury: "mercury",
  Jupiter: "jupiter",
  Venus: "venus",
  Saturn: "saturn",
};

function geocentricTropical(graha: Graha, timeMs: number): number {
  if (graha === "Moon") return geocentricMoonLongitude(timeMs);
  if (graha === "Rahu" || graha === "Ketu") {
    // Mean lunar node; Ketu sits opposite Rahu.
    const d = (timeMs - J2000) / DAY_MS;
    const rahu = 125.0445 - 0.0529539 * d;
    return normalizeLongitude(graha === "Rahu" ? rahu : rahu + 180);
  }
  const [ex, ey] = heliocentricXY("earth", timeMs);
  const planet = GRAHA_PLANET[graha];
  const [px, py] = planet ? heliocentricXY(planet, timeMs) : [0, 0];
  return normalizeLongitude(Math.atan2(py - ey, px - ex) / DEG);
}

/** Geocentric sidereal (Lahiri) longitude in degrees, [0, 360). */
export function geocentricSidereal(graha: Graha, timeMs: number) {
  return normalizeLongitude(geocentricTropical(graha, timeMs) - ayanamsa(timeMs));
}

/** Retrograde when the geocentric longitude is falling. The nodes always are. */
export function isRetrograde(graha: Graha, timeMs: number) {
  if (graha === "Rahu" || graha === "Ketu") return true;
  if (graha === "Sun" || graha === "Moon") return false;
  const delta =
    geocentricSidereal(graha, timeMs + DAY_MS / 4) - geocentricSidereal(graha, timeMs);
  return ((delta + 540) % 360) - 180 < 0;
}

/** Width of one nakshatra (lunar mansion): the zodiac splits into 27. */
export const NAKSHATRA_SPAN = 360 / 27;
