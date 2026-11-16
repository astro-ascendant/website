/** Characters Windows, macOS or Linux reject in a file name, plus control characters. */
// eslint-disable-next-line no-control-regex
const UNSAFE = /[\\/:*?"<>|\u0000-\u001f\u007f]/g;

/**
 * A PDF file name from a person's name: "Harini" becomes "Harini.pdf".
 * Characters no file system accepts are dropped, runs of spaces collapse,
 * and a name with nothing usable left falls back to "birth-chart.pdf".
 */
export function pdfFileName(name: string): string {
  const base = name
    .replace(UNSAFE, " ")
    .replace(/\s+/g, " ")
    .trim()
    // Windows will not save a name that ends in a dot or a space.
    .replace(/[. ]+$/, "")
    .slice(0, 120);
  return `${base === "" ? "birth-chart" : base}.pdf`;
}
