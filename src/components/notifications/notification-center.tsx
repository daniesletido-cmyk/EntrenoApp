"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    fetchNotifications();

    const handlePushChange = () => fetchNotifications();
    window.addEventListener("entrenoapp_push_changed", handlePushChange);
    window.addEventListener("focus", fetchNotifications);

    return () => {
      window.removeEventListener("entrenoapp_push_changed", handlePushChange);
      window.removeEventListener("focus", fetchNotifications);
    };
  }, [fetchNotifications]);

  const handleOpen = () => {
    fetchNotifications();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleNotificationClick = async (item: AppNotificationItem) => {
    // 1. Marcar como leída en segundo plano
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

    // 3. Navegar directamente a la información de la notificación
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
          label: "Semanal",
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

      {/* Drawer / Modal de Notificaciones */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end sm:justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={handleClose}
        >
          <div
            className="w-full sm:max-w-md h-full bg-slate-950/95 border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
            style={{
              paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
            }}
          >
            {/* Cabecera del Centro de Notificaciones */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Bell size={17} />
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

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={loading}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xs flex items-center gap-1"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck size={16} />
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Lista de Notificaciones enviadas */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-2 sm:p-3">
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
                      className={`group relative p-3 sm:p-3.5 rounded-xl cursor-pointer transition-all active:scale-[0.99] hover:bg-white/[0.05] ${
                        isUnread ? "bg-indigo-500/[0.07] border-l-2 border-indigo-400" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner mt-0.5 ${
                            badge.color
                          }`}
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
                              isUnread ? "text-white" : "text-slate-300"
                            }`}
                          >
                            {n.title}
                          </h4>

                          <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
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

            {/* Pie del Centro de Notificaciones */}
            <div className="p-3 border-t border-white/10 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
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
      )}
    </>
  );
}
