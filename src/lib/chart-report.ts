import type { ChartDashaPeriod, ChartPlacement, ChartResult } from "./chart";
import {
  findCurrentPeriodIndex,
  formatDashaDate,
  formatDashaDuration,
} from "./dasha-time";
import { formatLongitude, signShortName } from "./zodiac";

/**
 * The chart as text: the full markdown report (also the PDF body) and the
 * compact prompt handed to an AI assistant. Both read only `ChartResult`;
 * the prompt takes `now` to pick the running antardasha.
 */
export function formatSignifyingHouses(houses: readonly number[]): string {
  return houses.length === 0 ? "—" : houses.join(", ");
}

function toPlacementRows(
  result: ChartResult,
  division: number,
): ChartPlacement[] {
  const match = result.divisions.find((entry) => entry.division === division);
  if (!match) {
    return [];
  }
  return [
    {
      body: "Lagna",
      sign: result.lagna.sign,
      longitude: result.lagna.longitude,
      house: result.lagna.house,
      star: "",
      pada: null,
      state: "",
    },
    ...match.placements,
  ];
}

export function buildChartMarkdown(result: ChartResult): string {
  const offset =
    result.birth.utcOffset === null
      ? ""
      : ` (UTC${result.birth.utcOffset}${
          result.birth.timeZone === null ? "" : `, ${result.birth.timeZone}`
        })`;
  const lines: string[] = [
    "# Horoscope",
    "",
    ...(result.birth.name.trim() !== ""
      ? [`- Name: ${result.birth.name}`]
      : []),
    ...(result.birth.date === ""
      ? []
      : [`- Birth: ${result.birth.date} ${result.birth.time}`]),
    `- Place: ${result.birth.place}`,
    `- UTC: ${result.birth.utcIso}${offset}`,
    `- Coordinates: ${result.birth.latitude}, ${result.birth.longitude}`,
    `- Ayanamsa: ${result.astroParams.ayanamsa}`,
    `- House system: ${result.astroParams.houseSystem}`,
    `- Lagna: ${result.lagna.sign} ${formatLongitude(result.lagna.longitude)}`,
    "",
    "## Placements",
    "",
    "| Body | Sign | Degree | House | Star | State |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const row of toPlacementRows(result, 1)) {
    lines.push(
      `| ${row.body} | ${row.sign} | ${formatLongitude(row.longitude)} | ${row.house} | ${row.star}${row.pada === null ? "" : ` ${row.pada}`} | ${row.state} |`,
    );
  }
  lines.push("", "## Vimshottari Dasha", "");
  for (const period of result.dasha.vimshottari) {
    lines.push(`- ${period.mahadasha}: ${period.start} to ${period.end}`);
    for (const antar of period.antardashas) {
      lines.push(`  - ${antar.antardasha}: ${antar.start} to ${antar.end}`);
    }
  }
  lines.push("", "## Chara Dasha", "");
  for (const period of result.dasha.chara) {
    lines.push(`- ${period.mahadasha}: ${period.start} to ${period.end}`);
    for (const antar of period.antardashas) {
      lines.push(`  - ${antar.antardasha}: ${antar.start} to ${antar.end}`);
    }
  }
  lines.push("", "## Sthira Dasha", "");
  for (const period of result.dasha.sthira) {
    lines.push(`- ${period.mahadasha}: ${period.start} to ${period.end}`);
    for (const antar of period.antardashas) {
      lines.push(`  - ${antar.antardasha}: ${antar.start} to ${antar.end}`);
    }
  }
  for (const division of result.divisions) {
    if (division.division === 1) {
      continue;
    }
    lines.push("", `## D${division.division} placements`, "");
    lines.push("| Body | Sign | Degree | House | State |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const row of toPlacementRows(result, division.division)) {
      if (row.body === "Lagna") {
        continue;
      }
      lines.push(
        `| ${row.body} | ${row.sign} | ${formatLongitude(row.longitude)} | ${row.house} | ${row.state} |`,
      );
    }
    lines.push("", `## D${division.division} houses`, "");
    for (const house of division.houses) {
      lines.push(
        `- House ${house.number}: ${house.sign}, cusp ${house.cusp === null ? "unknown" : formatLongitude(house.cusp)}, lord ${house.lord || "unknown"}, occupants ${house.occupants.join(", ") || "none"}`,
      );
    }
  }
  lines.push("", "## Jaimini", "");
  for (const karaka of result.jaimini.karakas) {
    lines.push(`- ${karaka.role}: ${karaka.planet}`);
  }
  lines.push(`- Karakamsha: ${result.jaimini.karakamsha}`);
  lines.push(`- Upapada: ${result.jaimini.upapada}`);
  for (const entry of result.jaimini.arudha) {
    lines.push(`- Arudha Pada ${entry.house}: ${entry.pada}`);
  }
  lines.push(`- Rashi Drishti on Lagna: ${result.jaimini.drishti.join(", ")}`);
  lines.push(
    `- Supporting Argala: ${result.jaimini.argala.supporting.join(", ")}`,
  );
  lines.push(
    `- Obstructing Argala: ${result.jaimini.argala.obstructing.join(", ")}`,
  );
  lines.push("", "## Sarvashtakavarga", "");
  if (result.sav.rows.length > 0) {
    const signHeads = result.sav.signs
      .map((sign) => signShortName(sign))
      .join(" | ");
    lines.push(`| Planet | ${signHeads} | Total |`);
    lines.push(
      `| --- | ${result.sav.signs.map(() => "---").join(" | ")} | --- |`,
    );
    for (const row of result.sav.rows) {
      lines.push(
        `| ${row.planet} | ${row.points.join(" | ")} | ${row.total} |`,
      );
    }
    lines.push(
      `| Total | ${result.sav.signTotals.join(" | ")} | ${result.sav.total} |`,
    );
  }
  lines.push("", "## KP Chart", "");
  lines.push(`- Ayanamsa: ${result.kp.astroParams.ayanamsa}`);
  lines.push(`- House system: ${result.kp.astroParams.houseSystem}`);
  lines.push("");
  lines.push("| Body | Sign Lord | Star Lord | Sub Lord | Signifying Houses |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const row of result.kp.rows) {
    lines.push(
      `| ${row.name} | ${row.signLord} | ${row.starLord} | ${row.subLord} | ${formatSignifyingHouses(row.signifyingHouses)} |`,
    );
  }
  lines.push("", "### KP House Cusps", "");
  lines.push(
    "| House | Sign | Cusp | Sign Lord | Star Lord | Sub Lord | Sub-Sub Lord |",
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const cusp of result.kp.cusps ?? []) {
    lines.push(
      `| ${cusp.house} | ${cusp.sign} | ${formatLongitude(cusp.longitude)} | ${cusp.signLord} | ${cusp.starLord} | ${cusp.subLord} | ${cusp.subSubLord} |`,
    );
  }
  lines.push(
    "",
    "This chart is interpretive guidance, not certainty or a substitute for medical, legal, or financial advice.",
  );
  return lines.join("\n");
}

