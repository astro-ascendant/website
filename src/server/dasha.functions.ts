import { createServerFn } from "@tanstack/react-start";
import { Dasha } from "astro-ascendant";
import { DateTime, Schema } from "effect";
import type { ChartSubPeriod } from "@/lib/chart";

const Lord = Schema.Literals([
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
  "Rahu",
  "Ketu",
]);

/**
 * A Vimshottari period to split one level down: an Antardasha (no
 * `pratyantardasha`) into its nine Pratyantardashas, or a Pratyantardasha
 * into its nine Sookshma dashas. The bounds are the ones the chart result
 * already carries, so the split matches the timeline exactly.
 */
const SubPeriodRequest = Schema.Struct({
  mahadasha: Lord,
  antardasha: Lord,
  pratyantardasha: Schema.optionalKey(Lord),
  start: Schema.String,
  end: Schema.String,
});

const toIso = (moment: DateTime.Utc) =>
  DateTime.toDateUtc(moment).toISOString();

function instant(iso: string): DateTime.Utc | null {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : DateTime.makeUnsafe(ms);
}

/**
 * The nine periods inside a Vimshottari Antardasha or Pratyantardasha, from
 * the library's own subdivision. Empty when the request does not describe a
 * real period. Pure arithmetic: no ephemeris is involved.
 */
export const getDashaSubPeriods = createServerFn({ method: "POST" })
  .validator((input: Schema.Codec.Encoded<typeof SubPeriodRequest>) => input)
  .handler(async ({ data }): Promise<ChartSubPeriod[]> => {
    const decoded = Schema.decodeUnknownOption(SubPeriodRequest)(data);
    if (decoded._tag === "None") {
      return [];
    }
    const request = decoded.value;
    const start = instant(request.start);
    const end = instant(request.end);
    if (start === null || end === null || end.epochMilliseconds <= start.epochMilliseconds) {
      return [];
    }
    if (request.pratyantardasha === undefined) {
      return Dasha.pratyantardashas(
        Dasha.AntarDasha.make({
          mahadasha: request.mahadasha,
          antardasha: request.antardasha,
          start,
          end,
        }),
      ).map((period) => ({
        lord: period.pratyantardasha,
        start: toIso(period.start),
        end: toIso(period.end),
      }));
    }
    return Dasha.sookshmas(
      Dasha.PratyantarDasha.make({
        mahadasha: request.mahadasha,
        antardasha: request.antardasha,
        pratyantardasha: request.pratyantardasha,
        start,
        end,
      }),
    ).map((period) => ({
      lord: period.sookshma,
      start: toIso(period.start),
      end: toIso(period.end),
    }));
  });
