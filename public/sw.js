const CACHE_NAME = 'shabba-offline-cache-v1';

// Fichiers de base à mettre en cache pour que l'app s'ouvre sans internet
const ASSETS_TO_CACHE = [
  '/',
  '/favicon.ico',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // On ne s'occupe que des requêtes GET (lecture)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Si on a le fichier en cache (ex: le PDF téléchargé), on le donne tout de suite
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Sinon, on essaie de le chercher sur internet
      return fetch(event.request).catch(() => {
        // 3. Si internet est coupé et pas de cache : on pourrait renvoyer une page d'erreur offline personnalisée
        console.log("Mode hors-ligne : Ressource non trouvée.");
      });
    })
  );
});