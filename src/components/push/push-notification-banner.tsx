"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCircle2, AlertTriangle, Loader2, Send, Info, Smartphone } from "lucide-react";
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

export function PushNotificationBanner({ variant = "card" }: { variant?: "card" | "compact" | "button" }) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isIosWeb, setIsIosWeb] = useState(false);
  const [statusHelp, setStatusHelp] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasSW = "serviceWorker" in navigator;
    const hasPush = "PushManager" in window;
    const hasNotification = "Notification" in window;

    // Detectar iOS en navegador web sin instalar como PWA
    const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
    if (isIos && !isStandalone) {
      setIsIosWeb(true);
    }

    if (hasSW && hasNotification) {
      setIsSupported(true);
      setPermission(Notification.permission);
      if (Notification.permission === "denied") {
        setStatusHelp("Permisos bloqueados en tu navegador. Toca el candado o icono de ajustes junto a la URL para desbloquearlos.");
      }
      checkExistingSubscription();
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
        setStatusHelp("En iOS debes pulsar 'Compartir' > 'Añadir a pantalla de inicio' para que Apple permita notificaciones.");
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
        setStatusHelp("Las notificaciones están bloqueadas en este navegador. Desbloquéalas en los ajustes del sitio (icono de candado).");
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
      toast.push("success", "¡Notificaciones push activadas correctamente en tu dispositivo!");

      // Enviar una prueba automática discreta para verificar recepción
      try {
        await fetch("/api/push/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "⚡ Notificaciones enlazadas",
            body: "Tu dispositivo recibirá los análisis de Suunto y Zepp en tiempo real.",
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

  async function sendTestNotification() {
    setTesting(true);
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "⚡ Entreno cargado y analizado",
          body: "Carrera: 10.5 km. Carga calculada. Pulsa para ver el detalle y ajustes de la semana.",
          url: "/hoy",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.push("success", data.message || "Notificación enviada a tus dispositivos.");
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.push("error", err.message || "Error al enviar la notificación.");
    } finally {
      setTesting(false);
    }
  }

  if (!isSupported) {
    return (
      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-300 flex items-start gap-3">
        <AlertTriangle size={18} className="shrink-0 text-amber-400 mt-0.5" />
        <div>
          <span className="font-semibold block text-white">Navegador sin soporte de notificaciones push</span>
          Este navegador o modo privado no admite notificaciones Web Push. Usa Chrome, Edge o Safari en tu pantalla principal.
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2">
        {isSubscribed ? (
          <button
            onClick={sendTestNotification}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            title="Probar notificación push"
          >
            {testing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            <span>Push activo</span>
          </button>
        ) : (
          <button
            onClick={subscribeToPush}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-primary/10 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary/20 transition-colors"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
            <span>Activar Push</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl ${isSubscribed ? "bg-emerald-500/10 text-emerald-400" : "bg-brand-primary/10 text-brand-primary"}`}>
            {isSubscribed ? <CheckCircle2 size={22} /> : <Bell size={22} />}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white flex items-center gap-2 flex-wrap">
              Notificaciones Push Inmediatas
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
                ? "Tu dispositivo está listo para recibir avisos cuando entre un entreno o se adapte el plan."
                : "Recibe alertas instantáneas en tu móvil o PC en cuanto Suunto sincronice un entreno o se analice el descanso."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isSubscribed ? (
            <button
              onClick={sendTestNotification}
              disabled={testing}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 transition-colors disabled:opacity-50"
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span>Probar notificación</span>
            </button>
          ) : (
            <button
              onClick={subscribeToPush}
              disabled={loading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-brand-primary hover:bg-brand-primary/90 text-black transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
              <span>{permission === "denied" ? "Reintentar activación" : "Activar con 1 clic"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mensaje de ayuda contextual si hay algún bloqueo o en iOS */}
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
