const CACHE_NAME = "warsztat-cache-v3";

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const coreAssets = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
    await cache.addAll(coreAssets);

    try {
      const res = await fetch('./modules.json');
      if (res.ok) {
        const modules = await res.json();
        const files = modules.map(m => m.file);
        files.push('./modules.json');
        
        await Promise.all(files.map(async (file) => {
          try {
            const r = await fetch(file);
            if (r.ok) await cache.put(file, r);
          } catch (err) {}
        }));
      }
    } catch (err) {}
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request, { cache: "no-store" }).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });

      return cachedResponse || fetchPromise;
    })
  );
});