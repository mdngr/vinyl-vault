// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2026-07-31',

  experimental: {
    appManifest: false
  },

  $development: {
    devtools: { enabled: true }
  },

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@vite-pwa/nuxt' // Ajout du module PWA
  ],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY,
      discogsToken: process.env.NUXT_PUBLIC_DISCOGS_TOKEN || process.env.VITE_DISCOGS_TOKEN || '',
      rawgToken: process.env.NUXT_PUBLIC_RAWG_TOKEN || process.env.VITE_RAWG_TOKEN || ''
    }
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Culture Vault',
      short_name: 'CultureVault',
      description: 'Gère ta médiathèque personnelle de vinyles, livres et films.',
      theme_color: '#121212',
      background_color: '#121212',
      display: 'standalone',
      icons: [
        {
          src: '/apple-touch-icon.png',
          sizes: '180x180',
          type: 'image/png'
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    },
    workbox: {
      navigateFallback: '/',
      // Cacher les ressources statiques et les images
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      // Mise en cache des requêtes API (Supabase & Discogs) pour consultation offline
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'supabase-api-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 7 // Garder 7 jours en cache
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        },
        {
          urlPattern: /^https:\/\/api\.discogs\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'discogs-api-cache',
            expiration: {
              maxEntries: 200,
              maxAgeSeconds: 60 * 60 * 24 * 30 // Garder 30 jours en cache
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        }
      ]
    },
    devOptions: {
      enabled: true, // Permet de tester le PWA / Offline en mode dev
      type: 'module'
    }
  }
})