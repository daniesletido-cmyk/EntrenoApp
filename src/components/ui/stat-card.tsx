import { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const TONE_STYLES: Record<Tone, { color: string; bg: string; border: string }> = {
  neutral: { color: "var(--color-text)", bg: "rgba(255, 255, 255, 0.06)", border: "var(--color-border)" },
  success: { color: "#10B981", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.3)" },
  warning: { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.3)" },
  danger: { color: "#EF4444", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.3)" },
  info: { color: "#0EA5E9", bg: "rgba(14, 165, 233, 0.15)", border: "rgba(14, 165, 233, 0.3)" },
  brand: { color: "#10B981", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.3)" },
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
      className="surface flex flex-col justify-between w-full overflow-hidden p-4 sm:p-5 shadow-lg transition-all duration-150 hover:border-white/20"
      style={{ position: "relative" }}
    >
      {/* Top subtle tone accent line */}
      {tone !== "neutral" && (
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: t.color }}
        />
      )}

      <div>
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <span
            className="text-xs uppercase tracking-wider font-semibold truncate"
            style={{ color: "var(--color-text-muted)" }}
          >
            {label}
          </span>
          {icon && (
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: t.bg,
                color: t.color,
              }}
            >
              {icon}
            </div>
          )}
        </div>

        <div
          className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight truncate mt-1"
          style={{
            color: tone === "neutral" ? "var(--color-text)" : t.color,
            lineHeight: 1.15,
          }}
        >
          {value}
        </div>
      </div>

      {sublabel && (
        <div
          className="text-xs truncate mt-2 font-medium"
          style={{ color: "var(--color-text-muted)" }}
          title={sublabel}
        >
          {sublabel}
        </div>
      )}
    </div>
  );
}
