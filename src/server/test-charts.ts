import { Effect } from "effect";
import type { ChartResult } from "@/lib/chart";
import { resolveMoment } from "./birth-moment";
import { calculateChart } from "./calculate-chart";
import { runtime } from "./runtime.server";

/** Three births across hemispheres and zones, for tests that need real charts. */
export const TEST_BIRTHS = [
  { date: "1990-07-15", time: "10:00", latitude: 13.0827, longitude: 80.2707 },
  { date: "1985-01-02", time: "13:05", latitude: 40.7128, longitude: -74.006 },
  {
    date: "2001-11-23",
    time: "20:12",
    latitude: -33.8688,
    longitude: 151.2093,
  },
] as const;

/** Cast a chart through the real ephemeris, the same path `getChart` takes. */
export function castChart(
  birth: (typeof TEST_BIRTHS)[number],
): Promise<ChartResult> {
  return runtime.runPromise(
    Effect.gen(function* () {
      const resolved = yield* resolveMoment(birth);
      return yield* calculateChart({
        ...birth,
        moment: resolved.moment,
        place: "Test",
        name: "Test",
        localDate: birth.date,
        localTime: birth.time,
        offset: resolved.offset,
        timeZone: resolved.timeZone,
      });
    }),
  );
}
