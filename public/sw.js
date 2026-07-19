// Service worker écrit à la main (Annexe A.7) — @serwist/next ne supporte pas Turbopack (bundler
// par défaut de ce projet, dev et build), donc pas d'injection de precache manifest ici. Ce fichier
// se contente de la seule brique dont l'app a réellement besoin : servir depuis le Cache API toute
// URL explicitement mise en cache par le bouton "Télécharger pour hors-ligne" (src/lib/offline.ts).
// Tout le reste passe au réseau normalement, ce service worker ne fait jamais de precaching agressif.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(
        () => new Response(null, { status: 503, statusText: "Offline" })
      );
    })
  );
});
