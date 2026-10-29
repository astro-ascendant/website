# Chart generation flow

The main chart and KP chart are calculated in sequence. Derived calculations use their results afterward.

```mermaid
flowchart TD
    A["Chart form submits input"] --> B["getChart decodes the request"]

    B --> C{"Birth moment provided as"}
    C -->|"Local date + time"| D["Validate wall clock"]
    D --> E["Find time zone from coordinates"]
    E --> F["Resolve UTC offset at birth"]
    F --> G["Build birth moment"]
    C -->|"Explicit UTC ISO with offset"| H["Decode birth moment"]
    C -->|"Missing or invalid"| ERR["Return { ok: false, code }"]

    G --> I["Generate primary chart"]
    H --> I

    subgraph CALC["Server chart calculation"]
      I["Chart.generate with all divisions<br/>Runtime: Lahiri + Whole Sign<br/>D1 cusp houses, divisions whole-sign from their Lagna"]
      I --> J["Generate KP chart<br/>D1 only, KP ayanamsa + Placidus<br/>KP lords, longitudes and houses"]
      J --> K["Calculate derived details"]
      K --> K1["Vimshottari and KP Vimshottari"]
      K --> K2["Chara and Sthira dashas"]
      K --> K3["SAV, karakas, karakamsha, upapada"]
      K --> K4["Rashi drishti, argala, arudha padas"]
      K1 --> L["Map calculations into chart result"]
      K2 --> L
      K3 --> L
      K4 --> L
    end

    L --> M["Return { ok: true, result } to the client"]

    I -. "chart.primary timing span" .-> J
    J -. "chart.kp timing span" .-> K
    K -. "chart.derived timing span" .-> L
```

The `chart.total` span covers the server-side calculation request. Optional derived calculations that fail are represented as absent in the result rather than failing the whole chart.

Every failure reaches the client as a `ChartErrorCode` (see `src/lib/chart-errors.ts`), never as prose: birth-moment problems keep their own code, and engine failures become `calculationFailed` after being logged on the server. The client chooses the copy for each code.
