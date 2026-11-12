"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCircle2, AlertTriangle, Loader2, Send, Info, Smartphone, BarChart3, Trophy, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationBanner({
  variant = "card",
  onDismiss,
}: {
  variant?: "card" | "compact" | "icon" | "banner";
  onDismiss?: () => void;
}) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testingDaily, setTestingDaily] = useState(false);
  const [testingWeekly, setTestingWeekly] = useState(false);
  const [isIosWeb, setIsIosWeb] = useState(false);
  const [statusHelp, setStatusHelp] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [justActivated, setJustActivated] = useState(false);
  const toast = useToast();

  const checkExistingSubscription = useCallback(async () => {
    try {
      if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
      const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.ready);
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      }
    } catch (err) {
      console.warn("Aviso comprobando suscripción push previa:", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasSW = "serviceWorker" in navigator;
    const hasNotification = "Notification" in window;

    // Detectar iOS en navegador web sin instalar como PWA
    const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isStandalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    if (isIos && !isStandalone) {
      setIsIosWeb(true);
    }

    if (hasSW && hasNotification) {
      setIsSupported(true);
      setPermission(Notification.permission);
      if (Notification.permission === "denied") {
        setStatusHelp(
          "Permisos bloqueados en tu navegador. Toca el candado o icono de ajustes junto a la URL para desbloquearlos."
        );
      }
      checkExistingSubscription();
    }

    try {
      if (localStorage.getItem("entrenoapp_dismiss_push_banner") === "1") {
        setDismissed(true);
      }
    } catch {}

    const handlePushChange = () => {
      checkExistingSubscription();
    };
    window.addEventListener("entrenoapp_push_changed", handlePushChange);
    return () => {
      window.removeEventListener("entrenoapp_push_changed", handlePushChange);
    };
  }, [checkExistingSubscription]);

  async function subscribeToPush() {
    setLoading(true);
    setStatusHelp(null);

    try {
      // 1. Advertencia para iOS si no está instalada como PWA
      if (isIosWeb) {
        toast.push(
          "info",
          "En iPhone: Pulsa el botón Compartir de Safari y selecciona 'Añadir a pantalla de inicio' para activar notificaciones push."
        );
        setStatusHelp(
          "En iOS debes pulsar 'Compartir' > 'Añadir a pantalla de inicio' para que Apple permita notificaciones."
        );
        setLoading(false);
        return;
      }

      // 2. Comprobar permisos actuales
      let currentPerm = Notification.permission;
      if (currentPerm === "denied") {
        toast.push(
          "error",
          "Permisos bloqueados. Pulsa en el icono de candado/ajustes de la barra de direcciones de tu navegador y activa 'Notificaciones'."
        );
        setStatusHelp(
          "Las notificaciones están bloqueadas en este navegador. Desbloquéalas en los ajustes del sitio (icono de candado)."
        );
        setLoading(false);
        return;
      }

      // 3. Solicitar permiso si aún está en "default"
      if (currentPerm !== "granted") {
        currentPerm = await Notification.requestPermission();
        setPermission(currentPerm);
        if (currentPerm !== "granted") {
          toast.push("info", "No se autorizó el permiso de notificaciones en el diálogo del navegador.");
          setLoading(false);
          return;
        }
      }

      // 4. Obtener clave pública VAPID del servidor
      const keyRes = await fetch("/api/push/subscribe");
      if (!keyRes.ok) throw new Error("No se pudo conectar con el servicio de suscripción push");
      const keyData = await keyRes.json();
      if (!keyData.publicKey) {
        throw new Error("Clave pública VAPID no configurada en el servidor.");
      }

      // 5. Registrar y esperar a que el Service Worker esté activo
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      // 6. Si existía una suscripción previa, desuscribirla limpiamente
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) {
        try {
          await existingSub.unsubscribe();
        } catch (unsubErr) {
          console.warn("Aviso al renovar suscripción push antigua:", unsubErr);
        }
      }

      // 7. Generar nueva suscripción
      const convertedKey = urlBase64ToUint8Array(keyData.publicKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      // 8. Extraer claves
      const subJson = subscription.toJSON();
      const rawP256dh = subscription.getKey ? subscription.getKey("p256dh") : null;
      const rawAuth = subscription.getKey ? subscription.getKey("auth") : null;

      const p256dh =
        subJson.keys?.p256dh ||
        (rawP256dh ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawP256dh)))) : "");
      const auth =
        subJson.keys?.auth ||
        (rawAuth ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawAuth)))) : "");

      // 9. Guardar suscripción en la base de datos
      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: { p256dh, auth },
          subscription: subJson,
          deviceType: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "mobile" : "desktop",
        }),
      });

      const saveJson = await saveRes.json();
      if (!saveRes.ok || !saveJson.success) {
        throw new Error(saveJson.error || "El servidor no pudo almacenar la suscripción");
      }

      setIsSubscribed(true);
      setJustActivated(true);
      window.dispatchEvent(new Event("entrenoapp_push_changed"));
      toast.push("success", "¡Notificaciones push activadas correctamente en tu móvil!");

      // Enviar una prueba automática
      try {
        await fetch("/api/push/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "daily",
            title: "🏅 Tu informe del entreno de hoy está listo",
            body: "¡Notificaciones enlazadas! Recibirás los informes diarios y semanales al instante en tu móvil.",
            url: "/hoy",
          }),
        });
      } catch {}
    } catch (err: any) {
      console.error("[Push] Error durante la suscripción:", err);
      const msg = err.message || "Error desconocido al activar notificaciones";
      toast.push("error", msg);
      setStatusHelp(msg);
    } finally {
      setLoading(false);
    }
  }

  async function sendTestNotification(type: "daily" | "weekly") {
    if (type === "daily") setTestingDaily(true);
    if (type === "weekly") setTestingWeekly(true);

    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.push("success", data.message || "Notificación enviada a tu móvil.");
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.push("error", err.message || "Error al enviar la notificación.");
    } finally {
      setTestingDaily(false);
      setTestingWeekly(false);
    }
  }

  // Vista icono puro (ideal para el header móvil sin romper el título)
  if (variant === "icon") {
    if (!isSupported) return null;
    return (
      <button
        onClick={isSubscribed ? () => sendTestNotification("daily") : subscribeToPush}
        disabled={loading || testingDaily || testingWeekly}
        className="btn btn-ghost btn-icon relative"
        aria-label={isSubscribed ? "Notificaciones push activas (probar)" : "Activar notificaciones"}
        title={isSubscribed ? "Notificaciones push activas. Toca para probar aviso." : "Toca para activar notificaciones push"}
        style={{ width: 38, height: 38, minWidth: 38, borderRadius: "50%" }}
      >
        {loading || testingDaily || testingWeekly ? (
          <Loader2 size={17} className="animate-spin text-primary" />
        ) : (
          <Bell
            size={17}
            className={isSubscribed ? "text-emerald-400 fill-emerald-400/20" : "text-amber-400 animate-pulse"}
          />
        )}
        <span
          className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
            isSubscribed ? "bg-emerald-400" : "bg-amber-400 animate-ping"
          }`}
        />
      </button>
    );
  }

  // Vista compacta (para sidebar de escritorio)
  if (variant === "compact") {
    if (!isSupported) return null;
    return (
      <div className="flex items-center gap-1.5">
        {isSubscribed ? (
          <button
            onClick={() => sendTestNotification("daily")}
            disabled={testingDaily || testingWeekly}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all shadow-sm active:scale-95"
            title="Pulsar para probar que salta la notificación en tu móvil"
          >
            {testingDaily || testingWeekly ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Bell size={13} className="text-emerald-400 fill-emerald-400/20" />
            )}
            <span>Push activo</span>
          </button>
        ) : (
          <button
            onClick={subscribeToPush}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all shadow-md active:scale-95"
            title="Activar notificaciones en el móvil"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
            <span>Activar Push</span>
          </button>
        )}
      </div>
    );
  }

  // Vista Banner (para la cabecera de las páginas)
  if (variant === "banner") {
    // Si ya está suscrito y no acaba de activarlo, NO mostrar banner para no estorbar en el móvil
    if (isSubscribed && !justActivated) return null;
    if (dismissed) return null;

    return (
      <div className="w-full mb-3 animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-950/70 via-slate-900/80 to-indigo-950/70 border border-indigo-500/25 px-3 py-2 shadow-sm backdrop-blur-md">
          {justActivated ? (
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-white truncate">
                  ¡Notificaciones móviles activadas! Te avisaremos al terminar tus entrenos.
                </span>
              </div>
              <button
                onClick={() => setJustActivated(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Bell size={13} />
                </div>
                <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-white whitespace-nowrap">
                    Avisos en móvil y PC:
                  </span>
                  <span className="text-xs text-slate-300 truncate">
                    Recibe feedback completo al cargar entrenos y sueño
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
                <button
                  onClick={subscribeToPush}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs transition-all shadow-sm active:scale-95"
                >
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
                  <span>Activar</span>
                </button>
                <button
                  onClick={() => {
                    setDismissed(true);
                    try {
                      localStorage.setItem("entrenoapp_dismiss_push_banner", "1");
                    } catch {}
                    if (onDismiss) onDismiss();
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-white transition-colors"
                  title="Cerrar"
                  aria-label="Cerrar"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vista Card completa (para Configuración)
  return (
    <div className="p-3.5 sm:p-4 rounded-xl border border-zinc-200 bg-white shadow-xs flex flex-col gap-3 w-full min-w-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              isSubscribed
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-zinc-100 border border-zinc-200 text-zinc-700"
            }`}
          >
            {isSubscribed ? <CheckCircle2 size={20} /> : <Bell size={20} />}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-2 flex-wrap">
              <span>Notificaciones Push en el Móvil</span>
              {isSubscribed ? (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
                  Activadas
                </span>
              ) : permission === "denied" ? (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700">
                  Bloqueadas en navegador
                </span>
              ) : null}
            </h4>
            <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
              {isSubscribed
                ? "Tu móvil recibirá un banner y vibración cuando el entreno diario o el informe semanal estén listos."
                : "Recibe alertas instantáneas en tu móvil o PC en cuanto se analice un entreno o se cierre la semana."}
            </p>
          </div>
        </div>

        <div className="w-full sm:w-auto shrink-0">
          {isSubscribed ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
              <button
                onClick={() => sendTestNotification("daily")}
                disabled={testingDaily || testingWeekly}
                className="w-full min-w-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 transition-colors cursor-pointer"
                title="Probar que salta el aviso diario"
              >
                {testingDaily ? <Loader2 size={13} className="animate-spin shrink-0" /> : <Trophy size={13} className="shrink-0 text-zinc-700" />}
                <span className="truncate">Probar aviso diario</span>
              </button>
              <button
                onClick={() => sendTestNotification("weekly")}
                disabled={testingDaily || testingWeekly}
                className="w-full min-w-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 transition-colors cursor-pointer"
                title="Probar que salta el aviso semanal"
              >
                {testingWeekly ? <Loader2 size={13} className="animate-spin shrink-0" /> : <BarChart3 size={13} className="shrink-0 text-zinc-700" />}
                <span className="truncate">Probar aviso semanal</span>
              </button>
            </div>
          ) : (
            <button
              onClick={subscribeToPush}
              disabled={loading}
              className="w-full sm:w-auto min-w-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin shrink-0" /> : <Bell size={14} className="shrink-0" />}
              <span>{permission === "denied" ? "Reintentar activación" : "Activar en mi móvil"}</span>
            </button>
          )}
        </div>
      </div>

      {statusHelp && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <Info size={15} className="text-amber-700 shrink-0 mt-0.5" />
          <span>{statusHelp}</span>
        </div>
      )}

      {isIosWeb && !isSubscribed && (
        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 flex items-start gap-2">
          <Smartphone size={15} className="text-zinc-700 shrink-0 mt-0.5" />
          <span>
            <strong>Usuarios de iPhone / iPad:</strong> Pulsa el icono de <em>Compartir</em> en Safari y elige <strong>&quot;Añadir a pantalla de inicio&quot;</strong>. Luego abre la app desde ese icono para activar notificaciones con el motor nativo de Apple.
          </span>
        </div>
      )}
    </div>
  );
}
