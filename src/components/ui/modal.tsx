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
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: "var(--space-4)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="surface animate-in"
        style={{
          width: "min(560px, 100%)",
          maxHeight: "min(680px, 90vh)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ padding: "var(--space-4)", borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="font-semibold">{title}</div>
          <button className="btn btn-ghost btn-icon" aria-label="Cerrar" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: "var(--space-4)", overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: "var(--space-4)", borderTop: "1px solid var(--color-border)" }}>{footer}</div>}
      </div>
    </div>
  );
}
