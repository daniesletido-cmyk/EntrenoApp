"use client";

import { useState } from "react";
import { TrendingUp, Sparkles, Check, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export type OverloadRuleType = "double_progression" | "linear" | "rpe_autoregulated";

interface OverloadRulesModalProps {
  open: boolean;
  onClose: () => void;
  exerciseName: string;
  currentWeightKg: number | null;
  targetReps: string;
  onApplyRecommendation: (recommendedWeightKg: number) => void;
}

export function computeOverloadRecommendation(
  rule: OverloadRuleType,
  currentWeightKg: number | null,
  targetReps: string
): { recommendedWeightKg: number; rationale: string } {
  const baseW = currentWeightKg && currentWeightKg > 0 ? currentWeightKg : 60;

  if (rule === "double_progression") {
    // Si completó el rango alto, subir +2.5kg
    const nextW = baseW + 2.5;
    return {
      recommendedWeightKg: nextW,
      rationale: `Doble Progresión: Al alcanzar el techo de repeticiones (${targetReps || "10-12"}) en la sesión anterior, la regla sugiere incrementar +2.5 kg manteniendo el rango bajo (${targetReps.split("-")[0] || "8"} reps).`,
    };
  }

  if (rule === "linear") {
    const nextW = baseW + 1.25;
    return {
      recommendedWeightKg: nextW,
      rationale: `Progresión Lineal Semanal: Incremento de microcarga de +1.25 kg por semana para consolidar adaptaciones neuromusculares continuas.`,
    };
  }

  // RPE autorregulado
  return {
    recommendedWeightKg: baseW,
    rationale: `Autorregulación por RPE/RIR: Mantener ${baseW} kg pero buscando dejar 2 repeticiones en recámara (RIR 2). Si el RIR es > 3 en la 1ª serie, subir +2.5kg sobre la marcha.`,
  };
}

export function OverloadRulesModal({
  open,
  onClose,
  exerciseName,
  currentWeightKg,
  targetReps,
  onApplyRecommendation,
}: OverloadRulesModalProps) {
  const [selectedRule, setSelectedRule] = useState<OverloadRuleType>("double_progression");

  if (!open) return null;

  const rec = computeOverloadRecommendation(selectedRule, currentWeightKg, targetReps);

  return (
    <Modal
      onClose={onClose}
      title="Motor de Sobrecarga Progresiva"
    >
      <div className="grid gap-4">
        <p className="text-xs text-muted" style={{ margin: 0 }}>
          Configura el esquema algorítmico de progresión de cargas para &quot;{exerciseName}&quot;.
        </p>
        <div className="text-xs uppercase font-semibold text-muted">
          Selecciona tu esquema de progresión:
        </div>

        <div className="grid gap-2">
          {/* Regla 1: Doble Progresión */}
          <button
            type="button"
            onClick={() => setSelectedRule("double_progression")}
            className="surface-interactive text-left"
            style={{
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              borderWidth: selectedRule === "double_progression" ? 2 : 1,
              borderColor: selectedRule === "double_progression" ? "var(--color-brand)" : "var(--color-border)",
              backgroundColor: selectedRule === "double_progression" ? "var(--color-surface-hover)" : "var(--color-surface-raised)",
              cursor: "pointer",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm" style={{ color: selectedRule === "double_progression" ? "var(--color-brand)" : "var(--color-text)" }}>
                1. Doble Progresión (Recomendada)
              </span>
              <span className="badge badge-brand" style={{ fontSize: "0.65rem" }}>Hipertrofia</span>
            </div>
            <div className="text-xs text-muted" style={{ marginTop: 4 }}>
              Mantén el peso hasta alcanzar el tope de repeticiones en todas las series (ej. 3x12). Cuando lo logres, sube +2.5 kg y vuelve a la base del rango (ej. 3x8).
            </div>
          </button>

          {/* Regla 2: Progresión Lineal */}
          <button
            type="button"
            onClick={() => setSelectedRule("linear")}
            className="surface-interactive text-left"
            style={{
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              borderWidth: selectedRule === "linear" ? 2 : 1,
              borderColor: selectedRule === "linear" ? "var(--color-brand)" : "var(--color-border)",
              backgroundColor: selectedRule === "linear" ? "var(--color-surface-hover)" : "var(--color-surface-raised)",
              cursor: "pointer",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm" style={{ color: selectedRule === "linear" ? "var(--color-brand)" : "var(--color-text)" }}>
                2. Progresión Lineal Semanal (Microcargas)
              </span>
              <span className="badge badge-neutral" style={{ fontSize: "0.65rem" }}>Fuerza Base</span>
            </div>
            <div className="text-xs text-muted" style={{ marginTop: 4 }}>
              Añade +1.25 kg cada semana si la técnica fue impecable y no alcanzaste el fallo muscular.
            </div>
          </button>

          {/* Regla 3: RPE Autorregulado */}
          <button
            type="button"
            onClick={() => setSelectedRule("rpe_autoregulated")}
            className="surface-interactive text-left"
            style={{
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              borderWidth: selectedRule === "rpe_autoregulated" ? 2 : 1,
              borderColor: selectedRule === "rpe_autoregulated" ? "var(--color-brand)" : "var(--color-border)",
              backgroundColor: selectedRule === "rpe_autoregulated" ? "var(--color-surface-hover)" : "var(--color-surface-raised)",
              cursor: "pointer",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm" style={{ color: selectedRule === "rpe_autoregulated" ? "var(--color-brand)" : "var(--color-text)" }}>
                3. Autorregulación por RIR (Sin Fallo)
              </span>
              <span className="badge badge-warning" style={{ fontSize: "0.65rem" }}>Atleta Híbrido</span>
            </div>
            <div className="text-xs text-muted" style={{ marginTop: 4 }}>
              Ajusta la carga según tu sensación del día dejando 1-2 repeticiones en recámara para no quemar el sistema nervioso de cara a las tiradas de carrera.
            </div>
          </button>
        </div>

        {/* Recomendación calculada */}
        <div
          style={{
            padding: "var(--space-3)",
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">Carga sugerida para la sesión:</span>
            <span className="text-xl font-bold text-success">{rec.recommendedWeightKg} kg</span>
          </div>
          <p className="text-xs text-muted" style={{ marginTop: 6, lineHeight: 1.4 }}>
            {rec.rationale}
          </p>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-2" style={{ marginTop: "var(--space-2)" }}>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onApplyRecommendation(rec.recommendedWeightKg);
              onClose();
            }}
          >
            <Check size={14} />
            <span>Aplicar {rec.recommendedWeightKg} kg</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
