// @ts-check
import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://example.org",
  trailingSlash: "ignore",
  // Preact instead of React: same component API, ~4 KB of client JS instead of ~60 KB (gzip).
  integrations: [preact()],
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  vite: { plugins: [tailwindcss()] },
});
