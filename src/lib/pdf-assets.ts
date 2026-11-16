// The PDF's fonts and wordmark, as the browser loads them. Kept apart from
// the document so it only loads on the first Save as PDF, and so scripts can
// render the same document with files read from disk instead.
import interRegular from "../../assets/fonts/inter-latin-400-normal.ttf?url";
import interMedium from "../../assets/fonts/inter-latin-500-normal.ttf?url";
import interSemibold from "../../assets/fonts/inter-latin-600-normal.ttf?url";
import serifRegular from "../../assets/fonts/libre-baskerville-latin-400-normal.ttf?url";
import serifItalic from "../../assets/fonts/libre-baskerville-latin-400-italic.ttf?url";
import mono from "../../assets/fonts/jetbrains-mono-latin-400-normal.ttf?url";
import wordmarkUrl from "../../assets/brand/wordmark.jpg?url";
import type { PdfAssets } from "./chart-pdf";

/** A same-origin file as a data URI. */
async function dataUri(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * The assets for one render. Fonts go by URL, which the engine fetches; the
 * wordmark goes as a data URI, because the engine's image loader does not
 * fetch a relative URL and would leave the cover without its logo.
 */
export async function loadPdfAssets(): Promise<PdfAssets> {
  return {
    fonts: {
      interRegular,
      interMedium,
      interSemibold,
      serifRegular,
      serifItalic,
      mono,
    },
    wordmark: await dataUri(wordmarkUrl),
  };
}
