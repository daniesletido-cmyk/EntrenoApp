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
      className="fixed inset-0 z-[250] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-950/60 backdrop-blur-sm animate-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full md:max-w-[460px] flex flex-col rounded-t-3xl md:rounded-2xl overflow-hidden outline-none animate-sheet"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div className="md:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--color-border-strong)" }} />
        </div>
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
            padding: "var(--space-3) var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom, 0px))",
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
