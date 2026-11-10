import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import SpecularButton from "@/components/SpecularButton";

/** Tracks the `dark` class the theme provider sets on <html>. */
function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains("dark"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

/**
 * The rim light is drawn on a canvas, which cannot read CSS variables, so
 * each theme gets literal colours. Text and tint go through CSS and can use
 * the site tokens.
 */
const THEMES = {
  dark: { lineColor: "#ffffff", baseColor: "#525252", tint: "#ffffff" },
  light: { lineColor: "#171717", baseColor: "#a3a3a3", tint: "#000000" },
} as const;

/** A router link drawn as the specular call-to-action button. */
export function SpecularLink({
  to,
  children,
  className,
}: {
  to: "/chart";
  children: ReactNode;
  className?: string;
}) {
  const theme = THEMES[useIsDark() ? "dark" : "light"];
  return (
    <SpecularButton
      as={Link}
      to={to}
      size="sm"
      radius={10}
      textColor="var(--foreground)"
      tintOpacity={0.04}
      lineColor={theme.lineColor}
      baseColor={theme.baseColor}
      tint={theme.tint}
      // Match the outlined secondary button's box: 20px line height and a
      // 1px (transparent) border, overriding the component's defaults.
      className={cn("border! border-transparent leading-5!", className)}
    >
      {children}
    </SpecularButton>
  );
}
