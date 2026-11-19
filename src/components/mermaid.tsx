import { lazy, Suspense } from "react";

// pele is most of a megabyte, and only a few docs pages draw diagrams. Lazy,
// it leaves the shared bundle. The server still renders the SVG into the
// HTML, and hydration keeps that markup until the chunk arrives, so the
// diagram shows at once and does not flash.
const MermaidDiagram = lazy(() => import("./mermaid-diagram"));

export function Mermaid({ chart }: { chart: string }) {
  return (
    <Suspense fallback={null}>
      <MermaidDiagram chart={chart} />
    </Suspense>
  );
}
