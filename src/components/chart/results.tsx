import { lazy, Suspense, useEffect } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/arc/button/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { gutterClassName } from "@/components/site-frame";
import { cn } from "cn";
import { useChartSession } from "@/components/chart/session";
import {
  ChartAskChatGPTButton,
  ChartSavePdfButton,
} from "@/components/chart/actions";

// The report (wheels, dasha timelines, tables) shows only once a chart is
// cast, so it loads on demand: the page opens on the form without it. The
// fetch starts with the calculation, so it lands while the server works.
const loadReport = () => import("@/components/chart/report");
const ChartReport = lazy(loadReport);

export function ChartCalculating() {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Calculating planetary positions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </CardContent>
    </Card>
  );
}

export function ChartFailure({
  onEditDetails,
}: {
  onEditDetails?: () => void;
}) {
  const {
    state: { failure },
    actions: { calculate },
  } = useChartSession();
  // The retry rethrows so the calculate button can fall back to idle; here
  // there is no button state to reset, so the rejection stops at the click.
  const retry = () => {
    void calculate().catch(() => {});
  };
  return (
    <Alert variant="destructive" className="gap-0.5">
      <WarningCircleIcon aria-hidden="true" />
      <AlertTitle>{failure?.title ?? "The chart didn't calculate"}</AlertTitle>
      <AlertDescription>
        <p>
          {failure?.message ??
            "Something went wrong while casting this chart. Try again, and if it keeps happening, check the birth date, time and place."}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={retry}>
            Try again
          </Button>
          {onEditDetails ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-foreground!"
              onClick={onEditDetails}
            >
              Edit details
            </Button>
          ) : null}
        </div>
      </AlertDescription>
    </Alert>
  );
}

/** Ask ChatGPT (or another assistant) and Save as PDF. */
export function ChartActions({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-row items-center gap-2 sm:gap-3", className)}>
      <ChartAskChatGPTButton />
      <ChartSavePdfButton />
    </div>
  );
}

export function ChartResultSwitch({
  onEditDetails,
}: {
  onEditDetails?: () => void;
} = {}) {
  const {
    state: { status, result },
  } = useChartSession();
  // Rendered only once there is something to show, so start the report's
  // fetch now rather than when the result arrives.
  useEffect(() => {
    void loadReport();
  }, []);
  const notice =
    status === "calculating" && result === null ? (
      <ChartCalculating />
    ) : status === "calculating" ? (
      <p className="text-muted-foreground text-sm">
        Recalculating with the updated details…
      </p>
    ) : status === "failure" ? (
      <ChartFailure onEditDetails={onEditDetails} />
    ) : null;
  return (
    <div role="status" className="flex flex-col">
      {notice ? (
        <div className={`section-ticks py-6 sm:py-10 ${gutterClassName}`}>
          {notice}
        </div>
      ) : null}
      {result !== null ? (
        <Suspense
          fallback={
            <div className={`section-ticks py-6 sm:py-10 ${gutterClassName}`}>
              <ChartCalculating />
            </div>
          }
        >
          <ChartReport />
        </Suspense>
      ) : null}
    </div>
  );
}
