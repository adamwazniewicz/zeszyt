import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // zrok.io blocks cookie-less requests with a warning page; the manifest must carry its cookie.
      useCredentials: true,
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Zeszyt",
        short_name: "Zeszyt",
        description: "Nieoficjalny, czytelny podgląd planu lekcji i ocen.",
        lang: "pl",
        start_url: "/",
        display: "standalone",
        background_color: "#f7f6f3",
        theme_color: "#f7f6f3",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
    }),
  ],
  server: {
    proxy: { "/api": "http://localhost:8787" },
  },
});
