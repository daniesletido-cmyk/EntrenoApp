import { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const TONE_STYLES: Record<Tone, { color: string; bg: string; border: string }> = {
  neutral: { color: "var(--color-text)", bg: "var(--color-surface-raised)", border: "var(--color-border)" },
  success: { color: "var(--color-success)", bg: "var(--color-success-bg)", border: "rgba(16, 185, 129, 0.25)" },
  warning: { color: "var(--color-warning)", bg: "var(--color-warning-bg)", border: "rgba(245, 158, 11, 0.25)" },
  danger: { color: "var(--color-danger)", bg: "var(--color-danger-bg)", border: "rgba(239, 68, 68, 0.25)" },
  info: { color: "var(--color-info)", bg: "var(--color-info-bg)", border: "rgba(14, 165, 233, 0.25)" },
  brand: { color: "var(--color-brand)", bg: "var(--color-brand-subtle)", border: "rgba(59, 130, 246, 0.25)" },
};

export function StatCard({
  label,
  value,
  icon,
  tone = "neutral",
  sublabel,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: Tone;
  sublabel?: string;
}) {
  const t = TONE_STYLES[tone];
  return (
    <div
      className="surface surface-interactive flex flex-col justify-between"
      style={{
        padding: "var(--space-4)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top subtle tone line */}
      {tone !== "neutral" && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: t.color,
          }}
        />
      )}

      <div>
        <div className="flex items-center justify-between gap-2" style={{ marginBottom: "var(--space-3)" }}>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--color-text-muted)",
            }}
          >
            {label}
          </span>
          {icon && (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: t.bg,
                color: t.color,
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          )}
        </div>

        <div
          className="tabular-nums font-bold"
          style={{
            fontSize: "1.75rem",
            letterSpacing: "-0.03em",
            color: tone === "neutral" ? "var(--color-text)" : t.color,
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
      </div>

      {sublabel && (
        <div
          className="text-xs text-muted"
          style={{
            marginTop: "var(--space-2)",
            paddingTop: "var(--space-2)",
            borderTop: "1px solid var(--color-border)",
            lineHeight: 1.4,
          }}
        >
          {sublabel}
        </div>
      )}
    </div>
  );
}
