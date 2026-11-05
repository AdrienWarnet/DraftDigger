import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

const themeColor = '#0b0f17'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages sert l'app sous /DraftDigger/ : la CI passe BASE_PATH. En local : '/'.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      // Nouvelle version téléchargée en arrière-plan, appliquée à l'ouverture suivante.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'DraftDigger',
        short_name: 'DraftDigger',
        description: 'Assistant de build League of Legends',
        lang: 'fr',
        theme_color: themeColor,
        background_color: themeColor,
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Toute l'app est mise en cache : lancement instantané et hors ligne.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Icônes Data Dragon (champions, items, runes, sorts) : gardées en cache pour le hors-ligne.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/ddragon\.leagueoflegends\.com\/cdn\/.*\.png$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ddragon-images',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    passWithNoTests: true,
  },
})
