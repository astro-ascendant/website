import {
  findBirthProfile,
  upsertBirthProfile,
  type BirthProfile,
} from "@/lib/birth-profiles";
import type { ChartBirthInput, ChartFieldKey, ChartResult } from "@/lib/chart";
import type { ChartFailure } from "@/lib/chart-errors";
import type { PlaceOption } from "@/lib/place";

type ChartStatus = "empty" | "calculating" | "failure" | "success";

export type ChartFieldErrors = Partial<Record<ChartFieldKey, string>>;

/**
 * Everything the chart page knows, in one value: the birth details being
 * edited, the place search, and the calculation. One reducer owns every
 * transition, so the form, the search and the report cannot drift apart.
 */
export interface ChartSessionState {
  readonly birth: ChartBirthInput;
  readonly selectedPlace: PlaceOption | null;
  readonly savedProfiles: readonly BirthProfile[];
  readonly fieldErrors: ChartFieldErrors;
  readonly placeOptions: readonly PlaceOption[];
  readonly searchError: string;
  readonly status: ChartStatus;
  readonly result: ChartResult | null;
  /**
   * What the reader asked for. Kept through a failure so the report header
   * still names the chart that did not cast, and the editor stays reachable.
   */
  readonly attempt: ChartBirthInput | null;
  readonly failure: ChartFailure | null;
}

export type ChartSessionEvent =
  | { readonly type: "edit"; readonly patch: Partial<ChartBirthInput> }
  | { readonly type: "selectPlace"; readonly option: PlaceOption }
  | { readonly type: "applyProfile"; readonly name: string }
  | { readonly type: "searchStart"; readonly query: string }
  | {
      readonly type: "searchResults";
      readonly options: readonly PlaceOption[];
    }
  | { readonly type: "searchFail" }
  | { readonly type: "invalid"; readonly fields: ChartFieldErrors }
  | { readonly type: "start"; readonly birth: ChartBirthInput }
  | { readonly type: "succeed"; readonly result: ChartResult }
  | { readonly type: "fail"; readonly failure: ChartFailure };

/** Shortest query the place search runs for. */
export const MIN_PLACE_QUERY = 3;

const EMPTY_BIRTH: ChartBirthInput = {
  name: "",
  date: "",
  time: "",
  place: "",
  latitude: Number.NaN,
  longitude: Number.NaN,
};

export function initialChartSessionState(
  savedProfiles: readonly BirthProfile[],
): ChartSessionState {
  return {
    birth: EMPTY_BIRTH,
    selectedPlace: null,
    savedProfiles,
    fieldErrors: {},
    placeOptions: [],
    searchError: "",
    status: "empty",
    result: null,
    attempt: null,
    failure: null,
  };
}

function withoutErrors(
  errors: ChartFieldErrors,
  keys: readonly ChartFieldKey[],
): ChartFieldErrors {
  if (!keys.some((key) => errors[key] !== undefined)) {
    return errors;
  }
  const next = { ...errors };
  for (const key of keys) {
    delete next[key];
  }
  return next;
}

const FIELD_KEYS = ["name", "date", "time", "place"] as const;

/** The first field with an error, in form order: where focus should go. */
export function firstInvalidField(
  fields: ChartFieldErrors,
): ChartFieldKey | undefined {
  return FIELD_KEYS.find((key) => fields[key] !== undefined);
}

/**
 * Session transitions. `start` deliberately keeps the previous result: the
 * report header reads that snapshot until a new result replaces it.
 */
export function reduceChartSession(
  state: ChartSessionState,
  event: ChartSessionEvent,
): ChartSessionState {
  switch (event.type) {
    case "edit":
      return {
        ...state,
        birth: { ...state.birth, ...event.patch },
        fieldErrors: withoutErrors(
          state.fieldErrors,
          FIELD_KEYS.filter((key) => event.patch[key] !== undefined),
        ),
      };
    case "selectPlace":
      return {
        ...state,
        selectedPlace: event.option,
        birth: {
          ...state.birth,
          place: event.option.displayName,
          latitude: event.option.latitude,
          longitude: event.option.longitude,
        },
        fieldErrors: withoutErrors(state.fieldErrors, ["place"]),
      };
    case "applyProfile": {
      const profile = findBirthProfile(state.savedProfiles, event.name);
      if (!profile) {
        return state;
      }
      return {
        ...state,
        fieldErrors: {},
        birth: {
          name: profile.name,
          date: profile.date,
          time: profile.time,
          place: profile.place,
          latitude: profile.latitude,
          longitude: profile.longitude,
          sex: profile.sex,
        },
        selectedPlace: {
          id: `saved:${profile.place}`,
          name: profile.place.split(",")[0]?.trim() || profile.place,
          displayName: profile.place,
          latitude: profile.latitude,
          longitude: profile.longitude,
        },
      };
    }
    case "searchStart":
      return {
        ...state,
        fieldErrors: withoutErrors(state.fieldErrors, ["place"]),
        searchError: "",
        placeOptions:
          event.query.trim().length < MIN_PLACE_QUERY ? [] : state.placeOptions,
      };
    case "searchResults":
      return {
        ...state,
        placeOptions: event.options,
        searchError:
          event.options.length === 0
            ? "No places found. Try a different spelling."
            : "",
      };
    case "searchFail":
      return {
        ...state,
        searchError: "Place search failed. Check your connection and retry.",
      };
    case "invalid":
      return {
        ...state,
        fieldErrors: event.fields,
        status: "empty",
        result: null,
        attempt: null,
        failure: null,
      };
    case "start":
      return {
        ...state,
        status: "calculating",
        attempt: event.birth,
        failure: null,
      };
    case "succeed": {
      const attempt = state.attempt;
      return {
        ...state,
        status: "success",
        result: event.result,
        failure: null,
        savedProfiles:
          attempt === null || attempt.name.trim() === ""
            ? state.savedProfiles
            : upsertBirthProfile(state.savedProfiles, attempt),
      };
    }
    case "fail":
      return {
        ...state,
        status: "failure",
        result: null,
        failure: event.failure,
      };
  }
}
