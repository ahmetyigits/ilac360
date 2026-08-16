import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'ilac360 — İlaç Etkileşim Kontrolü',
        short_name: 'ilac360',
        description: 'Türkiye ilaç veritabanıyla ücretsiz, gizlilik-dostu ilaç etkileşim kontrolü',
        lang: 'tr',
        start_url: '/',
        display: 'standalone',
        theme_color: '#2563A8',
        background_color: '#ffffff',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Veri dosyaları (50+ MB) ve barkod WASM'ı (~1.3 MB) precache EDİLMEZ;
        // app shell + ikonlar yeterli. Veri ve WASM, aşağıdaki runtime
        // stratejileriyle ilk kullanımda cache'lenir.
        globPatterns: ['**/*.{js,css,html,svg}', 'pwa-*.png'],
        globIgnores: ['data/**', 'assets/*.wasm', 'screenshot.png', 'og-image.png'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Barkod çözücü WASM'ı içerik-hash'li → ilk taramada iner, sonra cache
            urlPattern: /\/assets\/.*\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ilac360-wasm',
              expiration: { maxEntries: 2 },
            },
          },
          {
            // İçerik-hash'li veri dosyaları değişmez → önce cache
            urlPattern: /\/data\/.*\.[0-9a-f]{8}\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ilac360-data',
              expiration: { maxEntries: 90, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
          {
            // manifest.json sürüm işaretçisidir → önce ağ, çevrimdışıysa cache
            urlPattern: /\/data\/manifest\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ilac360-data-manifest',
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
