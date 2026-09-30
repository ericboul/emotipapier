/* EmotiPapier — service worker (100 % local, aucune donnée ne quitte l'appareil).
   Chemins relatifs : fonctionne à la racine ou dans un sous-chemin (GitHub Pages). */
const CACHE_NAME = "emotipapier-v2";

self.addEventListener("install", (event) => {
  // Pas de pré-caching avec chemins absolus : tout se mettra en cache à la
  // première visite (navigation + assets). Installation instantanée.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Uniquement les requêtes GET du même origine.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation (pages) : réseau d'abord, puis cache, puis index.html (SPA).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const indexUrl = new URL("./index.html", url.href).href;
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(indexUrl, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then(
              (cached) =>
                cached ||
                caches.match(new URL("./index.html", url.href).href),
            ),
        ),
    );
    return;
  }

  // Fichiers statiques : stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
