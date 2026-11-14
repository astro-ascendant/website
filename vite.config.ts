import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import mdx from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    mdx(),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
      },
    }),
    react(),
    // please see https://tanstack.com/start/latest/docs/framework/react/guide/hosting#nitro for guides on hosting
    nitro({
      preset: "vercel",
      // These packages load data/native files with __dirname. Nitro's ESM
      // bundle drops that, so keep them as CJS and copy their full trees.
      // tslib is traced through @turf (via geo-tz) and then left external,
      // but the tracer copies only its ES6 build while Node resolves the
      // "node" export to modules/index.js, so copy the whole package.
      traceDeps: ["@swisseph/node*", "geo-tz*", "tslib*"],
      // Vercel reads headers from the generated output config, so they are
      // declared here rather than in vercel.json (which a prebuilt deployment
      // ignores). CSP starts report-only: the app inlines its bootstrap script.
      routeRules: {
        "/**": {
          headers: {
            "x-content-type-options": "nosniff",
            "x-frame-options": "SAMEORIGIN",
            "referrer-policy": "strict-origin-when-cross-origin",
            "permissions-policy":
              "camera=(), microphone=(), geolocation=(self), payment=()",
            "content-security-policy-report-only":
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
          },
        },
      },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
    dedupe: ["react", "react-dom"],
    alias: {
      tslib: "tslib/tslib.es6.js",
    },
  },
});
