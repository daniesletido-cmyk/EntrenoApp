"use client";

import { useState } from "react";
import { Activity, ShieldCheck, Flame, Info } from "lucide-react";

export interface MuscleFatigue {
  id: string;
  name: string;
  category: "torso" | "brazos" | "piernas" | "core";
  fatiguePct: number; // 0 = 100% recuperado, 100 = máxima fatiga
  lastTrainedHoursAgo: number;
  sources: string[];
}

export function computeMuscleFatigueFromLogs(
  recentGymLogs: Array<{ exerciseName: string; date: string }>,
  recentSessions: Array<{ discipline: string; date: string; duration_min: number | null }>
): Record<string, MuscleFatigue> {
  const now = new Date();
  const getHoursAgo = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00Z");
    return Math.max(0, Math.round((now.getTime() - d.getTime()) / (1000 * 3600)));
  };

  const muscles: Record<string, MuscleFatigue> = {
    pecho: { id: "pecho", name: "Pectorales", category: "torso", fatiguePct: 15, lastTrainedHoursAgo: 72, sources: [] },
    dorsal: { id: "dorsal", name: "Dorsales / Espalda", category: "torso", fatiguePct: 20, lastTrainedHoursAgo: 60, sources: [] },
    hombros: { id: "hombros", name: "Deltoides / Hombros", category: "torso", fatiguePct: 35, lastTrainedHoursAgo: 48, sources: [] },
    biceps: { id: "biceps", name: "Bíceps", category: "brazos", fatiguePct: 10, lastTrainedHoursAgo: 80, sources: [] },
    triceps: { id: "triceps", name: "Tríceps", category: "brazos", fatiguePct: 25, lastTrainedHoursAgo: 50, sources: [] },
    cuadriceps: { id: "cuadriceps", name: "Cuádriceps", category: "piernas", fatiguePct: 40, lastTrainedHoursAgo: 36, sources: [] },
    isquios: { id: "isquios", name: "Isquiotibiales", category: "piernas", fatiguePct: 45, lastTrainedHoursAgo: 30, sources: [] },
    gluteos: { id: "gluteos", name: "Glúteos", category: "piernas", fatiguePct: 30, lastTrainedHoursAgo: 40, sources: [] },
    gemelos: { id: "gemelos", name: "Gemelos & Sóleo", category: "piernas", fatiguePct: 55, lastTrainedHoursAgo: 24, sources: [] },
    core: { id: "core", name: "Core & Abdomen", category: "core", fatiguePct: 20, lastTrainedHoursAgo: 50, sources: [] },
  };

  // 1. Analizar sesiones de running, crossfit y natación
  for (const s of recentSessions) {
    const h = getHoursAgo(s.date);
    if (h > 120) continue; // más de 5 días ya está recuperado

    if (s.discipline === "carrera") {
      muscles.gemelos.lastTrainedHoursAgo = Math.min(muscles.gemelos.lastTrainedHoursAgo, h);
      muscles.gemelos.fatiguePct = Math.min(95, muscles.gemelos.fatiguePct + (h < 36 ? 45 : 20));
      muscles.gemelos.sources.push(`Running (${s.date})`);

      muscles.cuadriceps.lastTrainedHoursAgo = Math.min(muscles.cuadriceps.lastTrainedHoursAgo, h);
      muscles.cuadriceps.fatiguePct = Math.min(90, muscles.cuadriceps.fatiguePct + (h < 36 ? 35 : 15));
      muscles.cuadriceps.sources.push(`Running (${s.date})`);

      muscles.isquios.lastTrainedHoursAgo = Math.min(muscles.isquios.lastTrainedHoursAgo, h);
      muscles.isquios.fatiguePct = Math.min(90, muscles.isquios.fatiguePct + (h < 36 ? 30 : 15));
      muscles.isquios.sources.push(`Running (${s.date})`);
    } else if (s.discipline === "crossfit") {
      muscles.hombros.lastTrainedHoursAgo = Math.min(muscles.hombros.lastTrainedHoursAgo, h);
      muscles.hombros.fatiguePct = Math.min(95, muscles.hombros.fatiguePct + (h < 36 ? 50 : 25));
      muscles.hombros.sources.push(`CrossFit (${s.date})`);

      muscles.core.lastTrainedHoursAgo = Math.min(muscles.core.lastTrainedHoursAgo, h);
      muscles.core.fatiguePct = Math.min(85, muscles.core.fatiguePct + 30);
      muscles.core.sources.push(`CrossFit (${s.date})`);
    } else if (s.discipline === "natacion") {
      muscles.dorsal.lastTrainedHoursAgo = Math.min(muscles.dorsal.lastTrainedHoursAgo, h);
      muscles.dorsal.fatiguePct = Math.min(80, muscles.dorsal.fatiguePct + 25);
      muscles.dorsal.sources.push(`Natación (${s.date})`);

      muscles.hombros.fatiguePct = Math.min(85, muscles.hombros.fatiguePct + 15);
    }
  }

  // 2. Analizar ejercicios de gimnasio
  for (const log of recentGymLogs) {
    const h = getHoursAgo(log.date);
    if (h > 120) continue;
    const name = log.exerciseName.toLowerCase();

    if (name.includes("banca") || name.includes("pecho") || name.includes("aperturas") || name.includes("fondos")) {
      muscles.pecho.lastTrainedHoursAgo = Math.min(muscles.pecho.lastTrainedHoursAgo, h);
      muscles.pecho.fatiguePct = Math.min(95, muscles.pecho.fatiguePct + (h < 36 ? 55 : 25));
      muscles.pecho.sources.push(`${log.exerciseName}`);
      muscles.triceps.fatiguePct = Math.min(90, muscles.triceps.fatiguePct + 20);
    }
    if (name.includes("dominada") || name.includes("jalon") || name.includes("remo")) {
      muscles.dorsal.lastTrainedHoursAgo = Math.min(muscles.dorsal.lastTrainedHoursAgo, h);
      muscles.dorsal.fatiguePct = Math.min(95, muscles.dorsal.fatiguePct + (h < 36 ? 55 : 25));
      muscles.dorsal.sources.push(`${log.exerciseName}`);
      muscles.biceps.fatiguePct = Math.min(85, muscles.biceps.fatiguePct + 20);
    }
    if (name.includes("sentadilla") || name.includes("prensa") || name.includes("extension")) {
      muscles.cuadriceps.lastTrainedHoursAgo = Math.min(muscles.cuadriceps.lastTrainedHoursAgo, h);
      muscles.cuadriceps.fatiguePct = Math.min(95, muscles.cuadriceps.fatiguePct + (h < 36 ? 55 : 30));
      muscles.cuadriceps.sources.push(`${log.exerciseName}`);
    }
    if (name.includes("muerto") || name.includes("curl femoral") || name.includes("hip thrust")) {
      muscles.isquios.lastTrainedHoursAgo = Math.min(muscles.isquios.lastTrainedHoursAgo, h);
      muscles.isquios.fatiguePct = Math.min(95, muscles.isquios.fatiguePct + (h < 36 ? 55 : 30));
      muscles.isquios.sources.push(`${log.exerciseName}`);
      muscles.gluteos.fatiguePct = Math.min(90, muscles.gluteos.fatiguePct + 35);
    }
    if (name.includes("militar") || name.includes("lateral") || name.includes("pajaro")) {
      muscles.hombros.lastTrainedHoursAgo = Math.min(muscles.hombros.lastTrainedHoursAgo, h);
      muscles.hombros.fatiguePct = Math.min(95, muscles.hombros.fatiguePct + (h < 36 ? 50 : 25));
      muscles.hombros.sources.push(`${log.exerciseName}`);
    }
  }

  return muscles;
}

