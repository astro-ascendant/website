import { describe, expect, test } from "bun:test";
import { heliocentricLongitude } from "./heliocentric";
import { normalizeLongitude } from "./zodiac";

const angleBetween = (a: number, b: number) =>
  Math.abs(normalizeLongitude(a - b + 180) - 180);

describe("heliocentricLongitude", () => {
  test("Earth sits opposite the Sun's geocentric longitude", () => {
    // 2024 March equinox (20 Mar 03:06 UTC): the Sun is at 0° tropical.
    const equinox = Date.UTC(2024, 2, 20, 3, 6);
    expect(
      angleBetween(heliocentricLongitude("earth", equinox), 180),
    ).toBeLessThan(0.5);
  });

  test("Earth and Jupiter line up at opposition", () => {
    // Jupiter opposition, 3 Nov 2023.
    const opposition = Date.UTC(2023, 10, 3, 5);
    expect(
      angleBetween(
        heliocentricLongitude("earth", opposition),
        heliocentricLongitude("jupiter", opposition),
      ),
    ).toBeLessThan(1);
  });

  test("Mercury completes an orbit in about 88 days", () => {
    const start = Date.UTC(2026, 0, 1);
    const later = start + 87.97 * 86_400_000;
    expect(
      angleBetween(
        heliocentricLongitude("mercury", start),
        heliocentricLongitude("mercury", later),
      ),
    ).toBeLessThan(0.5);
  });
});
