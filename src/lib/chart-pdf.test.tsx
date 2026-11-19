import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { renderDocument } from "@formepdf/core";
import { castChart, TEST_BIRTHS } from "@/server/test-charts";
import { ChartDocument, type PdfAssets } from "./chart-pdf";

// The same fonts and wordmark the browser loads by URL, read from disk.
const file = (path: string) => new Uint8Array(readFileSync(path));
const assets: PdfAssets = {
  fonts: {
    sansRegular: file("assets/fonts/allo-400-normal.otf"),
    sansMedium: file("assets/fonts/allo-500-normal.otf"),
    sansSemibold: file("assets/fonts/allo-600-normal.otf"),
    serifRegular: file("assets/fonts/libre-baskerville-latin-400-normal.ttf"),
    serifItalic: file("assets/fonts/libre-baskerville-latin-400-italic.ttf"),
    mono: file("assets/fonts/jetbrains-mono-latin-400-normal.ttf"),
  },
  wordmark: `data:image/jpeg;base64,${readFileSync("assets/brand/wordmark.jpg").toString("base64")}`,
};

describe("ChartDocument", () => {
  test("renders every test chart to a PDF with the brand fonts embedded", async () => {
    for (const birth of TEST_BIRTHS) {
      const result = await castChart(birth);
      const bytes = await renderDocument(
        <ChartDocument result={result} assets={assets} />,
      );
      const pdf = new TextDecoder("latin1").decode(bytes);
      expect(pdf.startsWith("%PDF-")).toBe(true);
      // Subset font names carry the family, so each brand face is in the file.
      for (const family of ["Allo", "LibreBaskerville", "JetBrainsMono"]) {
        expect(pdf).toContain(family);
      }
    }
  }, 60_000);
});
