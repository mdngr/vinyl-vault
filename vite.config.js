import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Culture Vault - Ma Médiathèque',
        short_name: 'Culture Vault',
        description: 'Ma médiathèque personnelle (Vinyles, BDs, Livres, DVDs)',
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
        // Mettre en cache tous les assets JS, CSS et HTML générés par Vite
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        
        // Stratégies de cache personnalisées pour Supabase et les images externes
        runtimeCaching: [
          {
            // 1. Cache pour les jaquettes et images (Discogs, OpenLibrary, TMDB)
            urlPattern: /^https:\/\/.*(covers\.openlibrary\.org|discogs|tmdb|placeholder).*$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'external-images-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 jours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // 2. Cache pour la base de données Supabase (Network First avec Fallback Cache)
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-data-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 jours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
});