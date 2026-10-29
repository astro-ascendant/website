import { CostarChart } from "@astrologer/react-chart";
import "@astrologer/react-chart/dist/index.css";
import { useMemo } from "react";
import { useChartSession } from "@/components/chart/session";
import {
  buildChartWheel,
  WHEEL_SIZE,
  type ChartWheel,
} from "@/lib/chart-wheel";

/**
 * Marks the library's Co-Star layout omits, drawn over it: the sign band as
 * two plain circles (the library's almost-closed path leaves a seam at 0°),
 * cusp lines that meet the band, house numbers, planet labels and the
 * Ascendant line.
 */
function WheelMarks({ wheel }: { wheel: ChartWheel }) {
  const { center, ascendant } = wheel;
  return (
    <svg
      viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {wheel.signRings.map((radius) => (
        <circle
          key={radius}
          cx={center}
          cy={center}
          r={radius}
          className="kp-chart-sign-ring"
        />
      ))}
      {wheel.cusps.map((cusp) => (
        <line
          key={cusp.house}
          x1={cusp.x1}
          y1={cusp.y1}
          x2={cusp.x2}
          y2={cusp.y2}
          className={
            cusp.angular ? "kp-chart-cusp-line angle" : "kp-chart-cusp-line"
          }
        />
      ))}
      {wheel.houseNumbers.map((entry) => (
        <text
          key={entry.house}
          x={entry.x}
          y={entry.y}
          className="kp-chart-house-number"
        >
          {entry.house}
        </text>
      ))}
      {wheel.planets.map((planet) => (
        <g key={planet.body}>
          <line
            x1={planet.tick.x1}
            y1={planet.tick.y1}
            x2={planet.tick.x2}
            y2={planet.tick.y2}
            className="kp-chart-planet-tick"
          />
          <text x={planet.x} y={planet.y} className="kp-chart-planet-label">
            {planet.label}
            {planet.retrograde ? (
              <tspan className="kp-chart-planet-retrograde" dy="-4">
                R
              </tspan>
            ) : null}
          </text>
        </g>
      ))}
      <line
        x1={ascendant.x1}
        y1={ascendant.y1}
        x2={ascendant.x2}
        y2={ascendant.y2}
        className="kp-chart-asc-line"
      />
      <text
        x={ascendant.labelX}
        y={ascendant.labelY}
        className="kp-chart-asc-label"
      >
        ASC
      </text>
    </svg>
  );
}

/**
 * Co-Star style wheel: curved sign names on the outer band, two-letter planet
 * labels on the cusp ring, and the Ascendant marked on the left.
 */
export function ChartKpCircularChart() {
  const {
    state: { result },
  } = useChartSession();
  const wheel = useMemo(
    () => (result ? buildChartWheel(result) : null),
    [result],
  );
  if (!wheel) {
    return null;
  }
  return (
    <div
      role="img"
      aria-label={wheel.label}
      className="kp-costar-chart relative mx-auto w-full max-w-xl"
    >
      <CostarChart
        data={wheel.data}
        width={WHEEL_SIZE}
        height={WHEEL_SIZE}
        className="h-auto w-full"
      />
      <WheelMarks wheel={wheel} />
    </div>
  );
}
