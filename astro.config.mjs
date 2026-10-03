// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://sameeralam3127.github.io",
  output: "static",
  trailingSlash: "ignore",
  // Astro 7 defaults to JSX whitespace rules, which drop spaces between text
  // and elements across line breaks. Lossless minification keeps them.
  compressHTML: true,
  integrations: [react(), sitemap()],
  markdown: {
    // Dual themes: colours are emitted as CSS variables and switched by
    // [data-theme] in global.css, so code follows the site's theme toggle.
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    },
  },
  build: {
    // Inline small stylesheets to avoid a render-blocking request on first paint.
    inlineStylesheets: "auto",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
