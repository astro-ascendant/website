import { cn } from "cn";
import wordmark from "../../assets/brand/wordmark.svg";
import wordmarkWhite from "../../assets/brand/wordmark-white.svg";

/**
 * The Eastern Cusp wordmark: the thematic colour on light surfaces, white on
 * dark. Size it with a height class; the width follows the 390 × 110 artwork.
 */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <>
      <img
        src={wordmark}
        alt="Ascendant"
        width={390}
        height={110}
        className={cn("w-auto dark:hidden", className)}
      />
      <img
        src={wordmarkWhite}
        alt="Ascendant"
        width={390}
        height={110}
        className={cn("hidden w-auto dark:block", className)}
      />
    </>
  );
}
