import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Culture Vault - Ma Médiathèque',
        short_name: 'Culture Vault',
        description: 'Gère ta collection de vinyles, livres et films',
        theme_color: '#3b82f6',
        background_color: '#121212',
        display: 'standalone',
        icons: [
          {
            src: 'https://em-content.zobj.net/source/apple/354/🏛️_1f3db-fe0f.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*(covers\.openlibrary\.org|discogs|tmdb|placeholder).*$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'external-images-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          }
        ]
      }
    })
  ]
});