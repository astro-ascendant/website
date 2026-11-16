import { describe, expect, test } from "bun:test";
import { mergeBirthProfiles, type BirthProfile } from "./birth-profiles";

const profile = (name: string, time = "10:00"): BirthProfile => ({
  name,
  date: "1990-07-15",
  time,
  place: "Chennai, India",
  latitude: 13.0827,
  longitude: 80.2707,
});

describe("mergeBirthProfiles", () => {
  test("adds stored profiles the browser lacks after its own", () => {
    expect(
      mergeBirthProfiles([profile("Test A")], [profile("Test B")]),
    ).toEqual([profile("Test A"), profile("Test B")]);
  });

  test("keeps the browser's copy when a name is in both", () => {
    expect(
      mergeBirthProfiles([profile("Test A", "09:00")], [profile("Test A")]),
    ).toEqual([profile("Test A", "09:00")]);
  });

  test("caps the list at twenty", () => {
    const remote = Array.from({ length: 25 }, (_, i) => profile(`Test ${i}`));
    expect(mergeBirthProfiles([], remote)).toHaveLength(20);
  });
});
