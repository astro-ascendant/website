import {
  ChartCalculateButton,
  ChartDateField,
  ChartFormFrame,
  ChartNameField,
  ChartPlaceField,
  ChartSexField,
  ChartTimeField,
} from "@/components/chart/form";
import { ChartResultSwitch } from "@/components/chart/results";
import { ChartProvider } from "@/components/chart/session";

/** The chart's parts as one namespace: `<Chart.Provider>`, `<Chart.NameField>`, … */
export const Chart = {
  Provider: ChartProvider,
  FormFrame: ChartFormFrame,
  DateField: ChartDateField,
  NameField: ChartNameField,
  TimeField: ChartTimeField,
  SexField: ChartSexField,
  PlaceField: ChartPlaceField,
  CalculateButton: ChartCalculateButton,
  ResultSwitch: ChartResultSwitch,
};
