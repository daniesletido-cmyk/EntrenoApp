import { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const TONE_STYLES: Record<Tone, { color: string; bg: string; border: string; glow: string }> = {
  neutral: {
    color: "#f8fafc",
    bg: "rgba(255, 255, 255, 0.05)",
    border: "rgba(255, 255, 255, 0.08)",
    glow: "transparent",
  },
  success: {
    color: "#00e599",
    bg: "rgba(0, 229, 153, 0.12)",
    border: "rgba(0, 229, 153, 0.3)",
    glow: "0 0 16px rgba(0, 229, 153, 0.25)",
  },
  warning: {
    color: "#ff8a00",
    bg: "rgba(255, 138, 0, 0.12)",
    border: "rgba(255, 138, 0, 0.3)",
    glow: "0 0 16px rgba(255, 138, 0, 0.25)",
  },
  danger: {
    color: "#ff3b30",
    bg: "rgba(255, 59, 48, 0.12)",
    border: "rgba(255, 59, 48, 0.3)",
    glow: "0 0 16px rgba(255, 59, 48, 0.25)",
  },
  info: {
    color: "#00d2ff",
    bg: "rgba(0, 210, 255, 0.12)",
    border: "rgba(0, 210, 255, 0.3)",
    glow: "0 0 16px rgba(0, 210, 255, 0.25)",
  },
  brand: {
    color: "#00e599",
    bg: "rgba(0, 229, 153, 0.12)",
    border: "rgba(0, 229, 153, 0.3)",
    glow: "0 0 16px rgba(0, 229, 153, 0.25)",
  },
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
      className="relative flex flex-col justify-between w-full overflow-hidden rounded-2xl bg-gradient-to-b from-[#101726] to-[#0b0f19] border border-white/[0.08] p-4 sm:p-5 shadow-xl transition-all duration-200 hover:border-white/[0.18] group"
    >
      {/* Top subtle tone accent line with soft glow */}
      {tone !== "neutral" && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: t.color, boxShadow: t.glow }}
        />
      )}

      <div>
        <div className="flex items-center justify-between gap-1.5 mb-2.5">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 truncate">
            {label}
          </span>
          {icon && (
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
              style={{
                background: t.bg,
                color: t.color,
                border: `1px solid ${t.border}`,
              }}
            >
              {icon}
            </div>
          )}
        </div>

        <div
          className="text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight truncate"
          style={{
            color: tone === "neutral" ? "#f8fafc" : t.color,
            lineHeight: 1.15,
          }}
        >
          {value}
        </div>
      </div>

      {sublabel && (
        <div
          className="text-xs truncate mt-2 font-medium text-slate-400 group-hover:text-slate-300 transition-colors"
          title={sublabel}
        >
          {sublabel}
        </div>
      )}
    </div>
  );
}
