import { cn } from "cn";
import wordmarkSvg from "../../assets/brand/wordmark.svg?raw";

/**
 * The artwork's inner markup, inlined so it stays vector at any pixel
 * density. A CSS mask or <img> is rasterised first, and the artwork's
 * erode filter is computed in pixels too, which some mobile browsers do at
 * 1x and so blur the thin italic strokes. At header sizes the erode only
 * removes a fraction of a pixel, so it is dropped here.
 */
const wordmarkMarkup = wordmarkSvg
  .replace(/^<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "")
  .replace(/<defs>[\s\S]*?<\/defs>/, "")
  .replace(/ filter="url\(#cusp-light\)"/, "");

/**
 * The Eastern Cusp wordmark in the brand red. The paths paint with
 * `currentColor` and the wrapper sets `--brand`, so one asset follows the
 * theme: the logo's own #874c48 in light, lifted to the same hue in dark.
 * Size it with a height class; the width follows the 390 × 110 artwork.
 */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 390 110"
      role="img"
      aria-label="Ascendant"
      className={cn("text-brand inline-block aspect-[390/110] w-auto", className)}
      dangerouslySetInnerHTML={{ __html: wordmarkMarkup }}
    />
  );
}
