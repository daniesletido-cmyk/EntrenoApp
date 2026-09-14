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
  success: <CheckCircle2 size={18} style={{ color: "var(--color-success)" }} />,
  error: <XCircle size={18} style={{ color: "var(--color-danger)" }} />,
  info: <Info size={18} style={{ color: "var(--color-info)" }} />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((type: ToastType, message: string) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: "fixed",
          bottom: "var(--space-4)",
          right: "var(--space-4)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
          maxWidth: "min(360px, calc(100vw - 2rem))",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="surface-raised animate-in"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--space-2)",
              padding: "var(--space-3)",
              boxShadow: "var(--shadow-md)",
            }}
            role="status"
          >
            {ICONS[t.type]}
            <span className="text-sm" style={{ flex: 1 }}>
              {t.message}
            </span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Cerrar notificación"
              className="btn-ghost btn-icon"
              style={{ minHeight: "auto", padding: 2 }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
