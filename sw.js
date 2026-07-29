const CACHE_NAME = 'culture-vault-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/style.css',
  '/src/main.js'
];

// 1. Installation : mise en cache des fichiers de l'application
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Activation : nettoyage des anciens caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 3. Interception des requêtes : Stale-While-Revalidate pour les pages & Cache First pour les images
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Pour les images (Discogs, OpenLibrary, TMDB, Supabase Storage) -> Stratégie Cache First
  if (e.request.destination === 'image' || url.hostname.includes('covers.openlibrary.org') || url.hostname.includes('discogs') || url.hostname.includes('tmdb')) {
    e.respondWith(
      caches.open('culture-vault-images').then(async (cache) => {
        const cachedResponse = await cache.match(e.request);
        if (cachedResponse) return cachedResponse;

        try {
          const networkResponse = await fetch(e.request);
          if (networkResponse.status === 200) {
            cache.put(e.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // Si pas de réseau et pas dans le cache, image par défaut générée
          return new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  // Pour les données Supabase (requêtes API) : Réseau d'abord, secours sur le cache local
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          const clonedRes = response.clone();
          caches.open('culture-vault-data').then((cache) => cache.put(e.request, clonedRes));
          return response;
        })
        .catch(() => caches.match(e.request)) // Si pas de réseau, on charge la dernière version Supabase enregistrée
    );
    return;
  }

  // Pour les autres fichiers statiques de l'app -> Cache avec secours réseau
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});