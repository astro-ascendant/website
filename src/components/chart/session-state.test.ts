import { describe, expect, test } from "bun:test";
import type { ChartBirthInput, ChartResult } from "@/lib/chart";
import type { PlaceOption } from "@/lib/place";
import {
  firstInvalidField,
  initialChartSessionState,
  reduceChartSession,
  type ChartSessionEvent,
  type ChartSessionState,
} from "./session-state";

const BIRTH: ChartBirthInput = {
  name: "Harini",
  date: "1990-07-15",
  time: "10:00",
  place: "Chennai, India",
  latitude: 13.08,
  longitude: 80.27,
};

const CHENNAI: PlaceOption = {
  id: "1",
  name: "Chennai",
  displayName: "Chennai, India",
  latitude: 13.08,
  longitude: 80.27,
};

const RESULT = { birth: { name: "Harini" } } as ChartResult;
const FAILURE = { title: "t", message: "m" };

function run(
  events: readonly ChartSessionEvent[],
  state: ChartSessionState = initialChartSessionState([]),
): ChartSessionState {
  return events.reduce(reduceChartSession, state);
}

describe("reduceChartSession", () => {
  test("editing a field clears only that field's error", () => {
    const state = run([
      { type: "invalid", fields: { name: "x", date: "y" } },
      { type: "edit", patch: { name: "H" } },
    ]);
    expect(state.fieldErrors).toEqual({ date: "y" });
    expect(state.birth.name).toBe("H");
  });

  test("choosing a place fills the birth coordinates", () => {
    const state = run([
      { type: "invalid", fields: { place: "pick one" } },
      { type: "selectPlace", option: CHENNAI },
    ]);
    expect(state.birth).toMatchObject({
      place: "Chennai, India",
      latitude: 13.08,
      longitude: 80.27,
    });
    expect(state.fieldErrors).toEqual({});
  });

  test("a saved profile fills the whole form", () => {
    const state = run(
      [{ type: "applyProfile", name: " Harini " }],
      initialChartSessionState([BIRTH]),
    );
    expect(state.birth).toEqual({ ...BIRTH, sex: undefined });
    expect(state.selectedPlace?.name).toBe("Chennai");
    expect(run([{ type: "applyProfile", name: "Nobody" }])).toEqual(
      initialChartSessionState([]),
    );
  });

  test("a short place query clears the suggestions", () => {
    const withOptions = run([{ type: "searchResults", options: [CHENNAI] }]);
    expect(withOptions.placeOptions).toEqual([CHENNAI]);
    expect(
      run([{ type: "searchStart", query: "Ch" }], withOptions).placeOptions,
    ).toEqual([]);
    expect(
      run([{ type: "searchStart", query: "Chen" }], withOptions).placeOptions,
    ).toEqual([CHENNAI]);
  });

  test("an empty search says so; a failed one asks to retry", () => {
    expect(run([{ type: "searchResults", options: [] }]).searchError).toBe(
      "No places found. Try a different spelling.",
    );
    expect(run([{ type: "searchFail" }]).searchError).toContain("retry");
  });

  test("a successful cast remembers the named birth", () => {
    const state = run([
      { type: "start", birth: BIRTH },
      { type: "succeed", result: RESULT },
    ]);
    expect(state.status).toBe("success");
    expect(state.result).toBe(RESULT);
    expect(state.attempt).toBe(BIRTH);
    expect(state.savedProfiles.map((profile) => profile.name)).toEqual([
      "Harini",
    ]);
  });

  test("an unnamed cast is not remembered", () => {
    const state = run([
      { type: "start", birth: { ...BIRTH, name: " " } },
      { type: "succeed", result: RESULT },
    ]);
    expect(state.savedProfiles).toEqual([]);
  });

  test("recasting keeps the previous result until the new one lands", () => {
    const state = run([
      { type: "start", birth: BIRTH },
      { type: "succeed", result: RESULT },
      { type: "start", birth: { ...BIRTH, time: "11:00" } },
    ]);
    expect(state.status).toBe("calculating");
    expect(state.result).toBe(RESULT);
  });

  test("a failure keeps the attempt so the header still names the chart", () => {
    const state = run([
      { type: "start", birth: BIRTH },
      { type: "fail", failure: FAILURE },
    ]);
    expect(state).toMatchObject({
      status: "failure",
      result: null,
      attempt: BIRTH,
      failure: FAILURE,
    });
  });

  test("invalid input clears the report and shows the errors", () => {
    const state = run([
      { type: "start", birth: BIRTH },
      { type: "succeed", result: RESULT },
      { type: "invalid", fields: { time: "Enter a birth time." } },
    ]);
    expect(state).toMatchObject({
      status: "empty",
      result: null,
      attempt: null,
      fieldErrors: { time: "Enter a birth time." },
    });
  });
});

describe("firstInvalidField", () => {
  test("follows form order", () => {
    expect(firstInvalidField({ place: "a", date: "b" })).toBe("date");
    expect(firstInvalidField({})).toBeUndefined();
  });
});
