import {
  createContext,
  use,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  loadBirthProfiles,
  saveBirthProfiles,
  type BirthProfile,
} from "@/lib/birth-profiles";
import {
  validateChartInput,
  type ChartBirthInput,
  type ChartResult,
} from "@/lib/chart";
import { describeChartError, ChartRequestError } from "@/lib/chart-errors";
import {
  buildChartPromptUrl,
  type ChartPromptProvider,
} from "@/lib/chart-report";
import { searchPlaces, type PlaceOption } from "@/lib/place";
import { getChart } from "@/server/chart.functions";
import { createLatestRequest, type LatestRequestGate } from "./latest-request";
import {
  firstInvalidField,
  initialChartSessionState,
  MIN_PLACE_QUERY,
  reduceChartSession,
  type ChartSessionState,
} from "./session-state";

interface ChartSessionActions {
  updateBirth: (patch: Partial<ChartBirthInput>) => void;
  selectPlace: (option: PlaceOption) => void;
  applyProfile: (name: string) => void;
  /** Debounced place search; short queries clear the suggestions. */
  queryPlaces: (text: string) => void;
  /** Validates, then casts. Rejects when the chart could not be cast. */
  calculate: () => Promise<void>;
  savePdf: () => void;
  askAI: (provider: ChartPromptProvider) => void;
}

export interface ChartSessionValue {
  state: ChartSessionState;
  actions: ChartSessionActions;
  /** The instant "now" for running dashas, as an ISO string. */
  clock: () => string;
}

/** Everything the session reaches outside React; tests swap these. */
export interface ChartSessionDeps {
  requestChart: (
    birth: ChartBirthInput,
    signal: AbortSignal,
  ) => Promise<ChartResult>;
  searchPlaces: (query: string, signal: AbortSignal) => Promise<PlaceOption[]>;
  debounceMs: number;
  clock: () => string;
  loadProfiles: () => BirthProfile[];
  saveProfiles: (profiles: readonly BirthProfile[]) => void;
  savePdf: (result: ChartResult) => Promise<void>;
  openUrl: (url: string) => void;
}

async function requestChart(
  birth: ChartBirthInput,
  signal: AbortSignal,
): Promise<ChartResult> {
  const response = await getChart({
    data: {
      date: birth.date,
      time: birth.time,
      latitude: birth.latitude,
      longitude: birth.longitude,
      place: birth.place,
      name: birth.name.trim(),
      ...(birth.sex ? { sex: birth.sex } : {}),
    },
    signal,
  });
  if (!response.ok) {
    throw new ChartRequestError(response.code);
  }
  return response.result;
}

/** The PDF renderer loads on the first save, not with the page. */
async function downloadPdf(result: ChartResult): Promise<void> {
  const { buildChartPdf } = await import("@/lib/chart-pdf");
  const url = URL.createObjectURL(await buildChartPdf(result));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "birth-chart.pdf";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const defaultDeps: ChartSessionDeps = {
  requestChart,
  searchPlaces,
  debounceMs: 400,
  clock: () => new Date().toISOString(),
  loadProfiles: loadBirthProfiles,
  saveProfiles: saveBirthProfiles,
  savePdf: downloadPdf,
  openUrl: (url) => window.open(url, "_blank", "noopener"),
};

const ChartSessionContext = createContext<ChartSessionValue | null>(null);

export function useChartSession(): ChartSessionValue {
  const value = use(ChartSessionContext);
  if (!value) {
    throw new Error("Chart components must be used inside Chart.Provider.");
  }
  return value;
}

/**
 * The chart page's state and actions: birth details, place search,
 * calculation, and the report's exports. Every transition goes through
 * `reduceChartSession`; this hook only adds timers, requests and storage.
 */
function useChartSessionController(
  overrides: Partial<ChartSessionDeps>,
): ChartSessionValue {
  const deps = { ...defaultDeps, ...overrides };
  const [state, dispatch] = useReducer(
    reduceChartSession,
    deps.loadProfiles,
    (load) => initialChartSessionState(load()),
  );
  const [search] = useState<LatestRequestGate>(createLatestRequest);
  const [chart] = useState<LatestRequestGate>(createLatestRequest);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storedProfiles = useRef(state.savedProfiles);

  useEffect(
    () => () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
      search.cancel();
      chart.cancel();
    },
    [search, chart],
  );

  // A chart cast under a name is remembered for the next visit.
  useEffect(() => {
    if (state.savedProfiles !== storedProfiles.current) {
      storedProfiles.current = state.savedProfiles;
      deps.saveProfiles(state.savedProfiles);
    }
  });

  const runSearch = async (query: string) => {
    const request = search.begin();
    try {
      const options = await deps.searchPlaces(query, request.signal);
      if (search.isCurrent(request.id)) {
        dispatch({ type: "searchResults", options });
      }
    } catch {
      if (search.isCurrent(request.id) && !request.signal.aborted) {
        dispatch({ type: "searchFail" });
      }
    }
  };

  const queryPlaces = (text: string) => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    dispatch({ type: "searchStart", query: text });
    const query = text.trim();
    if (query.length < MIN_PLACE_QUERY) {
      search.cancel();
      return;
    }
    timer.current = setTimeout(() => {
      timer.current = null;
      void runSearch(query);
    }, deps.debounceMs);
  };

  const calculate = async () => {
    const birth = state.birth;
    const validation = validateChartInput(birth);
    if (!validation.ok) {
      dispatch({ type: "invalid", fields: validation.fields });
      const first = firstInvalidField(validation.fields);
      if (first !== undefined) {
        queueMicrotask(() =>
          document.getElementById(`chart-${first}`)?.focus(),
        );
      }
      throw new Error("Chart details are incomplete.");
    }
    const request = chart.begin();
    dispatch({ type: "start", birth });
    try {
      const result = await deps.requestChart(birth, request.signal);
      if (chart.isCurrent(request.id)) {
        dispatch({ type: "succeed", result });
      }
    } catch (error) {
      if (!chart.isCurrent(request.id)) {
        return;
      }
      console.error("Chart calculation failed", error);
      dispatch({ type: "fail", failure: describeChartError(error) });
      throw error;
    }
  };

  const savePdf = () => {
    if (state.result !== null) {
      void deps.savePdf(state.result);
    }
  };

  const askAI = (provider: ChartPromptProvider) => {
    if (state.result !== null) {
      deps.openUrl(buildChartPromptUrl(state.result, provider, deps.clock()));
    }
  };

  return {
    state,
    actions: {
      updateBirth: (patch) => dispatch({ type: "edit", patch }),
      selectPlace: (option) => dispatch({ type: "selectPlace", option }),
      applyProfile: (name) => dispatch({ type: "applyProfile", name }),
      queryPlaces,
      calculate,
      savePdf,
      askAI,
    },
    clock: deps.clock,
  };
}

export function ChartProvider({
  children,
  deps = {},
}: {
  children: ReactNode;
  deps?: Partial<ChartSessionDeps>;
}) {
  const value = useChartSessionController(deps);
  return <ChartSessionContext value={value}>{children}</ChartSessionContext>;
}
