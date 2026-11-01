import { render } from "pele";

/**
 * Renders Mermaid source to themed SVG with pele. `render` is synchronous and
 * pure, so the diagram is part of the server-rendered HTML and needs no effect.
 */
export function Mermaid({ chart }: { chart: string }) {
  const { svg } = render(chart.trim());
  return (
    <div
      role="img"
      aria-label="Diagram"
      className="pele not-prose my-6 overflow-x-auto"
      style={
        {
          "--pele-fg": "var(--color-fd-foreground)",
          "--pele-bg": "transparent",
          "--pele-line": "var(--color-fd-muted-foreground)",
          "--pele-border": "var(--color-fd-border)",
          "--pele-surface": "var(--color-fd-card)",
          "--pele-surface-alt": "var(--color-fd-muted)",
          "--pele-accent": "var(--color-fd-primary)",
          "--pele-muted": "var(--color-fd-muted-foreground)",
        } as React.CSSProperties
      }
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
