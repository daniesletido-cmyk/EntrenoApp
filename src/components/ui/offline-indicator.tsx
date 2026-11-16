"use client";

import { useEffect, useState, useTransition } from "react";
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload } from "lucide-react";
import { getOfflineQueue, processOfflineQueue } from "@/lib/offline-sync";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [showSyncedToast, setShowSyncedToast] = useState<boolean>(false);
  const [, startTransition] = useTransition();

  const updateQueueCount = async () => {
    try {
      const queue = await getOfflineQueue();
      setPendingCount(queue.length);
    } catch {}
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await processOfflineQueue();
      setPendingCount(result.remaining);
      if (result.processed > 0) {
        setShowSyncedToast(true);
        setTimeout(() => setShowSyncedToast(false), 3000);
      }
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    updateQueueCount();

    // Auto-registrar Service Worker para soporte offline PWA en iOS y escritorio
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
        console.warn("[SW] Registro no disponible:", err);
      });
    }

    const onOnline = () => {
      setIsOnline(true);
      // Al recuperar conexión, procesar automáticamente la cola
      startTransition(() => {
        handleSync();
      });
    };

    const onOffline = () => {
      setIsOnline(false);
      updateQueueCount();
    };

    const onQueueChanged = (e: any) => {
      const count = e?.detail?.count ?? 0;
      setPendingCount(count);
    };

    const onSyncCompleted = () => {
      updateQueueCount();
      setShowSyncedToast(true);
      setTimeout(() => setShowSyncedToast(false), 3000);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("entrenoapp:offline-queue-changed", onQueueChanged);
    window.addEventListener("entrenoapp:sync-completed", onSyncCompleted);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("entrenoapp:offline-queue-changed", onQueueChanged);
      window.removeEventListener("entrenoapp:sync-completed", onSyncCompleted);
    };
  }, []);

  // Si está online y no hay cambios sincronizándose ni toast de éxito, no mostrar nada
  if (isOnline && !syncing && !showSyncedToast && pendingCount === 0) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-0 right-0 z-50 flex justify-center pointer-events-none px-3 animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        top: "calc(10px + env(safe-area-inset-top, 0px))",
      }}
    >
      <div
        className={`pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-md border transition-all ${
          !isOnline
            ? "bg-zinc-900/95 text-zinc-100 border-zinc-700/80 shadow-black/40"
            : syncing
            ? "bg-amber-950/90 text-amber-200 border-amber-800/80 shadow-black/30"
            : "bg-emerald-950/90 text-emerald-200 border-emerald-800/80 shadow-black/30"
        }`}
        style={{
          maxWidth: "calc(100vw - 24px)",
        }}
      >
        {!isOnline ? (
          <>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <WifiOff size={13} className="text-red-400 shrink-0" />
            <span className="truncate">
              Modo sin conexión · Cambios guardados en local
            </span>
            {pendingCount > 0 && (
              <span className="shrink-0 px-1.5 py-0.2 rounded-full bg-red-950/80 text-red-300 border border-red-800/60 text-[10px] font-bold">
                {pendingCount} pend.
              </span>
            )}
          </>
        ) : syncing ? (
          <>
            <RefreshCw size={12} className="animate-spin text-amber-400 shrink-0" />
            <span className="truncate">
              Conexión recuperada · Sincronizando cambios...
            </span>
            {pendingCount > 0 && (
              <span className="text-[10px] opacity-75">({pendingCount})</span>
            )}
          </>
        ) : (
          <>
            <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
            <span className="truncate">
              Conexión restablecida · Todos los datos sincronizados
            </span>
          </>
        )}

        {/* Botón táctil manual si hay items pendientes estando online */}
        {isOnline && pendingCount > 0 && !syncing && (
          <button
            type="button"
            onClick={handleSync}
            className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-bold cursor-pointer"
          >
            <CloudUpload size={11} />
            <span>Sincronizar ahora</span>
          </button>
        )}
      </div>
    </div>
  );
}