function markdownTable(
  headers: string[],
  rows: readonly (readonly string[])[],
): string {
  const escape = (value: string) => value.replaceAll("|", "\\|");
  const line = (cells: readonly string[]) =>
    `| ${cells.map(escape).join(" | ")} |`;
  return [
    line(headers),
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => line(row)),
  ].join("\n");
}

function divisionChartMarkdown(result: ChartResult, division: number): string {
  const match = result.divisions.find((entry) => entry.division === division);
  if (!match) {
    return "_Not available._";
  }
  const lagnaHouse = match.houses.find((house) => house.number === 1);
  const lagna =
    division === 1
      ? {
          sign: result.lagna.sign,
          degree: formatLongitude(result.lagna.longitude),
        }
      : {
          sign: lagnaHouse?.sign ?? "",
          degree: formatLongitude(lagnaHouse?.cusp),
        };
  return markdownTable(
    ["Body", "Sign", "Degree", "House"],
    [
      ["Lagna", lagna.sign, lagna.degree, "1"],
      ...match.placements.map((placement) => [
        placement.state === "Retrograde"
          ? `${placement.body} (r)`
          : placement.body,
        placement.sign,
        formatLongitude(placement.longitude),
        String(placement.house),
      ]),
    ],
  );
}

function mahadashaMarkdownTable(periods: readonly ChartDashaPeriod[]): string {
  return markdownTable(
    ["Mahadasha", "Start", "End", "Duration"],
    periods.map((period) => [
      period.mahadasha,
      formatDashaDate(period.start),
      formatDashaDate(period.end),
      formatDashaDuration(period.start, period.end),
    ]),
  );
}

