import { ClientOnly } from "@tanstack/react-router";
import { useAnimationFrame, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { heliocentricLongitude, type OrreryPlanet } from "../lib/heliocentric";

const DAY_MS = 86_400_000;
/** Simulated days per real second, at rest and while the pointer is over the orrery. */
const IDLE_SPEED = 1;
const HOVER_SPEED = 24;

const SUN = "#e0a63a";

// Orbits are evenly spaced rather than to scale so the inner planets stay visible.
const ORBITS: {
  planet: OrreryPlanet;
  name: string;
  color: string;
  radius: number;
  size: number;
}[] = [
  {
    planet: "mercury",
    name: "Mercury",
    color: "#55524d",
    radius: 24,
    size: 2.6,
  },
  { planet: "venus", name: "Venus", color: "#e2b04a", radius: 36, size: 3.8 },
  { planet: "earth", name: "Earth", color: "#3e6fa3", radius: 49, size: 4 },
  { planet: "mars", name: "Mars", color: "#c4643b", radius: 61, size: 3.2 },
  { planet: "jupiter", name: "Jupiter", color: "#d9873b", radius: 76, size: 7 },
  { planet: "saturn", name: "Saturn", color: "#b5a48d", radius: 92, size: 5.6 },
];

/** Ecliptic longitude to SVG coordinates, counter-clockwise as seen from the north. */
function orbitPoint(longitude: number, radius: number) {
  const angle = longitude * (Math.PI / 180);
  return { x: radius * Math.cos(angle), y: -radius * Math.sin(angle) };
}

function sunOutline(radius: number, teeth = 28, depth = 0.14) {
  return Array.from({ length: teeth * 2 }, (_, i) => {
    const angle = (i / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? radius : radius * (1 - depth);
    return `${(r * Math.cos(angle)).toFixed(2)},${(r * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
}

/**
 * Landing-page hero: the planets around the sun at their real positions,
 * drifting forward a day per second. Hovering speeds time up.
 */
export function OrreryHero() {
  // Positions depend on the visitor's clock, so planets render only after hydration.
  return (
    <ClientOnly fallback={<OrreryFigure />}>
      <LiveOrrery />
    </ClientOnly>
  );
}

function LiveOrrery() {
  const reduceMotion = useReducedMotion() ?? false;
  const [time, setTime] = useState(() => Date.now());
  const [hovered, setHovered] = useState<OrreryPlanet | null>(null);
  const speed = useRef(IDLE_SPEED);
  const targetSpeed = useRef(IDLE_SPEED);

  useAnimationFrame((_, delta) => {
    if (reduceMotion) return;
    speed.current += (targetSpeed.current - speed.current) * 0.04;
    // Clamp so returning to a background tab doesn't jump months ahead.
    const seconds = Math.min(delta, 100) / 1000;
    setTime((t) => t + seconds * speed.current * DAY_MS);
  });

  return (
    <OrreryFigure
      time={time}
      hovered={hovered}
      onHover={setHovered}
      onPointerEnter={() => (targetSpeed.current = HOVER_SPEED)}
      onPointerLeave={() => {
        targetSpeed.current = IDLE_SPEED;
        setHovered(null);
      }}
    />
  );
}

function OrreryFigure({
  time,
  hovered = null,
  onHover,
  onPointerEnter,
  onPointerLeave,
}: {
  time?: number;
  hovered?: OrreryPlanet | null;
  onHover?: (planet: OrreryPlanet) => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}) {
  return (
    <figure className="mx-auto w-full max-w-xs select-none sm:max-w-sm lg:max-w-md">
      <svg
        viewBox="-100 -100 200 200"
        className="h-auto w-full"
        aria-hidden="true"
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        {ORBITS.map(({ planet, radius }) => (
          <circle
            key={planet}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.14}
            strokeWidth={0.35}
          />
        ))}
        <polygon
          points={sunOutline(12)}
          fill={SUN}
          stroke="currentColor"
          strokeWidth={0.6}
        />
        <circle r={9.2} fill="none" stroke="#f5e6c4" strokeWidth={0.5} />
        {time !== undefined &&
          ORBITS.map(({ planet, name, color, radius, size }) => {
            const { x, y } = orbitPoint(
              heliocentricLongitude(planet, time),
              radius,
            );
            return (
              <g
                key={planet}
                transform={`translate(${x} ${y})`}
                onPointerEnter={() => onHover?.(planet)}
              >
                <circle r={size + 4} fill="transparent" />
                {planet === "saturn" && (
                  <ellipse
                    rx={size * 1.9}
                    ry={size * 0.6}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={0.5}
                    transform="rotate(-22)"
                  />
                )}
                <circle
                  r={size}
                  fill={color}
                  stroke="currentColor"
                  strokeWidth={0.6}
                />
                {planet === "jupiter" && (
                  <path
                    d={`M ${-size * 0.9} -1.6 H ${size * 0.9} M ${-size * 0.95} 1.4 H ${size * 0.95}`}
                    stroke="#b0552c"
                    strokeWidth={0.9}
                  />
                )}
                {planet === "earth" && (
                  <path
                    d="M -1.6 -1.8 q 1.4 -0.6 2.2 0.6 q -0.8 1.2 -2.2 0.4 z M 0.4 1.2 q 1.2 0 1.4 1 q -1 0.6 -1.6 -0.2 z"
                    fill="#5f8a4a"
                  />
                )}
                {hovered === planet && (
                  <text
                    y={-size - 3}
                    textAnchor="middle"
                    fontSize={5}
                    fill="currentColor"
                    className="font-serif italic"
                  >
                    {name}
                  </text>
                )}
              </g>
            );
          })}
      </svg>
      <figcaption className="mt-2 text-center text-xs text-muted-foreground tabular-nums">
        {time === undefined
          ? " "
          : new Date(time).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
      </figcaption>
    </figure>
  );
}
