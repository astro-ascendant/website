// The PDF's fonts and wordmark, as the browser loads them. Kept apart from
// the document so it only loads on the first Save as PDF, and so scripts can
// render the same document with files read from disk instead.
import interRegular from "../../assets/fonts/inter-latin-400-normal.ttf?url";
import interMedium from "../../assets/fonts/inter-latin-500-normal.ttf?url";
import interSemibold from "../../assets/fonts/inter-latin-600-normal.ttf?url";
import serifRegular from "../../assets/fonts/libre-baskerville-latin-400-normal.ttf?url";
import serifItalic from "../../assets/fonts/libre-baskerville-latin-400-italic.ttf?url";
import mono from "../../assets/fonts/jetbrains-mono-latin-400-normal.ttf?url";
import wordmark from "../../assets/brand/wordmark.svg?raw";
import type { PdfAssets } from "./chart-pdf";

export const pdfAssets: PdfAssets = {
  fonts: {
    interRegular,
    interMedium,
    interSemibold,
    serifRegular,
    serifItalic,
    mono,
  },
  wordmark,
};
