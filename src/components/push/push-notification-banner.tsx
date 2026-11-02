"use client";

import { useState, useEffect } from "react";
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
  variant?: "card" | "compact" | "button" | "banner";
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
  const toast = useToast();

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

    if (localStorage.getItem("entrenoapp_dismiss_push_banner") === "1") {
      setDismissed(true);
    }
  }, []);

  async function checkExistingSubscription() {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      }
    } catch (err) {
      console.warn("Aviso comprobando suscripción previa:", err);
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
          "En iPhone/iPad: Pulsa el botón Compartir de Safari y selecciona 'Añadir a pantalla de inicio' para activar notificaciones push."
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

      // 6. Si existía una suscripción previa (p.ej. con clave antigua o corrupta), desuscribirla limpiamente
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

      // 8. Extraer claves de forma universal
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
      toast.push("success", "¡Notificaciones push activadas correctamente en tu móvil!");

      // Enviar una prueba automática discreta para verificar recepción
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

  if (dismissed) return null;

  if (!isSupported) {
    if (variant === "compact") return null;
    return (
      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-300 flex items-start gap-3">
        <AlertTriangle size={18} className="shrink-0 text-amber-400 mt-0.5" />
        <div>
          <span className="font-semibold block text-white">Navegador sin soporte Web Push</span>
          Este navegador no admite notificaciones Web Push. Abre EntrenoApp en Google Chrome, Samsung Internet o Safari (como PWA).
        </div>
      </div>
    );
  }

  // Vista compacta para la barra superior
  if (variant === "compact") {
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
            <span className="hidden sm:inline">Push activo</span>
            <span className="sm:hidden">Push</span>
          </button>
        ) : (
          <button
            onClick={subscribeToPush}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all shadow-md active:scale-95 animate-pulse"
            title="Activar notificaciones en el móvil"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
            <span>Activar Push</span>
          </button>
        )}
      </div>
    );
  }

  // Vista Banner para la cabecera de Hoy y otras páginas
  if (variant === "banner") {
    return (
      <div className="w-full max-w-5xl mx-auto mb-4 px-3 sm:px-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 p-3.5 sm:p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner ${
                  isSubscribed
                    ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                    : "bg-indigo-500/20 border border-indigo-500/30 text-indigo-400"
                }`}
              >
                {isSubscribed ? <CheckCircle2 size={20} /> : <Bell size={20} className="animate-bounce" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isSubscribed
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                    }`}
                  >
                    {isSubscribed ? "Notificaciones Activas" : "Avisos en el Móvil"}
                  </span>
                  <span className="text-xs text-slate-300/80 font-medium">
                    {isSubscribed ? "Listo para saltar en tu pantalla" : "Informes diarios y semanales"}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white tracking-tight mt-0.5">
                  {isSubscribed
                    ? "📲 Las notificaciones saltarán directamente en tu móvil"
                    : "📲 Activa las notificaciones en tu móvil"}
                </h4>
                <p className="text-xs text-slate-300/80 mt-0.5">
                  {isSubscribed
                    ? "Recibirás '🏅 Tu informe del entreno de hoy está listo' y '📊 Tu informe semanal está listo'."
                    : "Te saltará un aviso con sonido y vibración en tu teléfono en cuanto cargues un entreno o se cierre la semana."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {isSubscribed ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => sendTestNotification("daily")}
                    disabled={testingDaily || testingWeekly}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition-all active:scale-95"
                    title="Probar aviso de entreno diario en tu móvil"
                  >
                    {testingDaily ? <Loader2 size={13} className="animate-spin" /> : <Trophy size={13} />}
                    <span>Probar diario</span>
                  </button>
                  <button
                    onClick={() => sendTestNotification("weekly")}
                    disabled={testingDaily || testingWeekly}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 font-bold text-xs transition-all active:scale-95"
                    title="Probar aviso de informe semanal en tu móvil"
                  >
                    {testingWeekly ? <Loader2 size={13} className="animate-spin" /> : <BarChart3 size={13} />}
                    <span>Probar semanal</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={subscribeToPush}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-indigo-500/20 active:scale-95"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                  <span>Activar en este móvil</span>
                </button>
              )}

              <button
                onClick={() => {
                  setDismissed(true);
                  try {
                    localStorage.setItem("entrenoapp_dismiss_push_banner", "1");
                  } catch {}
                  if (onDismiss) onDismiss();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Cerrar"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Instrucción específica para iOS */}
          {isIosWeb && !isSubscribed && (
            <div className="mt-3 pt-3 border-t border-indigo-500/20 text-xs text-sky-300 flex items-start gap-2">
              <Smartphone size={15} className="text-sky-400 shrink-0 mt-0.5" />
              <span>
                <strong>Usuarios de iPhone:</strong> Pulsa el botón de <em>Compartir</em> en Safari (icono de caja con flecha arriba) y selecciona <strong>"Añadir a pantalla de inicio"</strong>. Luego abre la app desde ese icono para activar las notificaciones.
              </span>
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
