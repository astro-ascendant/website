import { normalizeLongitude } from "@/lib/zodiac";

/**
 * KP sub and sub-sub lords of a sidereal longitude. astro-ascendant computes
 * these for house cusps (`house.subLord`, `house.subSubLord`) but does not
 * export them for planets, so the same division runs here: each nakshatra is split into nine subs in
 * Vimshottari order, starting from the star lord, sized by dasha years.
 * Each sub splits the same way again for the sub-sub lord. The tests hold
 * both to the library's cusp values.
 */
const NAKSHATRA_SPAN = 360 / 27;

const VIMSHOTTARI_CYCLE = [
  ["Ketu", 7],
  ["Venus", 20],
  ["Sun", 6],
  ["Moon", 10],
  ["Mars", 7],
  ["Rahu", 18],
  ["Jupiter", 16],
  ["Saturn", 19],
  ["Mercury", 17],
] as const;

/**
 * Splits a span into nine parts in Vimshottari order, starting from the lord
 * at `first`, each sized by its dasha years. Returns the lord whose part holds
 * `elapsed` (0..1 through the span) and how far through that part it sits.
 */
function divide(
  first: number,
  elapsed: number,
): { index: number; elapsed: number } {
  let edge = 0;
  for (let offset = 0; offset < VIMSHOTTARI_CYCLE.length; offset += 1) {
    const index = (first + offset) % VIMSHOTTARI_CYCLE.length;
    const share = VIMSHOTTARI_CYCLE[index][1] / 120;
    if (elapsed < edge + share) {
      return { index, elapsed: (elapsed - edge) / share };
    }
    edge += share;
  }
  return { index: (first + 8) % VIMSHOTTARI_CYCLE.length, elapsed: 1 };
}

/** Sub and sub-sub lords of a sidereal longitude, as KP divides a nakshatra. */
export function kpLordsOf(longitude: number): {
  subLord: string;
  subSubLord: string;
} {
  const position = normalizeLongitude(longitude);
  const star = Math.floor(position / NAKSHATRA_SPAN);
  const sub = divide(
    star % VIMSHOTTARI_CYCLE.length,
    (position % NAKSHATRA_SPAN) / NAKSHATRA_SPAN,
  );
  const subSub = divide(sub.index, sub.elapsed);
  return {
    subLord: VIMSHOTTARI_CYCLE[sub.index][0],
    subSubLord: VIMSHOTTARI_CYCLE[subSub.index][0],
  };
}

export function kpSubLordOf(longitude: number): string {
  return kpLordsOf(longitude).subLord;
}
