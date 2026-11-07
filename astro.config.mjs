// @ts-check
import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://pathfinder-2-fr.vercel.app",
  trailingSlash: "ignore",
  // Preact instead of React: same component API, ~4 KB of client JS instead of ~60 KB (gzip).
  integrations: [preact()],
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  security: {
    // CSP <meta> on every page: Astro hashes the inline scripts and styles it emits (island runtime),
    // so no 'unsafe-inline'. Directives a <meta> cannot carry (frame-ancestors) are sent by vercel.json.
    csp: {
      directives: ["default-src 'self'", "img-src 'self' data:", "font-src 'self'", "connect-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"],
      // Pagefind compiles its search index as WebAssembly.
      scriptDirective: { resources: ["'self'", "'wasm-unsafe-eval'"] },
      styleDirective: { resources: ["'self'"] },
    },
  },
  vite: { plugins: [tailwindcss()] },
});
