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
        // Supprime automatiquement les caches périmés lors des mises à jour du SW
        cleanupOutdatedCaches: true,
        
        // Mettre en cache uniquement le code HTML, CSS, JS et icônes
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        
        // Cache pour les images externes uniquement (Jaquettes)
        runtimeCaching: [
          {
            // Cache pour les couvertures (Discogs, OpenLibrary, TMDB)
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
          }
          // ⚠️ LA RÈGLE SUPABASE A ÉTÉ SUPPRIMÉE ICI POUR ÉVITER LES FUITES DE DONNÉES D'UN COMPTE À L'AUTRE
        ]
      }
    })
  ]
});