export default defineNuxtConfig({
  compatibilityDate: '2026-07-31',

  app: {
    head: {
      title: 'Culture Vault',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        // Configuration iOS (Ajout à l'écran d'accueil)
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Culture Vault' },
        // Couleur de la barre d'adresse sur mobile (Thème sombre)
        { name: 'theme-color', content: '#121212' }
      ],
      link: [
        // Favicon standard
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        // Icône écran d'accueil iPhone / iPad
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }
      ]
    }
  },
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss'
  ],
  runtimeConfig: {
    public: {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
    }
  }
})