function antardashaMarkdownTable(period: ChartDashaPeriod): string {
  if (period.antardashas.length === 0) {
    return "_No antardasha periods._";
  }
  return markdownTable(
    ["Antardasha", "Start", "End", "Duration"],
    period.antardashas.map((antar) => [
      antar.antardasha,
      formatDashaDate(antar.start),
      formatDashaDate(antar.end),
      formatDashaDuration(antar.start, antar.end),
    ]),
  );
}

function buildChartPrompt(result: ChartResult, now: string): string {
  const currentIndex = findCurrentPeriodIndex(result.dasha.vimshottari, now);
  const currentMahadasha =
    currentIndex === -1 ? undefined : result.dasha.vimshottari[currentIndex];
  return [
    "Read the skill here: https://raw.githubusercontent.com/astro-ascendant/skills/refs/heads/main/skills/ascendant/SKILL.md",
    "https://github.com/astro-ascendant/skills/tree/main/skills/ascendant/references",
    "",
    ...(result.birth.name.trim() !== ""
      ? [`Name: ${result.birth.name}`, ""]
      : []),
    "#D1",
    divisionChartMarkdown(result, 1),
    "",
    "#D9",
    divisionChartMarkdown(result, 9),
    "",
    "#KP",
    markdownTable(
      [
        "Body",
        "House",
        "Sign Lord",
        "Star Lord",
        "Sub Lord",
        "Signifying Houses",
      ],
      result.kp.rows.map((row) => [
        row.name,
        row.house === null ? "—" : String(row.house),
        row.signLord,
        row.starLord,
        row.subLord,
        formatSignifyingHouses(row.signifyingHouses),
      ]),
    ),
    "",
    "#KP Cusps",
    markdownTable(
      [
        "House",
        "Sign",
        "Cusp",
        "Sign Lord",
        "Star Lord",
        "Sub Lord",
        "Sub-Sub Lord",
      ],
      (result.kp.cusps ?? []).map((cusp) => [
        String(cusp.house),
        cusp.sign,
        formatLongitude(cusp.longitude),
        cusp.signLord,
        cusp.starLord,
        cusp.subLord,
        cusp.subSubLord,
      ]),
    ),
    "",
    "#Vimshottari",
    mahadashaMarkdownTable(result.dasha.vimshottari),
    "",
    "#Antardasha",
    currentMahadasha
      ? antardashaMarkdownTable(currentMahadasha)
      : "_No current antardasha._",
  ].join("\n");
}

export type ChartPromptProvider = "chatgpt" | "claude" | "gemini";

export function buildChartPromptUrl(
  result: ChartResult,
  provider: ChartPromptProvider,
  now: string,
): string {
  const prompt = encodeURIComponent(buildChartPrompt(result, now));
  switch (provider) {
    case "claude":
      return `https://claude.ai/new?q=${prompt}`;
    case "gemini":
      // The Gemini app has no prompt parameter; AI Studio does.
      return `https://aistudio.google.com/prompts/new_chat?prompt=${prompt}`;
    default:
      return `https://chatgpt.com/?q=${prompt}`;
  }
}
