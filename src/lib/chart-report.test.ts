import { describe, expect, test } from "bun:test";
import { castChart, TEST_BIRTHS } from "@/server/test-charts";
import { buildChartMarkdown, buildChartPromptUrl } from "./chart-report";

const result = await castChart(TEST_BIRTHS[0]);

function promptFor(now: string): string {
  const url = new URL(buildChartPromptUrl(result, "claude", now));
  return url.searchParams.get("q") ?? "";
}

describe("buildChartPromptUrl", () => {
  test("opens the chosen assistant", () => {
    const now = "2026-10-29T00:00:00.000Z";
    expect(buildChartPromptUrl(result, "chatgpt", now)).toStartWith(
      "https://chatgpt.com/?q=",
    );
    expect(buildChartPromptUrl(result, "gemini", now)).toStartWith(
      "https://aistudio.google.com/prompts/new_chat?prompt=",
    );
  });

  test("lists each KP body with the house the server placed it in", () => {
    const prompt = promptFor("2026-10-29T00:00:00.000Z");
    for (const row of result.kp.rows) {
      expect(prompt).toContain(
        `| ${row.name} | ${row.house} | ${row.signLord} |`,
      );
    }
  });

  test("reads the running antardasha at the given instant", () => {
    const period = result.dasha.vimshottari[2]!;
    const prompt = promptFor(period.start);
    expect(prompt).toContain(`| ${period.antardashas[0]!.antardasha} |`);
    expect(promptFor("1800-01-01T00:00:00.000Z")).toContain(
      "_No current antardasha._",
    );
  });
});

describe("buildChartMarkdown", () => {
  test("covers the birth, every system and the disclaimer", () => {
    const markdown = buildChartMarkdown(result);
    expect(markdown).toStartWith("# Horoscope\n");
    expect(markdown).toContain(
      "- UTC: 1990-07-15T04:30:00.000Z (UTC+05:30, Asia/Kolkata)",
    );
    for (const heading of [
      "## Vimshottari Dasha",
      "## Chara Dasha",
      "## D9 placements",
      "## Sarvashtakavarga",
      "### KP House Cusps",
    ]) {
      expect(markdown).toContain(heading);
    }
    expect(markdown).toEndWith(
      "not certainty or a substitute for medical, legal, or financial advice.",
    );
  });
});
