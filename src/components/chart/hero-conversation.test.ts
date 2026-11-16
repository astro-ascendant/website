import { describe, expect, test } from "bun:test";
import { castChart } from "@/server/test-charts";
import { EXAMPLE_BIRTH } from "./hero-conversation";

// The example chats on the empty /chart page describe Harini's chart. Cast it
// through the real engine and check every fact the replies state, so a
// library or settings change cannot quietly make them wrong.
const result = await castChart(EXAMPLE_BIRTH);
const d1 = result.divisions.find((division) => division.division === 1)!;
const placement = (body: string) =>
  d1.placements.find((entry) => entry.body === body)!;
const day = (iso: string) => iso.slice(0, 10);

describe("example conversation chart (Harini)", () => {
  test("Leo ascendant, Taurus 10th, Aquarius 7th", () => {
    expect(result.lagna.sign).toBe("Leo");
    const houses = new Map(d1.houses.map((house) => [house.number, house.sign]));
    expect(houses.get(10)).toBe("Taurus");
    expect(houses.get(7)).toBe("Aquarius");
    expect(houses.get(12)).toBe("Cancer");
  });

  test("placements the replies name", () => {
    expect(placement("Moon")).toMatchObject({ sign: "Aries", house: 9, star: "Bharani" });
    expect(placement("Rahu")).toMatchObject({ sign: "Taurus", house: 10 });
    expect(placement("Venus")).toMatchObject({ sign: "Gemini", house: 11 });
    expect(placement("Jupiter")).toMatchObject({ sign: "Cancer", house: 12, state: "Exalted" });
    expect(placement("Sun").house).toBe(12);
    expect(placement("Mercury").house).toBe(12);
  });

  test("Jaimini: Venus Atmakaraka, Upapada in Cancer", () => {
    expect(result.jaimini.karakas[0]).toEqual({ role: "Atmakaraka", planet: "Venus" });
    expect(result.jaimini.upapada).toBe("Cancer");
  });

  test("Rahu Mahadasha from 19 Oct 2026; Rahu and Saturn Antardasha dates", () => {
    const rahu = result.dasha.vimshottari.find((period) => period.mahadasha === "Rahu")!;
    expect(day(rahu.start)).toBe("2026-10-19");
    const antar = (lord: string) => rahu.antardashas.find((entry) => entry.antardasha === lord)!;
    expect(day(antar("Rahu").end)).toBe("2029-07-01");
    expect(day(antar("Saturn").start)).toBe("2031-11-25");
    expect(day(antar("Saturn").end)).toBe("2034-10-01");
  });
});
