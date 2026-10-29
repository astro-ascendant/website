import { Data, DateTime, Effect, Schema } from "effect";
import { find } from "geo-tz";
import type { ChartErrorCode } from "@/lib/chart-errors";

/**
 * Moment handling follows the same discipline as the astro-ascendant skills:
 * a birth is one instant plus a verbatim offset string. Nothing downstream
 * needs an IANA zone, and a bare wall-clock time is never accepted — the
 * offset is the only timezone information the record carries.
 */

/** ISO 8601 moment with an explicit offset, e.g. "2002-01-28T22:54:00+03:00". */
export const OffsetMoment = Schema.Trim.check(
  Schema.isPattern(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
  ),
);

/** A wall-clock moment as the chart form collects it, without any offset. */
const WallClock = Schema.Struct({
  date: Schema.Trim.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/)),
  time: Schema.Trim.check(Schema.isPattern(/^\d{2}:\d{2}(?::\d{2})?$/)),
});
type WallClock = Schema.Schema.Type<typeof WallClock>;

/** Decodes a moment with an explicit offset into a UTC instant. */
const MomentFromString = Schema.Struct({
  date: Schema.DateTimeUtcFromString,
});

/**
 * Why a birth moment could not be resolved. The code crosses the seam to the
 * client unchanged; the copy for it lives in `@/lib/chart-errors`.
 */
export class BirthMomentError extends Data.TaggedError("BirthMomentError")<{
  readonly code: Exclude<ChartErrorCode, "calculationFailed">;
  readonly cause?: unknown;
}> {}

