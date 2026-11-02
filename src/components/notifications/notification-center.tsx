"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Bell,
  X,
  CheckCheck,
  ChevronRight,
  Trophy,
  BarChart3,
  Zap,
  Clock,
  Sparkles,
  Smartphone,
  Loader2,
  Send,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

export interface AppNotificationItem {
  id: number;
  title: string;
  body: string;
  url: string;
  icon?: string | null;
  category: "daily_report" | "weekly_report" | "workout" | "sleep" | "system";
  read: number;
  created_at: string;
}

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

function timeAgo(dateString: string): string {
  try {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return "Justo ahora";
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays === 1) return "Ayer";
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return past.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

export function NotificationCenter({
  variant = "icon",
}: {
  variant?: "icon" | "button" | "menu-item";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushTesting, setPushTesting] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        setUnreadCount(Number(data.unreadCount) || 0);
      }
    } catch {}
  }, []);

  const checkPush = useCallback(async () => {
    try {
      if (typeof window === "undefined") return;
      if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        setIsPushSubscribed(!!sub);
      }
    } catch {}
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchNotifications();
    checkPush();

    const handlePushChange = () => {
      fetchNotifications();
      checkPush();
    };
    window.addEventListener("entrenoapp_push_changed", handlePushChange);
    window.addEventListener("focus", () => {
      fetchNotifications();
      checkPush();
    });

    return () => {
      window.removeEventListener("entrenoapp_push_changed", handlePushChange);
    };
  }, [fetchNotifications, checkPush]);

  // Bloquear scroll de la página de fondo cuando el drawer está abierto en móvil
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleOpen = () => {
    fetchNotifications();
    checkPush();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const activatePushOnThisDevice = async () => {
    setPushLoading(true);
    try {
      if (!("serviceWorker" in navigator) || !("Notification" in window)) {
        throw new Error("Este dispositivo no soporta notificaciones push en este modo.");
      }

      let currentPerm = Notification.permission;
      if (currentPerm === "denied") {
        throw new Error("Permisos bloqueados en tu iPhone. Revisa Ajustes > Notificaciones de Safari.");
      }

      if (currentPerm !== "granted") {
        currentPerm = await Notification.requestPermission();
        if (currentPerm !== "granted") {
          throw new Error("No se concedió el permiso de notificaciones en el diálogo del sistema.");
        }
      }

      const keyRes = await fetch("/api/push/subscribe");
      const keyData = await keyRes.json();
      if (!keyData.publicKey) {
        throw new Error("Clave pública VAPID no disponible.");
      }

      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const convertedKey = urlBase64ToUint8Array(keyData.publicKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      const subJson = subscription.toJSON();
      const rawP256dh = subscription.getKey ? subscription.getKey("p256dh") : null;
      const rawAuth = subscription.getKey ? subscription.getKey("auth") : null;

      const p256dh =
        subJson.keys?.p256dh ||
        (rawP256dh ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawP256dh)))) : "");
      const auth =
        subJson.keys?.auth ||
        (rawAuth ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawAuth)))) : "");

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: { p256dh, auth },
          subscription: subJson,
          deviceType: "mobile",
        }),
      });

      setIsPushSubscribed(true);
      window.dispatchEvent(new Event("entrenoapp_push_changed"));
      toast.push("success", "¡Avisos push activados en tu móvil!");

      // Enviar de inmediato la notificación de prueba
      triggerDirectTestNotification();
    } catch (err: any) {
      toast.push("error", err.message || "Error al activar notificaciones");
    } finally {
      setPushLoading(false);
    }
  };

  const triggerDirectTestNotification = async (type: "daily" | "weekly" = "daily") => {
    setPushTesting(true);
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.push("success", data.message || "¡Notificación enviada a tu pantalla!");
        fetchNotifications();

        // En Safari / iOS PWA, si todavía no se ha sincronizado la suscripción en base de datos,
        // disparar aviso local inmediato para que el usuario vea el resultado al instante
        if ((!data.totalSubscriptions || data.successCount === 0) && "serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.getRegistration("/sw.js");
          if (reg && reg.showNotification) {
            if (type === "daily") {
              await reg.showNotification("🏅 Tu informe de hoy está listo", {
                body: "⚡ Carrera: 12.0 km · 60 min · 5:02 min/km · 98 TSS\n🎯 Conclusión del entrenador y carga analizadas. Pulsa para ver tu análisis.",
                icon: "/icon-192.png",
                badge: "/icon-192.png",
                data: { url: "/entrenos/480" },
                tag: "daily-report-480",
              });
            } else {
              await reg.showNotification("📊 Tu informe semanal está listo", {
                body: "🏆 34.5 km · 5 sesiones · 420 TSS\n📈 Balance de carga, fatiga y adaptaciones del coach listas.",
                icon: "/icon-192.png",
                badge: "/icon-192.png",
                data: { url: "/informe-semanal" },
                tag: "weekly-report-test",
              });
            }
          }
        }
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.push("error", err.message || "Error al enviar la prueba");
    } finally {
      setPushTesting(false);
    }
  };

  const handleNotificationClick = async (item: AppNotificationItem) => {
    // 1. Marcar como leída
    if (!item.read) {
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read: 1 } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {}
    }

    // 2. Cerrar el panel
    setIsOpen(false);

    // 3. Navegar directamente al contenido
    if (item.url) {
      router.push(item.url);
    }
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
      setUnreadCount(0);
      toast.push("success", "Todas las notificaciones marcadas como leídas");
    } catch {
      toast.push("error", "Error al marcar como leídas");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "weekly_report":
        return {
          icon: BarChart3,
          label: "Informe Semanal",
          color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
          iconColor: "text-purple-400",
        };
      case "daily_report":
        return {
          icon: Trophy,
          label: "Entreno Diario",
          color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
          iconColor: "text-emerald-400",
        };
      case "workout":
        return {
          icon: Zap,
          label: "Carga Suunto",
          color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
          iconColor: "text-amber-400",
        };
      default:
        return {
          icon: Sparkles,
          label: "Aviso",
          color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
          iconColor: "text-indigo-400",
        };
    }
  };

  const modalContent = isOpen && mounted ? (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 999999,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "flex-end",
      }}
      onClick={handleClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          height: "100dvh",
          backgroundColor: "#080c14", // 100% opaco para que NUNCA se trasluzca nada detrás
          display: "flex",
          flexDirection: "column",
          boxShadow: "-12px 0 35px rgba(0, 0, 0, 0.8)",
          borderLeft: "1px solid rgba(255, 255, 255, 0.12)",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera sólida */}
        <div className="px-4 py-3 border-b border-white/10 bg-slate-950/80 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Avisos & Notificaciones
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                    {unreadCount} nuevas
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                Toca en cualquier aviso para ver los detalles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xs flex items-center gap-1"
                title="Marcar todas como leídas"
                aria-label="Marcar leídas"
              >
                <CheckCheck size={18} />
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/15 transition-colors"
              aria-label="Cerrar panel"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Barra de estado / Botón de prueba push */}
        <div className="px-3 pt-3 flex-shrink-0">
          {isPushSubscribed ? (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-emerald-300 truncate">Push activo en tu móvil</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => triggerDirectTestNotification("daily")}
                  disabled={pushTesting}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/30 transition-all active:scale-95 flex items-center gap-1"
                  title="Probar notificación de informe diario"
                >
                  {pushTesting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  <span>Diario</span>
                </button>
                <button
                  onClick={() => triggerDirectTestNotification("weekly")}
                  disabled={pushTesting}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold text-xs border border-indigo-500/30 transition-all active:scale-95 flex items-center gap-1"
                  title="Probar notificación de informe semanal"
                >
                  <BarChart3 size={12} />
                  <span>Semanal</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Smartphone size={14} />
                  Avisos en pantalla de bloqueo
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-tight">
                Pulsa para que te suene y vibre el móvil al terminar un entreno o cerrar la semana.
              </p>
              <button
                onClick={activatePushOnThisDevice}
                disabled={pushLoading}
                className="w-full py-2 px-3 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20"
              >
                {pushLoading ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
                <span>Activar avisos en este móvil</span>
              </button>
            </div>
          )}
        </div>

        {/* Lista scrolleable independiente */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-3 space-y-2">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 mb-3">
                <Bell size={24} />
              </div>
              <h4 className="text-sm font-semibold text-white">No hay notificaciones aún</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Cuando cargues un entreno o se complete la semana, aquí verás cada informe y podrás entrar con un clic.
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const badge = getCategoryBadge(n.category);
              const Icon = badge.icon;
              const isUnread = !n.read;

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`group relative p-3 sm:p-3.5 rounded-2xl cursor-pointer transition-all active:scale-[0.98] border ${
                    isUnread
                      ? "bg-indigo-950/40 border-indigo-500/40 shadow-md shadow-indigo-950/20"
                      : "bg-white/[0.03] border-white/5 hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner mt-0.5 ${badge.color}`}
                    >
                      <Icon size={17} className={badge.iconColor} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 flex-shrink-0">
                          <Clock size={11} />
                          {timeAgo(n.created_at)}
                        </span>
                      </div>

                      <h4
                        className={`text-xs sm:text-sm font-bold tracking-tight mt-1 truncate ${
                          isUnread ? "text-white" : "text-slate-200"
                        }`}
                      >
                        {n.title}
                      </h4>

                      <p className="text-[11px] sm:text-xs text-slate-300/80 line-clamp-2 mt-0.5 leading-relaxed">
                        {n.body}
                      </p>

                      <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 group-hover:text-indigo-300 mt-2">
                        <span>Ver información</span>
                        <ChevronRight
                          size={13}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pie fijo */}
        <div className="p-3 border-t border-white/10 bg-slate-950/90 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <Smartphone size={14} className="text-emerald-400" />
            <span>Web Push sincronizado</span>
          </span>
          <button
            onClick={() => {
              setIsOpen(false);
              router.push("/configuracion");
            }}
            className="text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            Ajustes de alertas →
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Botón desencadenador en la UI */}
      {variant === "icon" && (
        <button
          onClick={handleOpen}
          className="btn btn-ghost btn-icon relative"
          aria-label="Abrir centro de notificaciones"
          title="Ver avisos y notificaciones enviadas"
          style={{ width: 38, height: 38, minWidth: 38, borderRadius: "50%" }}
        >
          <Bell size={18} className="text-foreground" />
          {unreadCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center shadow-md animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>
      )}

      {variant === "button" && (
        <button
          onClick={handleOpen}
          className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 transition-all active:scale-98"
          title="Abrir centro de notificaciones"
        >
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-emerald-400" />
            <span>Notificaciones</span>
          </div>
          {unreadCount > 0 ? (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
              {unreadCount}
            </span>
          ) : (
            <span className="text-[11px] text-muted">0 pendientes</span>
          )}
        </button>
      )}

      {/* Renderizado vía Portal directamente en document.body para evitar bugs de stacking/backdrop-filter */}
      {mounted && typeof document !== "undefined" && modalContent
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
}
