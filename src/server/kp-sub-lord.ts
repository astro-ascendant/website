import { normalizeLongitude } from "@/lib/zodiac";

/**
 * KP sub-lord of a sidereal longitude. astro-ascendant computes this for
 * house cusps (`house.subLord`) but does not export it for planets, so the
 * same division runs here: each nakshatra is split into nine subs in
 * Vimshottari order, starting from the star lord, sized by dasha years.
 * The tests hold this to the library's cusp sub-lords.
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

export function kpSubLordOf(longitude: number): string {
  const position = normalizeLongitude(longitude);
  const star = Math.floor(position / NAKSHATRA_SPAN);
  const elapsed = (position % NAKSHATRA_SPAN) / NAKSHATRA_SPAN;
  let edge = 0;
  for (let offset = 0; offset < VIMSHOTTARI_CYCLE.length; offset += 1) {
    const [lord, years] =
      VIMSHOTTARI_CYCLE[(star + offset) % VIMSHOTTARI_CYCLE.length];
    edge += years / 120;
    if (elapsed < edge) {
      return lord;
    }
  }
  return VIMSHOTTARI_CYCLE[(star + 8) % VIMSHOTTARI_CYCLE.length][0];
}
