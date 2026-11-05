const CACHE_NAME = "warsztat-cache";

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

  const url = new URL(event.request.url);
  
  if (url.pathname.endsWith('modules.json')) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request, { ignoreSearch: true }))
    );
    return;
  }

  event.respondWith(
    (async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        const networkResponse = await fetch(event.request, { 
          cache: "no-store", 
          signal: controller.signal 
        });
        clearTimeout(timeoutId);

        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      } catch (err) {
        clearTimeout(timeoutId);
        const cachedResponse = await caches.match(event.request, { ignoreSearch: true });
        if (cachedResponse) return cachedResponse;
        
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response("", { status: 404, statusText: "Not Found" });
      }
    })()
  );
});