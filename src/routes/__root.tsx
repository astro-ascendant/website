import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import appCss from "@/styles/app.css?url";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import favicon from "../../assets/brand/favicon.svg";
import alloLatin from "../../assets/fonts/allo/allo-latin.woff2?url";
import { siteUrl } from "@/lib/shared";

export const Route = createRootRoute({
  head: ({ matches }) => {
    // Canonical is the prerendered, extensionless URL form of the leaf route.
    const pathname = matches[matches.length - 1]?.pathname ?? "/";
    const bare = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
    const canonical = bare === "" ? siteUrl : `${siteUrl}/${bare}`;

    return {
      meta: [
        {
          charSet: "utf-8",
        },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        {
          title: "Ascendant",
        },
        {
          name: "description",
          content:
            "Guided astrology workflows for AI agents, backed by local typed Python calculations and inspectable evidence.",
        },
        {
          property: "og:type",
          content: "website",
        },
        {
          property: "og:site_name",
          content: "Ascendant",
        },
        {
          property: "og:url",
          content: canonical,
        },
        {
          property: "og:title",
          content: "Ascendant - AI Skills and SDK for Astrology",
        },
        {
          property: "og:description",
          content:
            "Guided astrology workflows for AI agents, backed by local typed Python calculations and inspectable evidence.",
        },
        {
          property: "og:image",
          content: `${siteUrl}/og.png`,
        },
        {
          property: "og:image:width",
          content: "1200",
        },
        {
          property: "og:image:height",
          content: "630",
        },
        {
          property: "og:image:alt",
          content: "Ascendant: Modern Developer Ecosystem for Astrology",
        },
        {
          name: "twitter:card",
          content: "summary_large_image",
        },
        {
          name: "twitter:image",
          content: `${siteUrl}/og.png`,
        },
      ],
      links: [
        { rel: "canonical", href: canonical },
        // Every page sets text in Allo's Latin cut; fetch it alongside the
        // stylesheet instead of after it. Fonts are always fetched in CORS
        // mode, so the preload must be too or the browser fetches it twice.
        {
          rel: "preload",
          href: alloLatin,
          as: "font",
          type: "font/woff2",
          crossOrigin: "anonymous",
        },
        { rel: "stylesheet", href: appCss },
        { rel: "icon", type: "image/svg+xml", href: favicon },
      ],
    };
  },
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider>
          <Outlet />
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
