"use client";

import { useEffect, useRef, useId } from "react";
import { AlertTriangle, Trash2, Info, X } from "lucide-react";
import { Button } from "./button";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning" | "brand";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const TONE_ICONS = {
  danger: <Trash2 size={20} style={{ color: "var(--color-danger)" }} />,
  warning: <AlertTriangle size={20} style={{ color: "var(--color-warning)" }} />,
  brand: <Info size={20} style={{ color: "var(--color-brand)" }} />,
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) {
        onCancel();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 250,
        padding: "var(--space-4)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="surface animate-in"
        style={{
          width: "min(480px, 100%)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-md)",
          outline: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "var(--space-3)",
            padding: "var(--space-4)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span style={{ flexShrink: 0 }}>{TONE_ICONS[tone]}</span>
            <h3 id={titleId} className="font-semibold text-base" style={{ margin: 0 }}>
              {title}
            </h3>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            aria-label="Cerrar"
            disabled={loading}
            onClick={onCancel}
            style={{ marginTop: -4, marginRight: -4 }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
          <div id={descId} style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
            {description}
          </div>
        </div>

        <div
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderTop: "1px solid var(--color-border)",
            background: "var(--color-surface-raised)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "var(--space-2)",
          }}
        >
          <Button variant="secondary" disabled={loading} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            loading={loading}
            onClick={onConfirm}
            style={
              tone === "danger"
                ? { background: "var(--color-danger-bg)", color: "var(--color-danger)", borderColor: "var(--color-danger)" }
                : undefined
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
