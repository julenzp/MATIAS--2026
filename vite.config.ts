import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_BUILD_ID__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    host: "::",
    port: 8080,
  },
  optimizeDeps: {
    force: true,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico", 
        "pwa-192x192.png", 
        "pwa-512x512.png",
        "robots.txt"
      ],
      manifest: {
        name: "ERBI Transporte - Horarios",
        short_name: "ERBI",
        description: "Horarios de transporte ERBI - MATIA, ASPACE y más. Acceso rápido y offline.",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        id: "/",
        categories: ["transportation", "productivity"],
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "MATIA REZOLA",
            short_name: "MATIA",
            url: "/#/matia?app=true",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "ASPACE",
            short_name: "ASPACE",
            url: "/#/aspace-individual?app=true",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "AMARAEN FINDE",
            short_name: "AMARAEN",
            url: "/#/amaraen-finde?app=true",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "MATIA USURBIL",
            short_name: "EGURTZEGI",
            url: "/#/egurtzegi?app=true",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MB
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}"],
        globIgnores: [
          "**/index.html",
          "**/pwa-tracking.html",
          "**/pwa-*.html",
          "**/manifest-*.webmanifest",
          "**/erbi-standalone.html",
        ],
        importScripts: ["/push-handler.js"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // CRÍTICO: Todas las rutas que no sean API deben servir index.html
        // Esto permite que React Router maneje /aspace, /matia, etc.
        navigateFallback: "/index.html",
        // Solo excluir rutas de API/auth; todas las demás usan el fallback
        navigateFallbackDenylist: [
          /^\/api/,
          /^\/supabase/,
          /^\/~oauth/,
          /^\/pwa-.*\.html$/,
          /^\/manifest-.*\.webmanifest$/,
          /^\/erbi-standalone\.html$/,
          /^\/t\//,
        ],
        runtimeCaching: [
          {
            // HTML principal siempre fresco para evitar servir una shell vieja
            urlPattern: ({ request, url }) =>
              request.mode === "navigate" &&
              !/^\/(?:pwa-.*\.html|manifest-.*\.webmanifest|erbi-standalone\.html|t\/)/.test(url.pathname),
            handler: "NetworkOnly",
          },
          {
            // Incidencias y route_incidents SIEMPRE frescas — nunca cachear
            urlPattern: /^https:\/\/cmsnpgalkulkdxagfxpo\.supabase\.co\/rest\/v1\/(?:incidencias|route_incidents)/i,
            handler: "NetworkOnly",
          },
          {
            // Cache otras Supabase API calls — NetworkFirst con timeout corto
            urlPattern: /^https:\/\/cmsnpgalkulkdxagfxpo\.supabase\.co\/rest\/v1\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutos
              },
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Cache Supabase auth
            urlPattern: /^https:\/\/cmsnpgalkulkdxagfxpo\.supabase\.co\/auth\/.*/i,
            handler: "NetworkOnly",
          },
          {
            // Cache images
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Cache fonts
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "fonts-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
