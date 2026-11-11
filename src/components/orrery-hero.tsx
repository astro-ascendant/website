import { useHydrated } from "@tanstack/react-router";
import { motion, useAnimationFrame, useReducedMotion } from "motion/react";
import { useState } from "react";
import { EASE_OUT } from "../lib/ease";
import { useHoverCapable } from "../lib/hooks/use-hover-capable";
import {
  geocentricSidereal,
  GRAHAS,
  heliocentricSidereal,
  isRetrograde,
  NAKSHATRA_SPAN,
  ORRERY_PLANETS,
  type Graha,
  type OrreryPlanet,
} from "../lib/heliocentric";
import { bodyShortName, SIGNS, signShortName } from "../lib/zodiac";

const DAY_MS = 86_400_000;
const DEG = Math.PI / 180;

// Orbits are evenly spaced rather than to scale so the inner planets stay visible.
const PLANETS: Record<OrreryPlanet, { color: string; orbit: number; size: number }> = {
  mercury: { color: "#55524d", orbit: 18, size: 2 },
  venus: { color: "#e2b04a", orbit: 27, size: 2.8 },
  earth: { color: "#3e6fa3", orbit: 37, size: 3 },
  mars: { color: "#c4643b", orbit: 47, size: 2.4 },
  jupiter: { color: "#d9873b", orbit: 59, size: 5.2 },
  saturn: { color: "#b5a48d", orbit: 72, size: 4.2 },
};

// The Moon orbits Earth, so its radius is measured from Earth, not the Sun.
const MOON = { color: "#c9c4b8", orbit: 6, size: 1.1 };
const SUN = { color: "#e0a63a", radius: 8.5 };

type Body = OrreryPlanet | "moon";

/** The graha whose sign a hovered body's sight line points to. Earth sees the Sun. */
const BODY_GRAHA: Record<Body, Graha> = {
  mercury: "Mercury",
  venus: "Venus",
  earth: "Sun",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  moon: "Moon",
};

// Bezel radii, from the rim inward.
const R_SIGN_OUT = 112;
const R_SIGN_INNER_RULE = R_SIGN_OUT - 1.6;
const R_SIGN_IN = 100;
const R_NAK_IN = 94;
const R_MARK = 87;

/**
 * Screen point for a sidereal longitude, with 0° Aries on the left and signs
 * running counter-clockwise, the way the chart page's wheel reads. Rounded to
 * hundredths: the server's and the browser's trig differ in the last digits,
 * which would otherwise fail hydration on the prerendered bezel.
 */
function polar(longitude: number, radius: number): [number, number] {
  const angle = (180 + longitude) * DEG;
  const round = (value: number) => Math.round(value * 100) / 100 || 0;
  return [round(radius * Math.cos(angle)), round(-radius * Math.sin(angle))];
}

function translate(longitude: number, radius: number) {
  const [x, y] = polar(longitude, radius);
  return `translate(${x} ${y})`;
}

/** Push labels inward when grahas sit within a few degrees of each other. */
function grahaMarks(time: number) {
  const marks = GRAHAS.map((graha) => ({
    graha,
    longitude: geocentricSidereal(graha, time),
    retrograde: isRetrograde(graha, time),
    tier: 0,
  })).sort((a, b) => a.longitude - b.longitude);
  for (let i = 1; i < marks.length; i++) {
    const prev = marks[i - 1]!;
    if (marks[i]!.longitude - prev.longitude < 7) marks[i]!.tier = prev.tier + 1;
  }
  return marks;
}

