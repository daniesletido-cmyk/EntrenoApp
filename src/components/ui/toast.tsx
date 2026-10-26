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
  success: <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />,
  error: <XCircle size={18} className="text-rose-400 shrink-0" />,
  info: <Info size={18} className="text-sky-400 shrink-0" />,
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
        className="fixed z-50 flex flex-col gap-2 max-w-[min(380px,calc(100vw-2rem))] pointer-events-none"
        style={{
          bottom: "calc(74px + env(safe-area-inset-bottom, 12px))",
          right: "1rem",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto backdrop-blur-md bg-slate-900/90 border border-white/10 rounded-2xl p-3.5 shadow-2xl flex items-start gap-3 animate-in transition-all duration-150"
            role="status"
          >
            {ICONS[t.type]}
            <span className="text-sm font-medium text-slate-100 leading-snug flex-1">
              {t.message}
            </span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Cerrar notificación"
              className="text-slate-400 hover:text-white transition-colors duration-150 p-0.5 rounded-lg shrink-0"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
