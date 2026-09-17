"use client";

import { useState, useRef, useEffect } from "react";
import { Info, X } from "lucide-react";

interface InfoTooltipProps {
  title?: string;
  content: string;
  size?: number;
  align?: "left" | "center" | "right";
}

export function InfoTooltip({ title, content, size = 13, align = "center" }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const leftPosition =
    align === "left"
      ? { left: 0, transform: "none" }
      : align === "right"
      ? { right: 0, left: "auto", transform: "none" }
      : { left: "50%", transform: "translateX(-50%)" };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        verticalAlign: "middle",
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-label={title ? `Información sobre ${title}` : "Ver información"}
        style={{
          background: open ? "rgba(59, 130, 246, 0.2)" : "rgba(255, 255, 255, 0.05)",
          border: open ? "1px solid var(--color-brand)" : "1px solid var(--color-border)",
          cursor: "pointer",
          padding: 3,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          color: open ? "var(--color-brand)" : "var(--color-text-muted)",
          transition: "all 0.15s ease",
          lineHeight: 1,
        }}
        title="Ver qué significa este dato"
      >
        <Info size={size} />
      </button>

      {open && (
        <div
          role="tooltip"
          className="surface-raised animate-in"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            ...leftPosition,
            width: 270,
            maxWidth: "85vw",
            padding: "var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            backgroundColor: "#161b22",
            boxShadow: "0 12px 28px rgba(0, 0, 0, 0.7)",
            zIndex: 100,
            fontSize: "var(--text-xs)",
            color: "var(--color-text)",
            textAlign: "left",
            lineHeight: 1.45,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center justify-between gap-2"
            style={{ marginBottom: "var(--space-1)", paddingBottom: 4, borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}
          >
            <div className="flex items-center gap-1.5 font-semibold text-xs" style={{ color: "var(--color-brand)" }}>
              <Info size={13} />
              <span>{title || "Información"}</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn btn-ghost btn-icon"
              style={{ width: 18, height: 18, padding: 0, color: "var(--color-text-muted)" }}
              aria-label="Cerrar explicación"
            >
              <X size={12} />
            </button>
          </div>
          <div style={{ color: "var(--color-text-muted)", fontSize: "0.8rem", marginTop: 4 }}>
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
