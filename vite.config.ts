/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { contentIndexPlugin } from './content-plugin.ts'

/**
 * Julkaisupolku. GitLab Pages tarjoilee sovelluksen usein alipolusta (esim. /it-oppi/); CI asettaa
 * VITE_BASE:n CI_PAGES_URL:n perusteella. Paikallisesti juuri.
 */
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [
    contentIndexPlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'IT-oppi',
        short_name: 'IT-oppi',
        description: 'Tietotekniikan oppimissovellus perusteista syventäviin aiheisiin',
        lang: 'fi',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f4f6f9',
        theme_color: '#f4f6f9',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Koko käyttöliittymän läpikäyvät testit (esim. 20 kysymyksen koe) voivat kestää yli oletuksen 5 s.
    testTimeout: 20_000,
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
})
