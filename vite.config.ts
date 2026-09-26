import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { MLB_ORIGIN, upstreamPath } from './api/_routes';

// base stays '/' — Vercel serves from the root, which keeps the service
// worker scope and asset paths trouble-free.
export default defineConfig({
  // Local dev mirrors the Vercel function in api/mlb.ts.
  server: {
    proxy: {
      '/api/mlb': {
        target: MLB_ORIGIN,
        changeOrigin: true,
        rewrite: (path) => upstreamPath(new URL(path, 'http://x').searchParams) ?? '/invalid',
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'favicon.svg'],
      manifest: {
        name: 'Westwood Lineup',
        short_name: 'Lineup',
        description: 'Build and export per-inning little league lineups.',
        theme_color: '#0B0B0B',
        background_color: '#0B0B0B',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Everything is local-first, so precache the whole shell: the app must
        // work at the field with no signal.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // Live MLB data must never be answered with the app shell.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
  },
});
