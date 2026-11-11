import { cn } from "cn";
import wordmark from "../../assets/brand/wordmark.svg";

/**
 * The Eastern Cusp wordmark in the brand red. The artwork is used as a mask
 * and painted with `--brand`, so one asset follows the theme: the logo's own
 * #874c48 in light, lifted to the same hue in dark. Size it with a height
 * class; the width follows the 390 × 110 artwork.
 */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Ascendant"
      style={{
        maskImage: `url("${wordmark}")`,
        WebkitMaskImage: `url("${wordmark}")`,
      }}
      className={cn(
        "bg-brand inline-block aspect-[390/110] mask-contain mask-no-repeat",
        className,
      )}
    />
  );
}
