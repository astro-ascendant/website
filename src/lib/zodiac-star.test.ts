import { describe, expect, test } from "bun:test";
import { castChart, TEST_BIRTHS } from "@/server/test-charts";
import { EXAMPLE_BIRTH } from "@/components/chart/hero-conversation";
import { starAt } from "./zodiac";

// The Navamsha table reads stars with `starAt`, since the engine only gives
// them for birth (D1) positions. Hold it to the engine where both exist.
const results = await Promise.all([...TEST_BIRTHS, EXAMPLE_BIRTH].map(castChart));

describe("starAt", () => {
  test("matches the engine's nakshatra and pada for every D1 planet and the Lagna", () => {
    for (const result of results) {
      const d1 = result.divisions.find((division) => division.division === 1)!;
      for (const placement of d1.placements) {
        expect({ body: placement.body, ...starAt(placement.longitude) }).toEqual({
          body: placement.body,
          name: placement.star,
          pada: placement.pada!,
        });
      }
      expect(starAt(result.lagna.longitude)).toEqual({
        name: result.lagna.star!,
        pada: result.lagna.pada!,
      });
    }
  });

  test("edges: 0° is Ashwini 1, the last arcminute is Revati 4, and missing input is null", () => {
    expect(starAt(0)).toEqual({ name: "Ashwini", pada: 1 });
    expect(starAt(359.99)).toEqual({ name: "Revati", pada: 4 });
    expect(starAt(360)).toEqual({ name: "Ashwini", pada: 1 });
    expect(starAt(null)).toBeNull();
    expect(starAt(Number.NaN)).toBeNull();
  });
});