/** Verbatim offset string for minutes east of UTC, e.g. 180 becomes "+03:00". */
function offsetFromMinutes(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const absolute = Math.abs(minutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const rest = String(absolute % 60).padStart(2, "0");
  return `${sign}${hours}:${rest}`;
}

/** "22:54" and "22:54:00" both become the seconds-precision form. */
function withSeconds(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

/** Decode an ISO moment with an explicit offset into `Chart.Moment`. */
const decodeMoment = Effect.fn("BirthMoment.decode")(function* (input: string) {
  return yield* Schema.decodeUnknownEffect(MomentFromString)({
    date: input,
  }).pipe(
    Effect.mapError(
      (cause) => new BirthMomentError({ code: "unresolvedMoment", cause }),
    ),
  );
});

/**
 * The wall clock read as if it were UTC. Used only to find the offset in force
 * at that local time; the returned instant is not the birth instant.
 */
const wallClockAsUtc = Effect.fn("BirthMoment.wallClockAsUtc")(function* (
  wall: WallClock,
) {
  const moment = yield* decodeMoment(`${wall.date}T${withSeconds(wall.time)}Z`);
  return moment.date;
});

/**
 * `DateTime` parses "2002-02-30" by rolling into March, so compare the wall
 * clock against the decoded instant and reject dates that do not exist.
 */
const assertRealWallClock = Effect.fn("BirthMoment.assertRealWallClock")(
  function* (wall: WallClock, instant: DateTime.Utc) {
    if (
      !DateTime.formatIso(instant).startsWith(
        `${wall.date}T${withSeconds(wall.time)}`,
      )
    ) {
      return yield* Effect.fail(
        new BirthMomentError({ code: "impossibleMoment", cause: wall }),
      );
    }
  },
);

/** Offset of an instant in a zone, in minutes east of UTC. */
const zoneOffsetMinutesAt = Effect.fn("BirthMoment.zoneOffsetMinutesAt")(
  function* (instant: DateTime.Utc, timeZone: string) {
    return yield* Effect.try({
      try: () => {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone,
          hour12: false,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        const parts = new Map(
          formatter
            .formatToParts(DateTime.toDateUtc(instant))
            .map((part) => [part.type, part.value]),
        );
        const asUtc = Date.UTC(
          Number(parts.get("year")),
          Number(parts.get("month")) - 1,
          Number(parts.get("day")),
          Number(parts.get("hour")) % 24,
          Number(parts.get("minute")),
          Number(parts.get("second")),
        );
        return Math.round((asUtc - DateTime.toEpochMillis(instant)) / 60_000);
      },
      catch: (cause) =>
        new BirthMomentError({ code: "unresolvedOffset", cause }),
    });
  },
);

/** IANA zone covering the coordinates, as an effectful lookup. */
const findTimeZone = Effect.fn("BirthMoment.findTimeZone")(function* (
  latitude: number,
  longitude: number,
) {
  return yield* Effect.try({
    try: () => {
      const [zone] = find(latitude, longitude);
      if (zone === undefined) {
        throw new Error("No IANA zone covers these coordinates.");
      }
      return zone;
    },
    catch: (cause) => new BirthMomentError({ code: "unknownTimeZone", cause }),
  });
});

/**
 * Minutes east of UTC for a wall-clock time in a zone. Two passes so a moment
 * near a DST transition settles on the offset in force at birth.
 */
const resolveOffsetMinutes = Effect.fn("BirthMoment.resolveOffsetMinutes")(
  function* (wall: WallClock, timeZone: string) {
    const wallAsUtc = yield* wallClockAsUtc(wall);
    yield* assertRealWallClock(wall, wallAsUtc);
    const firstPass = yield* zoneOffsetMinutesAt(wallAsUtc, timeZone);
    const nearBirth = DateTime.subtract({ minutes: firstPass })(wallAsUtc);
    return yield* zoneOffsetMinutesAt(nearBirth, timeZone);
  },
);

/**
 * Turn a wall clock at a place into one instant plus the offset it was built
 * from. The coordinates supply the zone, so the result never depends on the
 * caller's machine.
 */
const resolveBirthMoment = Effect.fn("BirthMoment.resolveBirthMoment")(
  function* (wall: WallClock, latitude: number, longitude: number) {
    const timeZone = yield* findTimeZone(latitude, longitude);
    const minutes = yield* resolveOffsetMinutes(wall, timeZone);
    const offset = offsetFromMinutes(minutes);
    const moment = yield* decodeMoment(
      `${wall.date}T${withSeconds(wall.time)}${offset}`,
    );
    return { moment, offset, timeZone };
  },
);

/**
 * An instant the caller already expressed with an explicit offset. The offset
 * is the timezone information on this path: there is no zone to look up and
 * none to display, exactly as the skills contract requires.
 */
const resolveOffsetMoment = Effect.fn("BirthMoment.resolveOffsetMoment")(
  function* (value: string) {
    const moment = yield* decodeMoment(value);
    const suffix = /([+-]\d{2}:\d{2})$/.exec(value)?.[1] ?? "+00:00";
    return { moment, offset: suffix, timeZone: null };
  },
);

export interface BirthMomentRequest {
  readonly date?: string;
  readonly time?: string;
  /** ISO moment with an explicit offset; used only when date and time are empty. */
  readonly utcIso?: string;
  readonly latitude: number;
  readonly longitude: number;
}

/**
 * The one way in: a wall clock at a place (`date` + `time`), or an instant the
 * caller already expressed with an explicit offset (`utcIso`). Returns the
 * instant, the offset it was built from and, for a wall clock, the zone.
 */
export const resolveMoment = Effect.fn("BirthMoment.resolve")(function* (
  request: BirthMomentRequest,
) {
  const date = request.date ?? "";
  const time = request.time ?? "";
  if (date === "" && time === "") {
    if (request.utcIso === undefined) {
      return yield* Effect.fail(
        new BirthMomentError({ code: "missingMoment" }),
      );
    }
    return yield* resolveOffsetMoment(request.utcIso);
  }
  const wall = yield* Schema.decodeUnknownEffect(WallClock)({
    date,
    time,
  }).pipe(
    Effect.mapError(
      (cause) => new BirthMomentError({ code: "invalidRequest", cause }),
    ),
  );
  return yield* resolveBirthMoment(wall, request.latitude, request.longitude);
});
