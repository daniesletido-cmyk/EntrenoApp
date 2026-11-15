// Service Worker para EntrenoApp Web Push Notifications y PWA (v10 - Native iOS Safari & Desktop Push)
const CACHE_NAME = "entrenoapp-v10";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Limpiar caches antiguos si existieran
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
    ])
  );
});

self.addEventListener("push", (event) => {
  let data = {
    title: "Entreno completado",
    body: "Series umbral · 58 min",
    icon: "/icon-192.png?v=10",
    badge: "/icon-192.png?v=10",
    data: {
      url: "/hoy",
    },
    tag: "entrenoapp-alert",
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = {
        ...data,
        ...parsed,
        data: {
          ...data.data,
          ...(parsed.data || {}),
        },
      };
    } catch (e) {
      try {
        const text = event.data.text();
        if (text) data.body = text;
      } catch {}
    }
  }

  // Deduplicación estricta a nivel de SO mediante tag
  const uniqueTag = data.tag || `entrenoapp-${data.data?.url || "alert"}`;

  const notificationOptions = {
    body: data.body || "Novedad en tu entrenamiento",
    icon: data.icon || "/icon-192.png?v=10",
    badge: data.badge || "/icon-192.png?v=10",
    data: {
      url: data.data?.url || "/hoy",
      timestamp: Date.now(),
    },
    tag: uniqueTag,
    renotify: false, // Evita disparos repetidos sobre la misma notificación
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "EntrenoApp", notificationOptions)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetPath = (event.notification.data && event.notification.data.url) || "/hoy";
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(async (clientList) => {
        // 1. Si ya hay una ventana o pestaña de la app abierta
        for (const client of clientList) {
          const clientUrl = new URL(client.url, self.location.origin);
          if (clientUrl.origin === self.location.origin) {
            try {
              if ("focus" in client) await client.focus();
            } catch {}

            // Enviar mensaje al cliente para navegación SPA suave en Next.js
            try {
              if ("postMessage" in client) {
                client.postMessage({
                  type: "NAVIGATE_TO",
                  url: targetPath,
                });
              }
            } catch {}

            // En navegadores que soporten navigate en WindowClient
            try {
              if ("navigate" in client && typeof client.navigate === "function" && client.url !== targetUrl) {
                return await client.navigate(targetUrl);
              }
            } catch {}

            return client;
          }
        }

        // 2. Si no hay ninguna ventana abierta de la app, abrir una nueva en la URL exacta
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
