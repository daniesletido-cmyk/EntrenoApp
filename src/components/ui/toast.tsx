"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  push: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={18} style={{ color: "var(--color-success)" }} className="shrink-0" />,
  error: <XCircle size={18} style={{ color: "var(--color-danger)" }} className="shrink-0" />,
  info: <Info size={18} style={{ color: "var(--color-brand)" }} className="shrink-0" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((type: ToastType, message: string) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        aria-live="polite"
        className="fixed z-50 flex flex-col gap-2 max-w-[min(380px,calc(100vw-2rem))] pointer-events-none right-4 bottom-[calc(82px+env(safe-area-inset-bottom,12px))] md:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto harbiz-glass rounded-2xl p-3.5 shadow-lg flex items-center gap-3 animate-in transition-all duration-150"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-md)",
            }}
            role="status"
          >
            {ICONS[t.type]}
            <span className="text-sm font-medium leading-snug flex-1" style={{ color: "var(--color-text)" }}>
              {t.message}
            </span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Cerrar notificación"
              className="flex items-center justify-center rounded-xl transition-colors duration-150 shrink-0 harbiz-press"
              style={{
                minWidth: 36,
                minHeight: 36,
                color: "var(--color-text-muted)",
              }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
