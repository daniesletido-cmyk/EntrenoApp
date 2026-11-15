"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Send,
  Info,
  Smartphone,
  BarChart3,
  Trophy,
  Moon,
  X,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
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
  const [resubscribing, setResubscribing] = useState(false);
  const [testingDaily, setTestingDaily] = useState(false);
  const [testingWeekly, setTestingWeekly] = useState(false);
  const [testingSleep, setTestingSleep] = useState(false);
  const [isIosWeb, setIsIosWeb] = useState(false);
  const [statusHelp, setStatusHelp] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [justActivated, setJustActivated] = useState(false);
  const [swStatus, setSwStatus] = useState<"loading" | "active" | "error" | "unsupported">("loading");
  const [serverStatus, setServerStatus] = useState<"checking" | "subscribed" | "not_subscribed">("checking");
  const [serverTotalSubs, setServerTotalSubs] = useState<number>(0);
  const toast = useToast();

  const checkExistingSubscription = useCallback(async () => {
    try {
      if (typeof window === "undefined") return;

      if (!("serviceWorker" in navigator) || !("Notification" in window)) {
        setIsSupported(false);
        setSwStatus("unsupported");
        setServerStatus("not_subscribed");
        return;
      }
      setIsSupported(true);
      setPermission(Notification.permission);

      let reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.ready);
      if (!reg || !reg.active) {
        try {
          reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
          await navigator.serviceWorker.ready;
        } catch {}
      }

      if (reg && reg.active) {
        setSwStatus("active");
      } else {
        setSwStatus("error");
      }

      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(Boolean(sub));

        if (sub) {
          try {
            const sRes = await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {
              cache: "no-store",
            });
            const sData = await sRes.json();
            setServerTotalSubs(sData.totalSubscriptions || 0);

            if (sData.isSubscribed) {
              setServerStatus("subscribed");
            } else {
              // El navegador tiene sub pero el servidor no lo tiene -> Auto-sincronizar
              const subJson = sub.toJSON();
              const rawP256dh = sub.getKey ? sub.getKey("p256dh") : null;
              const rawAuth = sub.getKey ? sub.getKey("auth") : null;
              const p256dh =
                subJson.keys?.p256dh ||
                (rawP256dh ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawP256dh)))) : "");
              const auth =
                subJson.keys?.auth ||
                (rawAuth ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawAuth)))) : "");

              const syncRes = await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  endpoint: sub.endpoint,
                  keys: { p256dh, auth },
                  subscription: subJson,
                  deviceType: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "mobile" : "desktop",
                }),
              });
              if (syncRes.ok) {
                setServerStatus("subscribed");
                setServerTotalSubs((prev) => Math.max(prev + 1, 1));
              } else {
                setServerStatus("not_subscribed");
              }
            }
          } catch {
            setServerStatus("not_subscribed");
          }
        } else {
          setServerStatus("not_subscribed");
          try {
            const sRes = await fetch("/api/push/subscribe", { cache: "no-store" });
            const sData = await sRes.json();
            setServerTotalSubs(sData.totalSubscriptions || 0);
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Aviso comprobando suscripción push previa:", err);
      setSwStatus("error");
      setServerStatus("not_subscribed");
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
          "Permisos bloqueados en tu navegador o sistema. Toca el candado o icono de ajustes junto a la URL para desbloquearlos."
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

  async function resubscribeDevice() {
    setResubscribing(true);
    setStatusHelp(null);

    try {
      if (isIosWeb) {
        toast.push(
          "error",
          "En iPhone debes pulsar 'Compartir' en Safari > 'Añadir a pantalla de inicio' y abrir la app desde ese icono para activar notificaciones push."
        );
        setResubscribing(false);
        return;
      }

      let currentPerm = Notification.permission;
      if (currentPerm !== "granted") {
        currentPerm = await Notification.requestPermission();
        setPermission(currentPerm);
        if (currentPerm !== "granted") {
          toast.push("error", "Permiso de notificaciones denegado en el navegador.");
          setResubscribing(false);
          return;
        }
      }

      const keyRes = await fetch("/api/push/subscribe", { cache: "no-store" });
      if (!keyRes.ok) throw new Error("No se pudo conectar con el servicio de suscripción push");
      const keyData = await keyRes.json();
      if (!keyData.publicKey) throw new Error("Clave pública VAPID no disponible en servidor.");

      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      // Cancelar suscripción previa si existía para renovar claves limpias
      try {
        const oldSub = await reg.pushManager.getSubscription();
        if (oldSub) await oldSub.unsubscribe();
      } catch {}

      const convertedKey = urlBase64ToUint8Array(keyData.publicKey);
      const newSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      const subJson = newSub.toJSON();
      const rawP256dh = newSub.getKey ? newSub.getKey("p256dh") : null;
      const rawAuth = newSub.getKey ? newSub.getKey("auth") : null;
      const p256dh =
        subJson.keys?.p256dh ||
        (rawP256dh ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawP256dh)))) : "");
      const auth =
        subJson.keys?.auth ||
        (rawAuth ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawAuth)))) : "");

      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: newSub.endpoint,
          keys: { p256dh, auth },
          subscription: subJson,
          deviceType: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "mobile" : "desktop",
        }),
      });

      if (!saveRes.ok) throw new Error("El servidor no pudo almacenar la nueva suscripción.");

      setIsSubscribed(true);
      setSwStatus("active");
      setServerStatus("subscribed");
      setServerTotalSubs((prev) => Math.max(prev, 1));
      window.dispatchEvent(new Event("entrenoapp_push_changed"));
      toast.push("success", "¡Dispositivo re-suscrito con éxito en el servidor!");

      // Enviar prueba automática
      try {
        await fetch("/api/push/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "daily" }),
        });
      } catch {}
    } catch (err: any) {
      console.error("[Push] Error al re-suscribir dispositivo:", err);
      toast.push("error", err.message || "Error al re-suscribir dispositivo");
      setStatusHelp(err.message);
    } finally {
      setResubscribing(false);
    }
  }

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
            title: "Entreno completado",
            body: "Series umbral · 58 min",
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

  async function sendTestNotification(type: "daily" | "weekly" | "sleep") {
    if (testingDaily || testingWeekly || testingSleep) return;

    if (isIosWeb) {
      toast.push(
        "error",
        "En iPhone debes abrir la app desde la Pantalla de Inicio para que iOS reciba Web Push."
      );
      return;
    }

    if (permission === "denied") {
      toast.push("error", "Permisos de notificaciones bloqueados en tu navegador o móvil.");
      return;
    }

    const dedupeKey = `entrenoapp_banner_test_${type}_${Math.floor(Date.now() / 15000)}`;
    try {
      if (sessionStorage.getItem(dedupeKey)) {
        toast.push("info", "Aviso en curso. Espera unos segundos antes de enviar otro.");
        return;
      }
      sessionStorage.setItem(dedupeKey, "1");
    } catch {}

    if (type === "daily") setTestingDaily(true);
    if (type === "weekly") setTestingWeekly(true);
    if (type === "sleep") setTestingSleep(true);

    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.totalSubscriptions === 0) {
          toast.push("error", "No hay suscripciones en el servidor. Pulsa 'Re-suscribir dispositivo'.");
        } else {
          toast.push("success", data.message || "Notificación enviada a tu dispositivo.");
        }
      } else {
        throw new Error(data.error);
      }

      // Previsualización local inmediata si el navegador está abierto
      try {
        const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.ready);
        if (reg && "showNotification" in reg) {
          const title =
            type === "sleep" ? "Recuperación al 94%" : type === "weekly" ? "Resumen semanal" : "Entreno completado";
          const body =
            type === "sleep" ? "Sueño registrado: 8h 35m" : type === "weekly" ? "42.5 km esta semana" : "Series umbral · 58 min";
          const dest = type === "sleep" ? "/sueno" : type === "weekly" ? "/progreso" : "/hoy";
          reg.showNotification(title, {
            body,
            icon: "/icon-192.png?v=10",
            badge: "/icon-192.png?v=10",
            tag: `test-preview-${type}`,
            data: { url: dest },
          });
        }
      } catch {}
    } catch (err: any) {
      toast.push("error", err.message || "Error al enviar la notificación.");
    } finally {
      setTestingDaily(false);
      setTestingWeekly(false);
      setTestingSleep(false);
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

        <div className="w-full sm:w-auto shrink-0 flex items-center gap-2">
          {isSubscribed ? (
            <button
              onClick={resubscribeDevice}
              disabled={resubscribing || loading}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 transition-colors cursor-pointer"
              title="Renovar y sincronizar la suscripción con el servidor"
            >
              {resubscribing ? <Loader2 size={13} className="animate-spin shrink-0" /> : <RefreshCw size={13} className="shrink-0 text-zinc-700" />}
              <span>Re-suscribir</span>
            </button>
          ) : (
            <button
              onClick={subscribeToPush}
              disabled={loading || resubscribing}
              className="w-full sm:w-auto min-w-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin shrink-0" /> : <Bell size={14} className="shrink-0" />}
              <span>{permission === "denied" ? "Reintentar activación" : "Activar en mi móvil"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Indicadores de Estado Técnico en Tiempo Real */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs">
        {/* 1. Permiso del Navegador */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <span className="text-zinc-500 font-medium">Permiso:</span>
          {permission === "granted" ? (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              Concedido
            </span>
          ) : permission === "denied" ? (
            <span className="inline-flex items-center gap-1 font-semibold text-red-700 bg-red-100/60 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
              Bloqueado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
              Sin solicitar
            </span>
          )}
        </div>

        {/* 2. Service Worker */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <span className="text-zinc-500 font-medium">Service Worker:</span>
          {swStatus === "active" ? (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              Activo (v10)
            </span>
          ) : swStatus === "error" ? (
            <span className="inline-flex items-center gap-1 font-semibold text-red-700 bg-red-100/60 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
              Error
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-zinc-600 bg-zinc-200/60 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
              Comprobando...
            </span>
          )}
        </div>

        {/* 3. Suscripción en Servidor */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <span className="text-zinc-500 font-medium">Servidor:</span>
          {serverStatus === "subscribed" ? (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              Suscrito ({serverTotalSubs} disp.)
            </span>
          ) : serverStatus === "not_subscribed" ? (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
              No suscrito
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-zinc-600 bg-zinc-200/60 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
              Consultando...
            </span>
          )}
        </div>
      </div>

      {/* Botones de Prueba Web Push */}
      <div className="flex flex-col gap-1.5 pt-1 border-t border-zinc-100">
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          Pruebas de envío Web Push (Estilo Nativo)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
          <button
            onClick={() => sendTestNotification("daily")}
            disabled={testingDaily || testingWeekly || testingSleep}
            className="w-full min-w-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 transition-colors cursor-pointer"
            title="Probar que salta el aviso de entreno completado"
          >
            {testingDaily ? <Loader2 size={13} className="animate-spin shrink-0" /> : <Trophy size={13} className="shrink-0 text-zinc-700" />}
            <span className="truncate">Probar entreno</span>
          </button>
          <button
            onClick={() => sendTestNotification("sleep")}
            disabled={testingDaily || testingWeekly || testingSleep}
            className="w-full min-w-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 transition-colors cursor-pointer"
            title="Probar que salta el aviso de recuperación y sueño"
          >
            {testingSleep ? <Loader2 size={13} className="animate-spin shrink-0" /> : <Moon size={13} className="shrink-0 text-zinc-700" />}
            <span className="truncate">Probar sueño</span>
          </button>
          <button
            onClick={() => sendTestNotification("weekly")}
            disabled={testingDaily || testingWeekly || testingSleep}
            className="w-full min-w-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 transition-colors cursor-pointer"
            title="Probar que salta el resumen semanal"
          >
            {testingWeekly ? <Loader2 size={13} className="animate-spin shrink-0" /> : <BarChart3 size={13} className="shrink-0 text-zinc-700" />}
            <span className="truncate">Probar resumen</span>
          </button>
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
