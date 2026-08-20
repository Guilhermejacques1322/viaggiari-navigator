// Viaggiari — service worker (push + navegação com rede primeiro)
// Estratégia: NetworkFirst apenas para navegações. Nunca cache-first de HTML.

const SHELL_CACHE = "viaggiari-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.allSettled(
        names.filter((n) => n.startsWith("viaggiari-shell-") && n !== SHELL_CACHE).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/~oauth") || url.pathname.startsWith("/api/")) return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(SHELL_CACHE);
          cache.put(request, response.clone());
        }
        return response;
      } catch (e) {
        const cache = await caches.open(SHELL_CACHE);
        const cached = (await cache.match(request)) || (await cache.match("/"));
        if (cached) return cached;
        return new Response(
          "<!doctype html><meta charset='utf-8'><title>Sem conexão</title><body style=\"font-family:system-ui;padding:2rem;text-align:center\"><h1>Sem conexão</h1><p>Verifique sua internet e tente novamente.</p></body>",
          { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
      }
    })(),
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "Viaggiari", body: "Você tem um novo aviso.", url: "/minha-viagem" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch (e) {
    if (event.data) payload.body = event.data.text();
  }

  const options = {
    body: payload.body,
    icon: "/icon-512.png",
    badge: "/icon-512.png",
    data: { url: payload.url || "/minha-viagem" },
    tag: payload.tag || undefined,
    renotify: !!payload.tag,
    vibrate: [120, 60, 120],
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/minha-viagem";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        } catch (e) {}
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});
