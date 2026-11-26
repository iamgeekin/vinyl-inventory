import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app from /<repository name>/.
const PAGES_BASE = '/vinyl-inventory/';

const ONE_YEAR = 60 * 60 * 24 * 365;

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? PAGES_BASE : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Vinyl Inventory',
        short_name: 'Vinyl',
        description: 'Keep track of your vinyl record collection.',
        display: 'standalone',
        background_color: '#0c0c0f',
        theme_color: '#0c0c0f',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Includes the barcode decoder, so scanning works offline after the first visit.
        globPatterns: ['**/*.{js,css,html,svg,png,wasm}', '**/*-latin-{opsz,wght}-normal-*.woff2'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\.woff2$/,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20, maxAgeSeconds: ONE_YEAR } },
          },
          {
            // Cover pictures that are linked to, not stored with the record.
            urlPattern: /^https:\/\/(i\.discogs\.com|[\w-]+\.mzstatic\.com|coverartarchive\.org|[\w.-]*archive\.org)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cover-art',
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // The text reader and its language data, fetched on first use.
            urlPattern: /^https:\/\/(cdn\.jsdelivr\.net|tessdata\.projectnaptha\.com)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'text-reader',
              expiration: { maxEntries: 12, maxAgeSeconds: ONE_YEAR },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
}));
