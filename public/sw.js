// Service Worker para EntrenoApp Web Push Notifications y PWA (v8 - Anti-duplicados y Deep Linking)
const CACHE_NAME = "entrenoapp-v8";

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
    title: "EntrenoApp",
    body: "Novedades en tu plan y recuperación.",
    icon: "/icon-192.png?v=8",
    badge: "/icon-192.png?v=8",
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
      data.body = event.data.text();
    }
  }

  // Asegurar una etiqueta (tag) única por tipo y fecha/evento para deduplicación estricta a nivel de SO
  const uniqueTag = data.tag || `entrenoapp-${data.data?.url || "alert"}`;

  const notificationOptions = {
    body: data.body,
    icon: data.icon || "/icon-192.png?v=8",
    badge: data.badge || "/icon-192.png?v=8",
    vibrate: [200, 100, 200],
    data: {
      url: data.data?.url || "/hoy",
      timestamp: Date.now(),
    },
    tag: uniqueTag,
    renotify: false, // Evita disparos repetidos sobre la misma notificación
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
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
          // Si es del mismo origen
          if (clientUrl.origin === self.location.origin) {
            // Intentar enfocar y navegar
            if ("focus" in client) {
              await client.focus();
            }
            // Enviar mensaje al cliente para navegación SPA suave (sin recarga completa si ya está montado)
            if ("postMessage" in client) {
              client.postMessage({
                type: "NAVIGATE_TO",
                url: targetPath,
              });
            }
            if ("navigate" in client && client.url !== targetUrl) {
              return client.navigate(targetUrl);
            }
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
