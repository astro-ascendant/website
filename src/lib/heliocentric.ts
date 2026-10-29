/**
 * Heliocentric ecliptic longitudes from JPL's "Approximate Positions of the
 * Planets" Keplerian elements (Standish, valid 1800-2050, about 1° accurate).
 * Light enough for the decorative landing-page orrery; chart calculations go
 * through astro-ascendant instead.
 */

export const ORRERY_PLANETS = [
  "mercury",
  "venus",
  "earth",
  "mars",
  "jupiter",
  "saturn",
] as const;

export type OrreryPlanet = (typeof ORRERY_PLANETS)[number];

/**
 * Heliocentric ecliptic longitude of a planet in degrees, [0, 360).
 *
 * Keep this self-contained (no imports or module-level constants): the
 * landing page stringifies it into an inline script that places the planets
 * before hydration.
 */
export function heliocentricLongitude(
  planet: OrreryPlanet,
  timeMs: number,
): number {
  // Each element is [value at J2000, change per Julian century]: semi-major
  // axis (unused, it cancels out of the angle), eccentricity, inclination,
  // mean longitude, longitude of perihelion, longitude of the ascending node.
  const elements: Record<OrreryPlanet, [number, number][]> = {
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
  const DEG = Math.PI / 180;
  const T = (timeMs - Date.UTC(2000, 0, 1, 12)) / (36525 * 86_400_000);
  const [, e, I, L, perihelion, node] = elements[planet].map(
    ([value, rate]) => value + rate * T,
  );
  const w = (perihelion - node) * DEG;
  const O = node * DEG;
  const inc = I * DEG;
  const M = ((((L - perihelion) % 360) + 360) % 360) * DEG;

  let E = M + e * Math.sin(M);
  for (let i = 0; i < 6; i++) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }

  // Orbital-plane coordinates; the semi-major axis cancels out of the angle.
  const xp = Math.cos(E) - e;
  const yp = Math.sqrt(1 - e * e) * Math.sin(E);
  const x =
    (Math.cos(w) * Math.cos(O) - Math.sin(w) * Math.sin(O) * Math.cos(inc)) *
      xp +
    (-Math.sin(w) * Math.cos(O) - Math.cos(w) * Math.sin(O) * Math.cos(inc)) *
      yp;
  const y =
    (Math.cos(w) * Math.sin(O) + Math.sin(w) * Math.cos(O) * Math.cos(inc)) *
      xp +
    (-Math.sin(w) * Math.sin(O) + Math.cos(w) * Math.cos(O) * Math.cos(inc)) *
      yp;

  return (((Math.atan2(y, x) / DEG) % 360) + 360) % 360;
}
