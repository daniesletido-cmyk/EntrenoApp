"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, ShieldAlert, Info, Wand2, Moon, Footprints } from "lucide-react";
import { weekStartOf, todayISO, addDays } from "@/lib/dates";
import WeekSwitcher from "@/components/week-switcher";
import { PageHeader } from "@/components/ui/page-header";
import { Loading } from "@/components/ui/loading";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

interface ProposedChange {
  sessionId: number;
  date: string;
  discipline: string;
  plannedCode: string | null;
  action: "quitar_tirada_larga" | "convertir_descanso";
  reason: string;
}

interface AutoAdjustPreview {
  applicable: boolean;
  reason: string;
  changes: ProposedChange[];
}

const DISCIPLINE_LABEL: Record<string, string> = {
  carrera: "Carrera",
  gimnasio: "Gimnasio",
  natacion: "Natación",
  crossfit: "CrossFit",
  otro: "Otro",
};

interface Flag {
  severity: "info" | "aviso" | "alerta_medica";
  title: string;
  detail: string;
}

interface Recommendation {
  weekStart: string;
  compliancePct: number | null;
  rpeAvg: number | null;
  sleepHoursAvg: number | null;
  sleepQualityAvg: number | null;
  acwr: number | null;
  flags: Flag[];
  action: "mantener" | "reducir" | "alerta_medica";
  summary: string;
}

const SEVERITY_META: Record<Flag["severity"], { tone: "info" | "warning" | "danger"; icon: React.ReactNode; label: string }> = {
  info: { tone: "info", icon: <Info size={16} />, label: "Información" },
  aviso: { tone: "warning", icon: <AlertTriangle size={16} />, label: "Aviso" },
  alerta_medica: { tone: "danger", icon: <ShieldAlert size={16} />, label: "Alerta médica" },
};

const ACTION_META: Record<Recommendation["action"], { tone: "success" | "warning" | "danger"; icon: React.ReactNode; label: string }> = {
  mantener: { tone: "success", icon: <CheckCircle2 size={20} />, label: "Mantener el plan" },
  reducir: { tone: "warning", icon: <AlertTriangle size={20} />, label: "Ajustar / reducir carga" },
  alerta_medica: { tone: "danger", icon: <ShieldAlert size={20} />, label: "Parar y consultar médicamente" },
};

const TONE_STYLE = {
  success: { bg: "var(--color-success-bg)", color: "var(--color-success)" },
  warning: { bg: "var(--color-warning-bg)", color: "var(--color-warning)" },
  danger: { bg: "var(--color-danger-bg)", color: "var(--color-danger)" },
  info: { bg: "var(--color-info-bg)", color: "var(--color-info)" },
};

