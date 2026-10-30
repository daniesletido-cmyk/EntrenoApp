// Service Worker para EntrenoApp Web Push Notifications y PWA
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {
    title: "⚡ Entreno cargado y analizado",
    body: "Nuevo entrenamiento sincronizado. Pulsa para ver el detalle y ajustes de la semana.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: "/",
    },
    tag: "entrenoapp-notification",
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    vibrate: [200, 100, 200],
    data: data.data || { url: "/" },
    tag: data.tag || "entrenoapp-alert",
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : "/";

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Si hay una ventana abierta de la app, enfocarla y navegar a la URL
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            if ("navigate" in client) {
              client.navigate(urlToOpen);
            }
            return client.focus();
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});
