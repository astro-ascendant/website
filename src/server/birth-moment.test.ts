import { describe, expect, test } from "bun:test";
import { DateTime, Effect } from "effect";
import { resolveMoment, type BirthMomentRequest } from "./birth-moment";

function resolve(request: BirthMomentRequest) {
  return Effect.runPromise(
    resolveMoment(request).pipe(
      Effect.map((resolved) => ({
        utcIso: DateTime.formatIso(resolved.moment.date),
        offset: resolved.offset,
        timeZone: resolved.timeZone,
      })),
      Effect.catchTag("BirthMomentError", (error) =>
        Effect.succeed({ code: error.code }),
      ),
    ),
  );
}

const NEW_YORK = { latitude: 40.7128, longitude: -74.006 };
const CHENNAI = { latitude: 13.0827, longitude: 80.2707 };

describe("resolveMoment", () => {
  test("reads a wall clock in the zone at the coordinates", async () => {
    expect(
      await resolve({ date: "1990-07-15", time: "10:00", ...CHENNAI }),
    ).toEqual({
      utcIso: "1990-07-15T04:30:00.000Z",
      offset: "+05:30",
      timeZone: "Asia/Kolkata",
    });
  });

  test("uses the offset in force at birth on either side of a DST change", async () => {
    expect(
      await resolve({ date: "2021-03-13", time: "12:00", ...NEW_YORK }),
    ).toMatchObject({ offset: "-05:00" });
    expect(
      await resolve({ date: "2021-03-15", time: "12:00", ...NEW_YORK }),
    ).toMatchObject({ offset: "-04:00" });
  });

  test("rejects a date that does not exist", async () => {
    expect(
      await resolve({ date: "2002-02-30", time: "10:00", ...CHENNAI }),
    ).toEqual({ code: "impossibleMoment" });
  });

  test("rejects a malformed wall clock as an invalid request", async () => {
    expect(
      await resolve({ date: "15/07/1990", time: "10:00", ...CHENNAI }),
    ).toEqual({ code: "invalidRequest" });
  });

  test("asks for a moment when neither form is given", async () => {
    expect(await resolve({ ...CHENNAI })).toEqual({ code: "missingMoment" });
  });

  test("takes an explicit offset moment as given, with no zone", async () => {
    expect(
      await resolve({ utcIso: "2002-01-28T22:54:00+03:00", ...CHENNAI }),
    ).toEqual({
      utcIso: "2002-01-28T19:54:00.000Z",
      offset: "+03:00",
      timeZone: null,
    });
  });
});
