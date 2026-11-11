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
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm bg-slate-950/60 animate-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full md:max-w-lg max-h-[90dvh] flex flex-col rounded-t-3xl md:rounded-2xl overflow-hidden outline-none animate-sheet"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {/* Mobile Bottom Sheet drag handle */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: "var(--color-border-strong)" }}
          />
        </div>

        <div
          className="flex items-center justify-between px-4 py-3.5 sm:px-5 sm:py-4"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="font-bold text-base tracking-tight" style={{ color: "var(--color-text)" }}>
            {title}
          </div>
          <button
            type="button"
            className="btn-icon-sm flex items-center justify-center rounded-xl transition-colors harbiz-press"
            style={{
              minWidth: 44,
              minHeight: 44,
              color: "var(--color-text-muted)",
              background: "var(--color-surface-raised)",
            }}
            aria-label="Cerrar"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="p-4 sm:p-5 overflow-y-auto flex-1"
          style={{
            paddingBottom: footer ? undefined : "calc(20px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {children}
        </div>

        {footer && (
          <div
            className="p-4 sm:px-5 sm:py-4"
            style={{
              borderTop: "1px solid var(--color-border)",
              background: "var(--color-surface-raised)",
              paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
