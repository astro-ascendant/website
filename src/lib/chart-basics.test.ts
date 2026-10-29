import { describe, expect, test } from "bun:test";
import { createLatestRequest } from "@/components/chart/latest-request";
import { validateChartInput } from "./chart";
import { ChartRequestError, describeChartError } from "./chart-errors";
import {
  findCurrentPeriodIndex,
  formatDashaDate,
  formatDashaDuration,
} from "./dasha-time";
import { bodyShortName, formatLongitude, signShortName } from "./zodiac";

describe("zodiac", () => {
  test("formats sign-relative degrees and never rounds into the next sign", () => {
    expect(formatLongitude(31.85)).toBe("1°51'");
    expect(formatLongitude(59.9999)).toBe("29°59'");
    expect(formatLongitude(-1)).toBe("29°00'");
    expect(formatLongitude(null)).toBe("");
    expect(formatLongitude(Number.NaN)).toBe("");
  });

  test("short names", () => {
    expect(signShortName("Sagittarius")).toBe("Sag");
    expect(bodyShortName("Rahu")).toBe("Ra");
    expect(bodyShortName("Lagna")).toBe("As");
  });
});

describe("dasha time", () => {
  const periods = [
    { start: "2000-01-01T00:00:00.000Z", end: "2010-01-01T00:00:00.000Z" },
    { start: "2010-01-01T00:00:00.000Z", end: "2020-01-01T00:00:00.000Z" },
  ];

  test("finds the period running at an instant, end exclusive", () => {
    expect(findCurrentPeriodIndex(periods, "2010-01-01T00:00:00.000Z")).toBe(1);
    expect(findCurrentPeriodIndex(periods, "2025-01-01T00:00:00.000Z")).toBe(
      -1,
    );
    expect(findCurrentPeriodIndex(periods, "not a date")).toBe(-1);
  });

  test("formats dates and calendar spans", () => {
    expect(formatDashaDate("1987-05-26T17:41:00.000Z")).toBe("26 May 1987");
    expect(
      formatDashaDuration("2000-01-31T00:00:00Z", "2001-03-01T00:00:00Z"),
    ).toBe("1Y 1M 1D");
    expect(formatDashaDuration("2000-01-01", "2000-01-01")).toBe("");
  });
});

describe("validateChartInput", () => {
  const birth = {
    name: "A",
    date: "1990-07-15",
    time: "10:00",
    place: "Chennai",
    latitude: 13,
    longitude: 80,
  };

  test("accepts a complete birth", () => {
    expect(validateChartInput(birth)).toEqual({ ok: true, fields: {} });
  });

  test("asks for a suggested place when coordinates are missing", () => {
    expect(
      validateChartInput({ ...birth, latitude: Number.NaN }).fields,
    ).toEqual({ place: "Choose a birth place from the suggestions." });
  });
});

describe("describeChartError", () => {
  test("shows copy for codes the reader can act on", () => {
    expect(
      describeChartError(new ChartRequestError("impossibleMoment")),
    ).toEqual({
      title: "Check the birth details",
      message: "That date and time do not exist. Check the birth date.",
    });
  });

  test("keeps engine failures and crashes generic", () => {
    const generic = describeChartError(
      new ChartRequestError("calculationFailed"),
    );
    expect(generic.title).toBe("The chart didn't calculate");
    expect(describeChartError(new Error("boom"))).toEqual(generic);
  });

  test("recognises an offline client", () => {
    expect(describeChartError(new TypeError("Failed to fetch")).title).toBe(
      "Couldn't reach the calculator",
    );
  });
});

describe("createLatestRequest", () => {
  test("only the newest request is current, and older ones are aborted", () => {
    const gate = createLatestRequest();
    const first = gate.begin();
    const second = gate.begin();
    expect(first.signal.aborted).toBe(true);
    expect(gate.isCurrent(first.id)).toBe(false);
    expect(gate.isCurrent(second.id)).toBe(true);
    gate.cancel();
    expect(second.signal.aborted).toBe(true);
    expect(gate.isCurrent(second.id)).toBe(false);
  });
});
