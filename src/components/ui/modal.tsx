"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60 animate-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl text-slate-100 overflow-hidden outline-none animate-in"
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10">
          <div className="font-bold text-base tracking-tight text-white">{title}</div>
          <button
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors duration-150"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/40">{footer}</div>}
      </div>
    </div>
  );
}
