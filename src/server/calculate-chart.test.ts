import { describe, expect, test } from "bun:test";
import { kpSubLordOf } from "./kp-sub-lord";
import { castChart, TEST_BIRTHS } from "./test-charts";

const results = await Promise.all(TEST_BIRTHS.map(castChart));

describe("calculateChart", () => {
  test("returns the birth as entered, with the resolved zone", () => {
    const [chennai] = results;
    expect(chennai?.birth).toMatchObject({
      date: "1990-07-15",
      time: "10:00",
      timeZone: "Asia/Kolkata",
      utcOffset: "+05:30",
      utcIso: "1990-07-15T04:30:00.000Z",
    });
  });

  test("casts every requested division", () => {
    for (const result of results) {
      expect(result.divisions.map((entry) => entry.division)).toEqual([
        1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60,
      ]);
    }
  });

  test("places every KP body in a Placidus house by its KP longitude", () => {
    for (const result of results) {
      const cusps = [...result.kp.cusps].sort((a, b) => a.house - b.house);
      for (const row of result.kp.rows.filter((r) => r.name !== "Lagna")) {
        expect(row.longitude).not.toBeNull();
        const longitude = row.longitude ?? 0;
        const span = cusps.find((cusp, index) => {
          const next = cusps[(index + 1) % cusps.length];
          const width =
            ((((next?.longitude ?? 0) - (cusp.longitude ?? 0)) % 360) + 360) %
            360;
          const offset =
            (((longitude - (cusp.longitude ?? 0)) % 360) + 360) % 360;
          return offset < width;
        });
        expect(row.house).toBe(span?.house ?? null);
      }
    }
  });

  test("KP longitudes follow the KP ayanamsa, not Lahiri", () => {
    const [chennai] = results;
    const lahiriSun = chennai?.divisions[0]?.placements.find(
      (placement) => placement.body === "Sun",
    )?.longitude;
    const kpSun = chennai?.kp.rows.find((row) => row.name === "Sun")?.longitude;
    // The two ayanamsas differ by a few arcminutes in 1990.
    const gap = Math.abs((lahiriSun ?? 0) - (kpSun ?? 0));
    expect(gap).toBeGreaterThan(0);
    expect(gap).toBeLessThan(0.5);
  });

  test("planet sub-lords use the same division as the library's cusp sub-lords", () => {
    for (const result of results) {
      for (const cusp of result.kp.cusps) {
        expect(kpSubLordOf(cusp.longitude ?? 0)).toBe(cusp.subLord);
      }
    }
  });
});
