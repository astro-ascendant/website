import { describe, expect, test } from "bun:test";
import { pdfFileName } from "./file-name";

describe("pdfFileName", () => {
  test("uses the person's name", () => {
    expect(pdfFileName("Harini")).toBe("Harini.pdf");
    expect(pdfFileName("  Laxman  K R ")).toBe("Laxman K R.pdf");
    expect(pdfFileName("Ṛṣi Śarmā")).toBe("Ṛṣi Śarmā.pdf");
  });

  test("drops characters a file system rejects", () => {
    expect(pdfFileName('A/B: "C"?')).toBe("A B C.pdf");
    expect(pdfFileName("Dr. J.")).toBe("Dr. J.pdf");
  });

  test("falls back when no name is left", () => {
    expect(pdfFileName("")).toBe("birth-chart.pdf");
    expect(pdfFileName(" /// ")).toBe("birth-chart.pdf");
  });
});
