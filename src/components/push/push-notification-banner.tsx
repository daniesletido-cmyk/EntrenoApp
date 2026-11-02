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
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
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
      <div className="w-full max-w-5xl mx-auto mb-4 px-3 sm:px-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 p-4 shadow-xl backdrop-blur-md">
          {justActivated ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white">¡Notificaciones móviles activadas!</h4>
                  <p className="text-xs text-slate-300">Te saltarán los informes diarios y semanales con sonido y vibración.</p>
                </div>
              </div>
              <button
                onClick={() => setJustActivated(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 shadow-inner mt-0.5">
                  <Bell size={20} className="animate-bounce" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Notificaciones en tu móvil
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-white tracking-tight mt-1">
                    Activa los avisos de tus informes
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                    Te saltará un aviso con sonido y vibración de &ldquo;Tu informe del entreno de hoy está listo&rdquo; y &ldquo;Tu informe semanal está listo&rdquo;.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
                <button
                  onClick={subscribeToPush}
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-indigo-500/25 active:scale-95"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                  <span>Activar en este móvil</span>
                </button>
                <button
                  onClick={() => {
                    setDismissed(true);
                    try {
                      localStorage.setItem("entrenoapp_dismiss_push_banner", "1");
                    } catch {}
                    if (onDismiss) onDismiss();
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                  title="Cerrar"
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              {isIosWeb && (
                <div className="w-full mt-2 pt-2 border-t border-indigo-500/20 text-xs text-sky-300 flex items-start gap-2">
                  <Smartphone size={15} className="text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>iPhone:</strong> Pulsa el icono de <em>Compartir</em> en Safari y elige <strong>"Añadir a pantalla de inicio"</strong>. Luego abre la app desde ese icono para recibir notificaciones en pantalla de bloqueo.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vista Card completa (para Configuración)
  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              isSubscribed ? "bg-emerald-500/10 text-emerald-400" : "bg-indigo-500/10 text-indigo-400"
            }`}
          >
            {isSubscribed ? <CheckCircle2 size={22} /> : <Bell size={22} />}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white flex items-center gap-2 flex-wrap">
              Notificaciones Push en el Móvil
              {isSubscribed ? (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  Activadas
                </span>
              ) : permission === "denied" ? (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400">
                  Bloqueadas en navegador
                </span>
              ) : null}
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isSubscribed
                ? "Tu móvil recibirá un banner y vibración cuando el entreno diario o el informe semanal estén listos."
                : "Recibe alertas instantáneas en tu móvil o PC en cuanto se analice un entreno o se cierre la semana."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isSubscribed ? (
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <button
                onClick={() => sendTestNotification("daily")}
                disabled={testingDaily || testingWeekly}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors"
                title="Probar que salta el aviso diario"
              >
                {testingDaily ? <Loader2 size={13} className="animate-spin" /> : <Trophy size={13} />}
                <span>Probar aviso diario</span>
              </button>
              <button
                onClick={() => sendTestNotification("weekly")}
                disabled={testingDaily || testingWeekly}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition-colors"
                title="Probar que salta el aviso semanal"
              >
                {testingWeekly ? <Loader2 size={13} className="animate-spin" /> : <BarChart3 size={13} />}
                <span>Probar aviso semanal</span>
              </button>
            </div>
          ) : (
            <button
              onClick={subscribeToPush}
              disabled={loading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-slate-950 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
              <span>{permission === "denied" ? "Reintentar activación" : "Activar en mi móvil"}</span>
            </button>
          )}
        </div>
      </div>

      {statusHelp && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
          <Info size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <span>{statusHelp}</span>
        </div>
      )}

      {isIosWeb && !isSubscribed && (
        <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-start gap-2">
          <Smartphone size={15} className="text-sky-400 shrink-0 mt-0.5" />
          <span>
            <strong>Usuarios de iPhone / iPad:</strong> Pulsa el icono de <em>Compartir</em> en Safari y elige <strong>"Añadir a pantalla de inicio"</strong>. Luego abre la app desde ese icono para activar notificaciones con el motor nativo de Apple.
          </span>
        </div>
      )}
    </div>
  );
}