function sunOutline(radius: number, teeth = 28, depth = 0.14) {
  return Array.from({ length: teeth * 2 }, (_, i) => {
    const angle = (i / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? radius : radius * (1 - depth);
    return `${(r * Math.cos(angle)).toFixed(2)},${(r * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
}

function formatDate(timeMs: number) {
  return new Date(timeMs).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Sky time, drifting forward a day per real second unless motion is reduced. */
function useSkyTime() {
  const reduceMotion = useReducedMotion() ?? false;
  const [time, setTime] = useState(() => Date.now());
  useAnimationFrame((_, delta) => {
    if (reduceMotion) return;
    // Clamp so returning to a background tab doesn't jump months ahead.
    setTime((t) => t + (Math.min(delta, 100) / 1000) * DAY_MS);
  });
  return time;
}

function PlanetBody({ planet }: { planet: OrreryPlanet }) {
  const { color, size } = PLANETS[planet];
  return (
    <>
      {planet === "saturn" && (
        <ellipse
          rx={size * 1.9}
          ry={size * 0.6}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.45}
          transform="rotate(-22)"
        />
      )}
      <circle r={size} fill={color} stroke="currentColor" strokeWidth={0.5} />
      {planet === "jupiter" && (
        <path
          d={`M ${-size * 0.9} ${-size * 0.23} H ${size * 0.9} M ${-size * 0.95} ${size * 0.2} H ${size * 0.95}`}
          stroke="#b0552c"
          strokeWidth={0.7}
        />
      )}
      {planet === "earth" && (
        <path
          d="M -1.2 -1.35 q 1.05 -0.45 1.65 0.45 q -0.6 0.9 -1.65 0.3 z M 0.3 0.9 q 0.9 0 1.05 0.75 q -0.75 0.45 -1.2 -0.15 z"
          fill="#5f8a4a"
        />
      )}
    </>
  );
}

/**
 * Landing-page hero: an astrolabe. The planets circle the Sun at their real
 * heliocentric positions, drifting forward a day per second, inside a sidereal
 * bezel of signs, degrees and the 27 nakshatras. Each graha's geocentric
 * position is marked on the bezel, so the sun-centred view still reads as a
 * horoscope. Hovering a body draws its sight line from Earth to its sign.
 */
export function OrreryHero() {
  // The page is prerendered, so anything that depends on the clock waits for
  // the client; the bezel and orbits are static and render on the server.
  const hydrated = useHydrated();
  const time = useSkyTime();
  const canHover = useHoverCapable();
  const [hovered, setHovered] = useState<Body | null>(null);

  return (
    <figure className="mx-auto w-full max-w-sm select-none sm:max-w-md lg:max-w-xl">
      <svg
        viewBox="-118 -118 236 236"
        className="text-foreground h-auto w-full overflow-visible"
        aria-hidden="true"
        onPointerLeave={() => setHovered(null)}
      >
        {/* Bezel: sign band */}
        <circle r={R_SIGN_OUT} fill="none" stroke="currentColor" strokeWidth={0.6} />
        <circle
          r={R_SIGN_INNER_RULE}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.35}
          strokeWidth={0.25}
        />
        <circle r={R_SIGN_IN} fill="none" stroke="currentColor" strokeWidth={0.45} />
        {SIGNS.map((sign, i) => {
          const [x1, y1] = polar(i * 30, R_SIGN_IN);
          const [x2, y2] = polar(i * 30, R_SIGN_OUT);
          const [lx, ly] = polar(i * 30 + 15, (R_SIGN_IN + R_SIGN_INNER_RULE) / 2);
          return (
            <g key={sign}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={0.45} />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={4.4}
                letterSpacing={0.9}
                className="font-sans font-medium"
                fill="currentColor"
                fillOpacity={0.62}
              >
                {signShortName(sign).toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Degree scale, read inward from the sign band */}
        {Array.from({ length: 360 }, (_, d) => {
          const length = d % 10 === 0 ? 3.4 : d % 5 === 0 ? 2.2 : 1.1;
          const [x1, y1] = polar(d, R_SIGN_IN);
          const [x2, y2] = polar(d, R_SIGN_IN - length);
          return (
            <line
              key={d}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeOpacity={d % 5 === 0 ? 0.55 : 0.28}
              strokeWidth={0.22}
            />
          );
        })}

        {/* Nakshatra ring: the 27 lunar mansions */}
        <circle
          r={R_NAK_IN}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.25}
          strokeWidth={0.25}
        />
        {Array.from({ length: 27 }, (_, i) => {
          const [x, y] = polar(i * NAKSHATRA_SPAN, R_NAK_IN);
          return <circle key={i} cx={x} cy={y} r={0.55} fill="currentColor" fillOpacity={0.5} />;
        })}

        {/* Orbits */}
        {ORRERY_PLANETS.map((planet) => (
          <circle
            key={planet}
            r={PLANETS[planet].orbit}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.14}
            strokeWidth={0.3}
            strokeDasharray={planet === "earth" ? undefined : "0.6 1.2"}
          />
        ))}

        <polygon
          points={sunOutline(SUN.radius)}
          fill={SUN.color}
          stroke="currentColor"
          strokeWidth={0.5}
        />
        <circle r={SUN.radius * 0.77} fill="none" stroke="#f5e6c4" strokeWidth={0.4} />

        {hydrated && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
          >
            {/* Geocentric graha marks on the bezel */}
            {grahaMarks(time).map(({ graha, longitude, retrograde, tier }) => {
              const [tx1, ty1] = polar(longitude, R_NAK_IN);
              const [tx2, ty2] = polar(longitude, R_NAK_IN - 2.6);
              const [lx, ly] = polar(longitude, R_MARK - tier * 5.2);
              return (
                <g key={graha} fill="currentColor">
                  <line
                    x1={tx1}
                    y1={ty1}
                    x2={tx2}
                    y2={ty2}
                    stroke="currentColor"
                    strokeWidth={0.6}
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={3.6}
                    className="font-sans"
                    fillOpacity={0.8}
                  >
                    {bodyShortName(graha)}
                    {retrograde && graha !== "Rahu" && graha !== "Ketu" ? (
                      <tspan fontSize={2.4} dy={-1.2}>
                        R
                      </tspan>
                    ) : null}
                  </text>
                </g>
              );
            })}

            {/* Sight line from Earth to the hovered body's sign */}
            {canHover && hovered &&
              (() => {
                const [ex, ey] = polar(heliocentricSidereal("earth", time), PLANETS.earth.orbit);
                const [sx, sy] = polar(
                  geocentricSidereal(BODY_GRAHA[hovered], time),
                  R_NAK_IN - 3,
                );
                return (
                  <g>
                    <line
                      x1={ex}
                      y1={ey}
                      x2={sx}
                      y2={sy}
                      stroke="var(--brand)"
                      strokeWidth={0.4}
                      strokeDasharray="1.4 1"
                    />
                    <circle cx={sx} cy={sy} r={1} fill="var(--brand)" />
                  </g>
                );
              })()}

            {ORRERY_PLANETS.map((planet) => (
              <g
                key={planet}
                transform={translate(heliocentricSidereal(planet, time), PLANETS[planet].orbit)}
                onPointerEnter={(event) => {
                  if (canHover && event.pointerType !== "touch") setHovered(planet);
                }}
              >
                <circle r={PLANETS[planet].size + 4} fill="transparent" />
                <PlanetBody planet={planet} />
                {planet === "earth" && (
                  <>
                    <circle
                      r={MOON.orbit}
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity={0.18}
                      strokeWidth={0.25}
                    />
                    <g
                      transform={translate(geocentricSidereal("Moon", time), MOON.orbit)}
                      onPointerEnter={(event) => {
                        event.stopPropagation();
                        if (canHover && event.pointerType !== "touch") setHovered("moon");
                      }}
                    >
                      <circle r={2.6} fill="transparent" />
                      <circle
                        r={MOON.size}
                        fill={MOON.color}
                        stroke="currentColor"
                        strokeWidth={0.4}
                      />
                    </g>
                  </>
                )}
              </g>
            ))}
          </motion.g>
        )}
      </svg>

      <figcaption className="text-muted-foreground mt-4 h-4 text-center text-[0.6875rem] font-medium tracking-[0.16em] uppercase tabular-nums">
        {hydrated ? formatDate(time) : null}
      </figcaption>
    </figure>
  );
}
