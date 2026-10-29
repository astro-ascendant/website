import { describe, expect, test } from "bun:test";
import { castChart, TEST_BIRTHS } from "@/server/test-charts";
import { buildChartWheel, spreadLabels } from "./chart-wheel";

const results = await Promise.all(TEST_BIRTHS.map(castChart));

describe("buildChartWheel", () => {
  test("draws twelve houses and the nine grahas", () => {
    for (const result of results) {
      const wheel = buildChartWheel(result);
      expect(wheel?.data.houses).toHaveLength(12);
      expect(wheel?.planets.map((planet) => planet.label)).toEqual([
        "Su",
        "Mo",
        "Ma",
        "Me",
        "Ju",
        "Ve",
        "Sa",
        "Ra",
        "Ke",
      ]);
    }
  });

  test("puts each body in the KP house the server placed it in", () => {
    for (const result of results) {
      const wheel = buildChartWheel(result);
      for (const body of wheel?.data.bodies ?? []) {
        const row = result.kp.rows.find((entry) => entry.name === body.name);
        expect(body.house).toBe(row?.house ?? -1);
        expect(body.longitude).toBeCloseTo(row?.longitude ?? -1, 9);
      }
    }
  });

  test("puts the Ascendant at nine o'clock", () => {
    const wheel = buildChartWheel(results[0]!);
    const firstCusp = wheel?.cusps.find((cusp) => cusp.house === 1);
    expect(firstCusp?.y1).toBeCloseTo(wheel?.center ?? 0, 6);
    expect(firstCusp?.x1).toBeLessThan(wheel?.center ?? 0);
  });

  test("describes the wheel for screen readers", () => {
    const wheel = buildChartWheel(results[0]!);
    expect(wheel?.label).toStartWith("Circular chart. Ascendant ");
    expect(wheel?.label).toContain("Moon");
  });

  test("returns null without a full set of cusps", () => {
    const result = results[0]!;
    expect(
      buildChartWheel({
        ...result,
        kp: { ...result.kp, cusps: result.kp.cusps.slice(0, 6) },
      }),
    ).toBeNull();
  });
});

describe("spreadLabels", () => {
  test("pushes crowded labels apart and off cusps", () => {
    const spread = spreadLabels([10, 11, 12], [100]);
    const sorted = [...spread].sort((a, b) => a - b);
    expect((sorted[1] ?? 0) - (sorted[0] ?? 0)).toBeGreaterThanOrEqual(7.4);
    expect((sorted[2] ?? 0) - (sorted[1] ?? 0)).toBeGreaterThanOrEqual(7.4);
    expect(spreadLabels([101], [100])[0]).toBeGreaterThanOrEqual(104);
  });

  test("leaves well-separated labels alone and keeps input order", () => {
    expect(spreadLabels([200, 50, 120], [0])).toEqual([200, 50, 120]);
  });
});
