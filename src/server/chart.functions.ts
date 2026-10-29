import { createServerFn } from "@tanstack/react-start";
import { Effect, Exit, Schema } from "effect";
import type { ChartErrorCode, ChartResponse } from "@/lib/chart-errors";
import { OffsetMoment, resolveMoment } from "@/server/birth-moment";
import { calculateChart } from "@/server/calculate-chart";
import { runtime } from "@/server/runtime.server";

/**
 * The birth is accepted as a wall clock at a place (`date` + `time`), which
 * the server resolves to one instant plus the offset in force there. A caller
 * that already knows the instant may send `utcIso` instead, but only with an
 * explicit offset: a bare local time would be read as UTC and silently shift
 * the chart.
 */
const ChartRequest = Schema.Struct({
  date: Schema.optionalKey(Schema.Trim),
  time: Schema.optionalKey(Schema.Trim),
  utcIso: Schema.optionalKey(OffsetMoment),
  latitude: Schema.Finite.check(
    Schema.isBetween({ minimum: -90, maximum: 90 }),
  ),
  longitude: Schema.Finite.check(
    Schema.isBetween({ minimum: -180, maximum: 180 }),
  ),
  place: Schema.optionalKey(Schema.Trim),
  name: Schema.optionalKey(Schema.Trim),
  sex: Schema.optionalKey(Schema.Literals(["Male", "Female"])),
});

const refuse = (code: ChartErrorCode): ChartResponse => ({ ok: false, code });

/**
 * Casts a chart. Every failure comes back as a `ChartErrorCode` in the
 * response rather than a thrown message, so the client never parses prose.
 */
const castChart = Effect.fn("Chart.request")(function* (input: unknown) {
  const body = yield* Schema.decodeUnknownEffect(ChartRequest)(input);
  const resolved = yield* resolveMoment(body);
  // Calculation engine: astro-ascendant (Effect-first TypeScript, Swiss
  // Ephemeris via SwissephLayer). The client only sees the JSON contract in
  // src/lib/chart.ts.
  const result = yield* calculateChart({
    moment: resolved.moment,
    latitude: body.latitude,
    longitude: body.longitude,
    place: body.place ?? "",
    name: body.name ?? "",
    ...(body.sex === undefined ? {} : { sex: body.sex }),
    localDate: body.date ?? "",
    localTime: body.time ?? "",
    offset: resolved.offset,
    timeZone: resolved.timeZone,
  });
  return { ok: true, result } satisfies ChartResponse;
});

export const getChart = createServerFn({ method: "POST" })
  .validator((input: Schema.Codec.Encoded<typeof ChartRequest>) => input)
  .handler(async ({ data }): Promise<ChartResponse> => {
    const exit = await runtime.runPromiseExit(
      castChart(data).pipe(
        Effect.catchTags({
          SchemaError: () => Effect.succeed(refuse("invalidRequest")),
          BirthMomentError: (error) => Effect.succeed(refuse(error.code)),
          CalculateChartError: (error) =>
            Effect.logError("chart calculation failed", error.message).pipe(
              Effect.as(refuse("calculationFailed")),
            ),
        }),
        Effect.tapDefect(Effect.logError),
        Effect.tap(() => Effect.logInfo("chart calculation complete")),
        Effect.withLogSpan("chart.total"),
      ),
    );
    return Exit.isSuccess(exit) ? exit.value : refuse("calculationFailed");
  });