export default function RecomendacionesPage() {
  const [weekStart, setWeekStart] = useState(weekStartOf(todayISO()));
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [adjustment, setAdjustment] = useState<AutoAdjustPreview | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const toast = useToast();

  const loadAdjustment = useCallback(() => {
    fetch(`/api/recommendations/auto-adjust?week=${weekStart}`)
      .then((r) => r.json())
      .then(setAdjustment);
  }, [weekStart]);

  useEffect(() => {
    setLoading(true);
    setApplied(false);
    fetch(`/api/recommendations?week=${weekStart}`)
      .then((r) => r.json())
      .then(setRec)
      .finally(() => setLoading(false));
    loadAdjustment();
  }, [weekStart, loadAdjustment]);

  function requestApplyAdjustment() {
    if (!adjustment) return;
    setConfirmOpen(true);
  }

  async function executeApplyAdjustment() {
    if (!adjustment) return;
    setConfirmOpen(false);
    setApplying(true);
    try {
      await fetch(`/api/recommendations/auto-adjust?week=${weekStart}`, { method: "POST" });
      setApplied(true);
      toast.push("success", `${adjustment.changes.length} sesión(es) ajustadas para la semana que viene`);
      loadAdjustment();
    } finally {
      setApplying(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Recomendaciones"
        description="Ajuste automático de la semana según carga, sueño y notas de molestias — nunca sustituye a un médico."
      />
      <WeekSwitcher weekStart={weekStart} onChange={setWeekStart} />

      {loading && <Loading label="Calculando recomendación…" />}

      {!loading && rec && (
        <div className="animate-in grid gap-4">
          <div
            className="flex items-start gap-3"
            style={{ borderRadius: "var(--radius-lg)", padding: "var(--space-4)", background: TONE_STYLE[ACTION_META[rec.action].tone].bg }}
          >
            <span style={{ color: TONE_STYLE[ACTION_META[rec.action].tone].color, flexShrink: 0 }}>
              {ACTION_META[rec.action].icon}
            </span>
            <div>
              <div className="font-semibold" style={{ color: TONE_STYLE[ACTION_META[rec.action].tone].color }}>
                {ACTION_META[rec.action].label}
              </div>
              <p className="text-sm text-muted" style={{ marginTop: 2 }}>
                {rec.summary}
              </p>
            </div>
          </div>

          {rec.flags.length > 0 && (
            <div className="grid gap-3">
              {rec.flags.map((f, i) => {
                const meta = SEVERITY_META[f.severity];
                return (
                  <div key={i} className="surface" style={{ padding: "var(--space-4)" }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: "var(--space-2)" }}>
                      <span style={{ color: TONE_STYLE[meta.tone].color }}>{meta.icon}</span>
                      <span className="badge" style={{ background: TONE_STYLE[meta.tone].bg, color: TONE_STYLE[meta.tone].color }}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="font-semibold text-sm">{f.title}</div>
                    <p className="text-sm text-muted" style={{ marginTop: 2 }}>
                      {f.detail}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {adjustment && adjustment.applicable && (
            <div className="surface" style={{ padding: "var(--space-4)", borderColor: "var(--color-brand)" }}>
              <div className="flex items-center gap-2 font-semibold text-sm" style={{ marginBottom: "var(--space-2)" }}>
                <Wand2 size={16} />
                Ajuste automático disponible para la semana que viene
              </div>
              <div className="grid gap-2" style={{ marginBottom: "var(--space-3)" }}>
                {adjustment.changes.map((c, i) => (
                  <div key={i} className="surface-raised flex items-start gap-2 text-sm" style={{ padding: "var(--space-2) var(--space-3)" }}>
                    {c.action === "quitar_tirada_larga" ? <Footprints size={15} className="text-muted" style={{ marginTop: 2, flexShrink: 0 }} /> : <Moon size={15} className="text-muted" style={{ marginTop: 2, flexShrink: 0 }} />}
                    <div>
                      <div className="font-medium">
                        {c.date} · {DISCIPLINE_LABEL[c.discipline] ?? c.discipline}
                        {c.plannedCode ? ` ${c.plannedCode}` : ""}
                      </div>
                      <div className="text-muted">{c.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="primary" loading={applying} disabled={applied} onClick={requestApplyAdjustment}>
                <Wand2 size={15} />
                {applied ? "Aplicado" : "Aplicar ajuste automático"}
              </Button>
              <p className="text-xs text-faint" style={{ marginTop: "var(--space-2)" }}>
                Solo toca sesiones pendientes de la semana siguiente. Nunca cancela carrera ni natación, y cada
                sesión tocada queda con una nota explicando el motivo — puedes deshacerlo a mano en Plan semanal.
              </p>
            </div>
          )}

          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
            <StatCard label="Cumplimiento" value={rec.compliancePct !== null ? `${rec.compliancePct.toFixed(0)}%` : "—"} />
            <StatCard label="RPE medio" value={rec.rpeAvg !== null ? rec.rpeAvg.toFixed(1) : "—"} />
            <StatCard label="ACWR" value={rec.acwr !== null ? rec.acwr.toFixed(2) : "—"} sublabel="Carga aguda:crónica" />
            <StatCard
              label="Sueño"
              value={rec.sleepHoursAvg !== null ? `${rec.sleepHoursAvg.toFixed(1)}h` : "—"}
              sublabel={rec.sleepQualityAvg !== null ? `Calidad ${rec.sleepQualityAvg.toFixed(1)}/5` : undefined}
            />
          </div>

          <p className="text-xs text-faint">
            Basado en reglas generales de gestión de carga (RPE×duración, ratio de carga aguda:crónica, sueño) y en tu
            perfil (entrenas por ritmo/RPE, no por pulso). No sustituye la valoración de un médico o entrenador ante
            una lesión o síntoma real.
          </p>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Aplicar ajuste automático"
        description={
          adjustment
            ? `Se aplicarán los siguientes cambios a la semana del ${addDays(weekStart, 7)}:\n\n${adjustment.changes
                .map((c) => `• ${c.date} (${DISCIPLINE_LABEL[c.discipline] ?? c.discipline}${c.plannedCode ? " " + c.plannedCode : ""}): ${c.reason}`)
                .join("\n")}`
            : ""
        }
        confirmLabel="Aplicar cambios"
        tone="warning"
        loading={applying}
        onConfirm={executeApplyAdjustment}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