function getFatigueColor(fatiguePct: number) {
  if (fatiguePct >= 65) return "#ef4444"; // Alta fatiga / recién entrenado
  if (fatiguePct >= 35) return "#f59e0b"; // Recuperando
  return "#10b981"; // Recuperado 100%
}

function getRecoveryStatus(fatiguePct: number) {
  if (fatiguePct >= 65) return { label: "Fatiga aguda (<36h)", tone: "danger", recoveryPct: Math.round(100 - fatiguePct) };
  if (fatiguePct >= 35) return { label: "En recuperación (48-72h)", tone: "warning", recoveryPct: Math.round(100 - fatiguePct) };
  return { label: "Recuperado 100%", tone: "success", recoveryPct: 100 };
}

interface MuscleHeatmapProps {
  fatigueData?: Record<string, MuscleFatigue>;
}

export function MuscleHeatmap({ fatigueData }: MuscleHeatmapProps) {
  const [selectedMuscleId, setSelectedMuscleId] = useState<string>("pecho");

  const data = fatigueData ?? {
    pecho: { id: "pecho", name: "Pectorales", category: "torso", fatiguePct: 15, lastTrainedHoursAgo: 72, sources: ["Press banca"] },
    dorsal: { id: "dorsal", name: "Dorsales / Espalda", category: "torso", fatiguePct: 20, lastTrainedHoursAgo: 60, sources: ["Remo con barra"] },
    hombros: { id: "hombros", name: "Deltoides", category: "torso", fatiguePct: 68, lastTrainedHoursAgo: 18, sources: ["CrossFit WOD", "Press militar"] },
    biceps: { id: "biceps", name: "Bíceps", category: "brazos", fatiguePct: 15, lastTrainedHoursAgo: 72, sources: [] },
    triceps: { id: "triceps", name: "Tríceps", category: "brazos", fatiguePct: 20, lastTrainedHoursAgo: 60, sources: [] },
    cuadriceps: { id: "cuadriceps", name: "Cuádriceps", category: "piernas", fatiguePct: 55, lastTrainedHoursAgo: 24, sources: ["Running R1", "Sentadilla"] },
    isquios: { id: "isquios", name: "Isquiotibiales", category: "piernas", fatiguePct: 40, lastTrainedHoursAgo: 48, sources: ["Peso muerto"] },
    gluteos: { id: "gluteos", name: "Glúteos", category: "piernas", fatiguePct: 30, lastTrainedHoursAgo: 48, sources: [] },
    gemelos: { id: "gemelos", name: "Gemelos & Sóleo", category: "piernas", fatiguePct: 75, lastTrainedHoursAgo: 16, sources: ["Running R1"] },
    core: { id: "core", name: "Core & Abdomen", category: "core", fatiguePct: 30, lastTrainedHoursAgo: 48, sources: ["CrossFit WOD"] },
  };

  const selectedMuscle = data[selectedMuscleId] ?? data["pecho"];
  const status = getRecoveryStatus(selectedMuscle.fatiguePct);

  return (
    <div className="surface" style={{ padding: "var(--space-4)", borderRadius: "var(--radius-lg)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2" style={{ marginBottom: "var(--space-3)" }}>
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-brand" />
          <h3 className="font-bold text-sm">Mapa de Calor Muscular & Recuperación Híbrida</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#10b981" }} />
            <span className="text-muted">100% Recuperado</span>
          </div>
          <div className="flex items-center gap-1">
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#f59e0b" }} />
            <span className="text-muted">En recuperación</span>
          </div>
          <div className="flex items-center gap-1">
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ef4444" }} />
            <span className="text-muted">Fatiga aguda</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 items-center">
        {/* Diagrama Anatómico Frontal y Dorsal */}
        <div
          style={{
            padding: "var(--space-3)",
            backgroundColor: "#070b14",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
          }}
        >
          {/* Vista Frontal */}
          <div className="flex flex-col items-center">
            <span className="text-xs uppercase font-semibold text-muted" style={{ marginBottom: 6 }}>
              Vista Frontal
            </span>
            <svg width="120" height="230" viewBox="0 0 120 230" style={{ overflow: "visible" }}>
              {/* Cabeza */}
              <circle cx="60" cy="18" r="12" fill="#334155" />

              {/* Hombros (Deltoides) */}
              <path
                d="M 32 36 Q 40 32 48 38 L 46 54 L 32 50 Z"
                fill={getFatigueColor(data.hombros.fatiguePct)}
                onClick={() => setSelectedMuscleId("hombros")}
                style={{ cursor: "pointer", transition: "all 0.2s" }}
                stroke={selectedMuscleId === "hombros" ? "#ffffff" : "none"}
                strokeWidth={2}
              />
              <path
                d="M 88 36 Q 80 32 72 38 L 74 54 L 88 50 Z"
                fill={getFatigueColor(data.hombros.fatiguePct)}
                onClick={() => setSelectedMuscleId("hombros")}
                style={{ cursor: "pointer", transition: "all 0.2s" }}
                stroke={selectedMuscleId === "hombros" ? "#ffffff" : "none"}
                strokeWidth={2}
              />

              {/* Pectorales */}
              <path
                d="M 44 42 Q 60 40 60 52 L 44 56 Z"
                fill={getFatigueColor(data.pecho.fatiguePct)}
                onClick={() => setSelectedMuscleId("pecho")}
                style={{ cursor: "pointer" }}
                stroke={selectedMuscleId === "pecho" ? "#ffffff" : "none"}
                strokeWidth={2}
              />
              <path
                d="M 76 42 Q 60 40 60 52 L 76 56 Z"
                fill={getFatigueColor(data.pecho.fatiguePct)}
                onClick={() => setSelectedMuscleId("pecho")}
                style={{ cursor: "pointer" }}
                stroke={selectedMuscleId === "pecho" ? "#ffffff" : "none"}
                strokeWidth={2}
              />

              {/* Bíceps */}
              <rect
                x="28"
                y="54"
                width="12"
                height="24"
                rx="5"
                fill={getFatigueColor(data.biceps.fatiguePct)}
                onClick={() => setSelectedMuscleId("biceps")}
                style={{ cursor: "pointer" }}
                stroke={selectedMuscleId === "biceps" ? "#ffffff" : "none"}
                strokeWidth={2}
              />
              <rect
                x="80"
                y="54"
                width="12"
                height="24"
                rx="5"
                fill={getFatigueColor(data.biceps.fatiguePct)}
                onClick={() => setSelectedMuscleId("biceps")}
                style={{ cursor: "pointer" }}
                stroke={selectedMuscleId === "biceps" ? "#ffffff" : "none"}
                strokeWidth={2}
              />

              {/* Core / Abdomen */}
              <rect
                x="48"
                y="58"
                width="24"
                height="34"
                rx="4"
                fill={getFatigueColor(data.core.fatiguePct)}
                onClick={() => setSelectedMuscleId("core")}
                style={{ cursor: "pointer" }}
                stroke={selectedMuscleId === "core" ? "#ffffff" : "none"}
                strokeWidth={2}
              />

              {/* Cuádriceps */}
              <path
                d="M 42 100 Q 56 98 56 142 L 42 142 Z"
                fill={getFatigueColor(data.cuadriceps.fatiguePct)}
                onClick={() => setSelectedMuscleId("cuadriceps")}
                style={{ cursor: "pointer" }}
                stroke={selectedMuscleId === "cuadriceps" ? "#ffffff" : "none"}
                strokeWidth={2}
              />
              <path
                d="M 78 100 Q 64 98 64 142 L 78 142 Z"
                fill={getFatigueColor(data.cuadriceps.fatiguePct)}
                onClick={() => setSelectedMuscleId("cuadriceps")}
                style={{ cursor: "pointer" }}
                stroke={selectedMuscleId === "cuadriceps" ? "#ffffff" : "none"}
                strokeWidth={2}
              />

              {/* Gemelos (anterior / tibiales) */}
              <rect
                x="44"
                y="152"
                width="10"
                height="42"
                rx="4"
                fill={getFatigueColor(data.gemelos.fatiguePct)}
                onClick={() => setSelectedMuscleId("gemelos")}
                style={{ cursor: "pointer" }}
                stroke={selectedMuscleId === "gemelos" ? "#ffffff" : "none"}
                strokeWidth={2}
              />
              <rect
                x="66"
                y="152"
                width="10"
                height="42"
                rx="4"
                fill={getFatigueColor(data.gemelos.fatiguePct)}
                onClick={() => setSelectedMuscleId("gemelos")}
                style={{ cursor: "pointer" }}
                stroke={selectedMuscleId === "gemelos" ? "#ffffff" : "none"}
                strokeWidth={2}
              />
            </svg>
          </div>

          {/* Vista Dorsal / Posterior */}
          <div className="flex flex-col items-center">
            <span className="text-xs uppercase font-semibold text-muted" style={{ marginBottom: 6 }}>
              Vista Dorsal
            </span>
            <svg width="120" height="230" viewBox="0 0 120 230" style={{ overflow: "visible" }}>
              <circle cx="60" cy="18" r="12" fill="#334155" />

              {/* Dorsales / Espalda Alta */}
              <path
                d="M 40 36 L 80 36 L 74 62 L 46 62 Z"
                fill={getFatigueColor(data.dorsal.fatiguePct)}
                onClick={() => setSelectedMuscleId("dorsal")}
                style={{ cursor: "pointer" }}
                stroke={selectedMuscleId === "dorsal" ? "#ffffff" : "none"}
                strokeWidth={2}
              />
              <path
                d="M 44 64 L 76 64 L 68 88 L 52 88 Z"
                fill={getFatigueColor(data.dorsal.fatiguePct)}
                onClick={() => setSelectedMuscleId("dorsal")}
                style={{ cursor: "pointer" }}
                stroke={selectedMuscleId === "dorsal" ? "#ffffff" : "none"}
                strokeWidth={2}
              />

              {/* Tríceps */}
              <rect
                x="28"
                y="48"
                width="10"
                height="28"
                rx="4"
                fill={getFatigueColor(data.triceps.fatiguePct)}
                onClick={() => setSelectedMuscleId("triceps")}
                style={{ cursor: "pointer" }}
                stroke={selectedMuscleId === "triceps" ? "#ffffff" : "none"}
                strokeWidth={2}
              />
              <rect
                x="82"
                y="48"
                width="10"
                height="28"
                rx="4"
                fill={getFatigueColor(data.triceps.fatiguePct)}
                onClick={() => setSelectedMuscleId("triceps")}
                style={{ cursor: "pointer" }}
                stroke={selectedMuscleId === "triceps" ? "#ffffff" : "none"}
                strokeWidth={2}
              />

              {/* Glúteos */}
              <rect
                x="44"
                y="94"
                width="15"
                height="20"
                rx="4"
                fill={getFatigueColor(data.gluteos.fatiguePct)}
                onClick={() => setSelectedMuscleId("gluteos")}
                style={{ cursor: "pointer" }}
                stroke={selectedMuscleId === "gluteos" ? "#ffffff" : "none"}
                strokeWidth={2}
              />
              <rect
                x="61"
                y="94"
                width="15"
                height="20"
                rx="4"
                fill={getFatigueColor(data.gluteos.fatiguePct)}
                onClick={() => setSelectedMuscleId("gluteos")}
                style={{ cursor: "pointer" }}
                stroke={selectedMuscleId === "gluteos" ? "#ffffff" : "none"}
                strokeWidth={2}
              />

              {/* Isquiosurales */}
              <rect
                x="44"
                y="118"
                width="14"
                height="26"
                rx="4"
                fill={getFatigueColor(data.isquios.fatiguePct)}
                onClick={() => setSelectedMuscleId("isquios")}
                style={{ cursor: "pointer" }}
                stroke={selectedMuscleId === "isquios" ? "#ffffff" : "none"}
                strokeWidth={2}
              />
              <rect
                x="62"
                y="118"
                width="14"
                height="26"
                rx="4"
                fill={getFatigueColor(data.isquios.fatiguePct)}
                onClick={() => setSelectedMuscleId("isquios")}
                style={{ cursor: "pointer" }}
                stroke={selectedMuscleId === "isquios" ? "#ffffff" : "none"}
                strokeWidth={2}
              />

              {/* Gemelos & Sóleo */}
              <rect
                x="44"
                y="152"
                width="14"
                height="42"
                rx="5"
                fill={getFatigueColor(data.gemelos.fatiguePct)}
                onClick={() => setSelectedMuscleId("gemelos")}
                style={{ cursor: "pointer" }}
                stroke={selectedMuscleId === "gemelos" ? "#ffffff" : "none"}
                strokeWidth={2}
              />
              <rect
                x="62"
                y="152"
                width="14"
                height="42"
                rx="5"
                fill={getFatigueColor(data.gemelos.fatiguePct)}
                onClick={() => setSelectedMuscleId("gemelos")}
                style={{ cursor: "pointer" }}
                stroke={selectedMuscleId === "gemelos" ? "#ffffff" : "none"}
                strokeWidth={2}
              />
            </svg>
          </div>
        </div>

        {/* Panel de Detalle del Grupo Muscular Seleccionado */}
        <div className="surface-raised" style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <span className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
              {selectedMuscle.name}
            </span>
            <span
              className={`badge badge-${status.tone}`}
              style={{ fontSize: "0.72rem", padding: "2px 8px" }}
            >
              {status.label}
            </span>
          </div>

          <div className="text-xs text-muted" style={{ marginBottom: 12 }}>
            Recuperación estimada: <strong style={{ color: "var(--color-text)" }}>{status.recoveryPct}%</strong> · Último estímulo hace{" "}
            <strong>{selectedMuscle.lastTrainedHoursAgo}h</strong>
          </div>

          {/* Barra de progreso */}
          <div
            style={{
              width: "100%",
              height: 7,
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              borderRadius: 999,
              overflow: "hidden",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                width: `${status.recoveryPct}%`,
                height: "100%",
                backgroundColor: getFatigueColor(selectedMuscle.fatiguePct),
                transition: "width 0.3s ease",
              }}
            />
          </div>

          <div className="text-xs uppercase font-semibold text-muted" style={{ marginBottom: 6 }}>
            Actividades que han impactado este grupo:
          </div>
          {selectedMuscle.sources.length === 0 ? (
            <div className="text-xs text-faint italic">Sin impacto significativo en las últimas 72 horas. Plena disponibilidad de carga.</div>
          ) : (
            <ul className="grid gap-1 text-xs" style={{ paddingLeft: 4 }}>
              {selectedMuscle.sources.map((src, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-brand font-bold">•</span>
                  <span>{src}</span>
                </li>
              ))}
            </ul>
          )}

          <div
            style={{
              padding: "var(--space-2) var(--space-3)",
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border)",
              marginTop: 12,
              fontSize: "0.72rem",
              color: "var(--color-text-muted)",
              lineHeight: 1.4,
            }}
          >
            <strong>Pauta de entrenamiento:</strong>{" "}
            {selectedMuscle.fatiguePct >= 65
              ? "Evita llevar este músculo al fallo hoy. Mantén RIR 3 o sustituye por un ejercicio accesorio guiado."
              : selectedMuscle.fatiguePct >= 35
              ? "Capacidad moderada. Puedes trabajar con cargas de fuerza manteniendo 1-2 repeticiones en recámara."
              : "Luz verde total. Depósito neuromuscular recuperado para aplicar sobrecarga progresiva."}
          </div>
        </div>
      </div>
    </div>
  );
}
