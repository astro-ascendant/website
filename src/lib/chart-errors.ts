import type { ChartResult } from "./chart";

/**
 * Why a chart request failed, as a code. The server answers with a code, never
 * prose, and the copy a reader sees is chosen once, here, on the client side
 * of the seam.
 */
export type ChartErrorCode =
  | "invalidRequest"
  | "missingMoment"
  | "impossibleMoment"
  | "unknownTimeZone"
  | "unresolvedOffset"
  | "unresolvedMoment"
  | "calculationFailed";

/** What `getChart` returns: the chart, or the reason there is none. */
export type ChartResponse =
  | { readonly ok: true; readonly result: ChartResult }
  | { readonly ok: false; readonly code: ChartErrorCode };

/** A chart request the server refused or could not complete. */
export class ChartRequestError extends Error {
  readonly code: ChartErrorCode;

  constructor(code: ChartErrorCode) {
    super(`Chart request failed: ${code}`);
    this.name = "ChartRequestError";
    this.code = code;
  }
}

/** Failures the reader can fix by changing the birth details. */
const ACTIONABLE: Partial<Record<ChartErrorCode, string>> = {
  invalidRequest: "Check the birth date, time and coordinates.",
  missingMoment:
    "Send the birth date and time (date: YYYY-MM-DD, time: HH:MM).",
  impossibleMoment: "That date and time do not exist. Check the birth date.",
  unknownTimeZone:
    "Could not determine the time zone for this place. Check the coordinates.",
  unresolvedOffset: "Could not resolve the time zone offset for this place.",
  unresolvedMoment: "Could not resolve the birth moment.",
};

/** A failure as the reader should see it: what happened, in plain words. */
export interface ChartFailure {
  readonly title: string;
  readonly message: string;
}

const OFFLINE =
  /failed to fetch|load failed|networkerror|network request failed|fetch failed|err_internet|err_network|offline/i;

/**
 * Turns whatever the request threw into copy that names the problem and the
 * next step. Engine and transport details stay in the console, where they
 * help us and not the reader.
 */
export function describeChartError(error: unknown): ChartFailure {
  if (error instanceof ChartRequestError) {
    const message = ACTIONABLE[error.code];
    if (message !== undefined) {
      return { title: "Check the birth details", message };
    }
  } else if (OFFLINE.test(error instanceof Error ? error.message : "")) {
    return {
      title: "Couldn't reach the calculator",
      message:
        "The calculation service didn't answer. Check your internet connection, then try again.",
    };
  }

  return {
    title: "The chart didn't calculate",
    message:
      "Something went wrong while casting this chart. Try again, and if it keeps happening, check the birth date, time and place.",
  };
}
