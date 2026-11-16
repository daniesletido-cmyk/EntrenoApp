// Service Worker para EntrenoApp (v13 - Clean Chunks, Safari iOS FIT Download & Native Push)
const CACHE_VERSION = "v13";
const STATIC_CACHE = `entrenoapp-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `entrenoapp-dynamic-${CACHE_VERSION}`;
const DATA_CACHE = `entrenoapp-data-${CACHE_VERSION}`;

const CURRENT_CACHES = [STATIC_CACHE, DYNAMIC_CACHE, DATA_CACHE];

// Vistas y recursos esenciales para pre-cachear durante la instalación
const PRECACHE_ASSETS = [
  "/",
  "/hoy",
  "/sueno",
  "/biblioteca",
  "/progreso",
  "/marcas",
  "/configuracion",
  "/manifest.json?v=7",
  "/favicon.ico?v=7",
  "/icon-192.png?v=10",
  "/icon-512.png?v=10",
  "/apple-touch-icon.png?v=7",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then(async (cache) => {
        // Usar allSettled para que un recurso puntual no aborte la instalación del SW
        await Promise.allSettled(
          PRECACHE_ASSETS.map(async (url) => {
            try {
              const res = await fetch(url, { cache: "reload" });
              if (res.ok) {
                await cache.put(url, res);
              }
            } catch (err) {
              console.warn(`[SW] Precache omitido para ${url}:`, err);
            }
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Eliminar TODAS las versiones obsoletas de la caché para limpiar chunks viejos
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("entrenoapp-") && !CURRENT_CACHES.includes(k))
            .map((k) => caches.delete(k))
        )
      ),
    ])
  );
});

// Interceptor de peticiones HTTP para soporte offline
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones no HTTP/HTTPS o métodos de escritura (POST, PATCH, DELETE se gestionan con la cola offline en cliente)
  if (!url.protocol.startsWith("http") || request.method !== "GET") {
    return;
  }

  // 1. Navegación de páginas HTML (Modo SPA / Next.js)
  // Estrategia: Network-First con fallback a caché (evita pantalla en blanco en modo avión)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const clone = response.clone();
            const cache = await caches.open(STATIC_CACHE);
            await cache.put(request, clone);
          }
          return response;
        })
        .catch(async () => {
          // Si estamos sin conexión, devolver la página en caché correspondiente
          const matched = await caches.match(request);
          if (matched) return matched;

          // Fallback a /hoy o a la raíz si la ruta específica no estuviera en caché
          const fallbackHoy = await caches.match("/hoy");
          if (fallbackHoy) return fallbackHoy;

          const fallbackRoot = await caches.match("/");
          if (fallbackRoot) return fallbackRoot;

          return new Response(
            `<!DOCTYPE html>
            <html lang="es">
              <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <title>EntrenoApp · Modo sin conexión</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
                  .card { background: #18181b; border: 1px solid #27272a; border-radius: 20px; padding: 24px; max-width: 340px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                  h1 { font-size: 18px; margin: 0 0 8px; color: #dc2626; font-weight: 800; }
                  p { font-size: 13px; color: #a1a1aa; line-height: 1.5; margin: 0 0 16px; }
                  button { background: #dc2626; color: white; border: none; border-radius: 12px; padding: 10px 18px; font-weight: 700; font-size: 13px; cursor: pointer; width: 100%; }
                </style>
              </head>
              <body>
                <div class="card">
                  <h1>EntrenoApp · Modo sin conexión</h1>
                  <p>Estás sin internet o en modo avión. Abre la aplicación cuando recuperes cobertura o pulsa para reintentar.</p>
                  <button onclick="window.location.reload()">Reintentar conexión</button>
                </div>
              </body>
            </html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        })
    );
    return;
  }

  // 2. Chunks de JavaScript de Next.js (_next/static/chunks/...)
  // Estrategia: Network-First con fallback a caché. Evita errores de chunks rotos o desincronizados tras nuevo despliegue.
  if (url.pathname.startsWith("/_next/static/chunks/")) {
    event.respondWith(
      fetch(request)
        .then(async (networkResponse) => {
          if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response("", { status: 408, statusText: "Offline chunk unavailable" });
        })
    );
    return;
  }

  // 3. Recursos multimedia e iconos estáticos (_next/static/media, fuentes, imágenes, icons)
  // Estrategia: Cache-First con actualización en segundo plano (Stale-While-Revalidate)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then(async (networkResponse) => {
            if (networkResponse.ok) {
              const cache = await caches.open(DYNAMIC_CACHE);
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. Peticiones de datos API (GET /api/...)
  // Estrategia: Network-First con caché de datos para modo offline
  if (url.pathname.startsWith("/api/")) {
    // Excluir endpoints sensibles de streaming, auth o descargas binarias (.FIT)
    if (
      url.pathname.includes("/auth") ||
      url.pathname.includes("/chat") ||
      url.searchParams.get("format") === "fit" ||
      url.pathname.endsWith(".fit") ||
      url.pathname.endsWith(".pdf")
    ) {
      return;
    }

    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const clone = response.clone();
            const cache = await caches.open(DATA_CACHE);
            cache.put(request, clone);
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          // Si no hay datos en caché para este endpoint, devolver JSON vacío limpio
          return new Response(JSON.stringify({ offline: true, error: "Sin conexión a internet" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        })
    );
    return;
  }
});

// Evento push para Web Push Notifications nativas en iOS Safari y escritorio
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
    } catch {
      try {
        const text = event.data.text();
        if (text) data.body = text;
      } catch {}
    }
  }

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
    renotify: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "EntrenoApp", notificationOptions)
  );
});

// Clic en notificaciones con redirección y enfoque SPA
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
        for (const client of clientList) {
          const clientUrl = new URL(client.url, self.location.origin);
          if (clientUrl.origin === self.location.origin) {
            try {
              if ("focus" in client) await client.focus();
            } catch {}

            try {
              if ("postMessage" in client) {
                client.postMessage({
                  type: "NAVIGATE_TO",
                  url: targetPath,
                });
              }
            } catch {}

            try {
              if ("navigate" in client && typeof client.navigate === "function" && client.url !== targetUrl) {
                return await client.navigate(targetUrl);
              }
            } catch {}

            return client;
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
