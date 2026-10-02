"use client";

import { useState } from "react";
import { ArrowLeftRight, Check, Sparkles, X, ShieldAlert, Dumbbell } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export interface SwapAlternative {
  name: string;
  category: string;
  ratio: number; // Factor to multiply previous weight
  ratioDesc: string;
  rationale: string;
  isDumbbellPair?: boolean;
}

export const BIOMECHANICAL_SWAP_CATALOG: Record<string, SwapAlternative[]> = {
  // Pectoral / Empuje Horizontal
  "press banca": [
    {
      name: "Press con mancuernas en banco plano",
      category: "Peso libre / Mancuernas",
      ratio: 0.38,
      ratioDesc: "Peso por cada mancuerna (ej. 80kg barra ≈ 30kg c/u)",
      rationale: "Mismo vector de empuje horizontal. Mayor rango de recorrido y libertad de rotación en hombros.",
      isDumbbellPair: true,
    },
    {
      name: "Press en máquina convergente",
      category: "Máquina guiada",
      ratio: 0.95,
      ratioDesc: "Carga total en placas equivalente",
      rationale: "Aislamiento pectoral máximo con trayectoria guiada estable y menor fatiga estabilizadora.",
    },
    {
      name: "Fondos en paralelas con peso corporal",
      category: "Calistenia lastrada",
      ratio: 0.7,
      ratioDesc: "Peso corporal o con lastre",
      rationale: "Gran activación de pectoral inferior y tríceps con alta demanda neuromuscular.",
    },
  ],
  "press inclinado": [
    {
      name: "Press inclinado con mancuernas (30°)",
      category: "Peso libre / Mancuernas",
      ratio: 0.36,
      ratioDesc: "Peso por cada mancuerna (ej. 70kg barra ≈ 25kg c/u)",
      rationale: "Foco en haz clavicular del pectoral con mayor rango y protección del manguito rotador.",
      isDumbbellPair: true,
    },
    {
      name: "Press inclinado en máquina Smith",
      category: "Máquina guiada",
      ratio: 0.92,
      ratioDesc: "Carga total en barra guiada",
      rationale: "Permite trabajar muy cerca del fallo con total seguridad sin necesitar spotter.",
    },
  ],

  // Cuádriceps / Empuje Piernas
  "sentadilla": [
    {
      name: "Prensa de piernas 45°",
      category: "Máquina guiada",
      ratio: 1.45,
      ratioDesc: "Carga en discos (+45% respecto a barra)",
      rationale: "Misma demanda de cuádriceps y glúteo eliminando la compresión axial en columna lumbar.",
    },
    {
      name: "Sentadilla búlgara con mancuernas",
      category: "Unilateral / Mancuernas",
      ratio: 0.22,
      ratioDesc: "Peso por mancuerna en cada mano",
      rationale: "Corrección de asimetrías pélvicas y gran transferencia a la zancada de carrera.",
      isDumbbellPair: true,
    },
    {
      name: "Hack Squat en máquina",
      category: "Máquina guiada",
      ratio: 1.1,
      ratioDesc: "Carga guiada con soporte dorsal",
      rationale: "Máximo estímulo en vasto lateral y recto femoral sin esfuerzo en erectores espinales.",
    },
  ],
  "prensa": [
    {
      name: "Sentadilla Goblet con mancuerna",
      category: "Peso libre",
      ratio: 0.35,
      ratioDesc: "Mancuerna única al pecho",
      rationale: "Excelente verticalidad del torso y gran trabajo de cuádriceps y movilidad de cadera.",
    },
    {
      name: "Sentadilla búlgara",
      category: "Unilateral",
      ratio: 0.25,
      ratioDesc: "Mancuernas en ambas manos",
      rationale: "Estímulo de cuádriceps de alta intensidad sin necesidad de cargar peso excesivo.",
      isDumbbellPair: true,
    },
  ],

  // Espalda / Tracción
  "dominadas": [
    {
      name: "Jalón al pecho en polea con agarre neutro",
      category: "Poleas",
      ratio: 0.85,
      ratioDesc: "Placas en polea alta",
      rationale: "Mismo patrón de tracción vertical permitiendo modular la carga exacta según fatiga.",
    },
    {
      name: "Remo en polea baja (Gironda)",
      category: "Poleas",
      ratio: 0.9,
      ratioDesc: "Tracción horizontal",
      rationale: "Menor estrés sobre el bíceps braquial y gran densidad en dorsal medio.",
    },
  ],
  "jalón": [
    {
      name: "Dominadas asistidas con elástico o máquina",
      category: "Peso corporal / Asistido",
      ratio: 0.8,
      ratioDesc: "Porcentaje de peso corporal",
      rationale: "Patrón vertical estricto con activación plena del core y serratos.",
    },
    {
      name: "Remo con mancuerna a una mano apoyado",
      category: "Unilateral / Mancuerna",
      ratio: 0.45,
      ratioDesc: "Peso de la mancuerna individual",
      rationale: "Permite traccionar hasta la cadera aislando el dorsal sin sobrecarga lumbar.",
    },
  ],
  "remo": [
    {
      name: "Remo en máquina T-Bar o pecho apoyado",
      category: "Máquina con soporte torácico",
      ratio: 0.9,
      ratioDesc: "Carga con soporte de pecho",
      rationale: "Elimina por completo la fatiga en zona lumbar, ideal si mañana toca tirada de running.",
    },
    {
      name: "Remo con mancuernas en banco inclinado",
      category: "Peso libre / Mancuernas",
      ratio: 0.38,
      ratioDesc: "Peso por mancuerna",
      rationale: "Aislamiento de retractores escapulares y trapecio medio con cero inercia.",
      isDumbbellPair: true,
    },
  ],

  // Cadena Posterior / Isquios / Glúteos
  "peso muerto": [
    {
      name: "Peso muerto rumano con mancuernas",
      category: "Peso libre / Mancuernas",
      ratio: 0.65,
      ratioDesc: "Suma de mancuernas (~32% c/u)",
      rationale: "Máximo estiramiento de isquiotibiales con menor compresión vertebral que el convencional.",
      isDumbbellPair: true,
    },
    {
      name: "Hip Thrust con barra o máquina",
      category: "Glúteos / Cadera",
      ratio: 1.15,
      ratioDesc: "Carga total en pelvis",
      rationale: "Pico de activación máxima en glúteo mayor sin carga excéntrica pesada en isquios.",
    },
  ],

  // Hombros / Empuje Vertical
  "press militar": [
    {
      name: "Press sentado con mancuernas",
      category: "Peso libre / Mancuernas",
      ratio: 0.35,
      ratioDesc: "Peso por cada mancuerna (ej. 50kg barra ≈ 18kg c/u)",
      rationale: "Banco con respaldo elimina hiperextensión lumbar y permite trayectoria natural de codos.",
      isDumbbellPair: true,
    },
    {
      name: "Press de hombros en máquina convergente",
      category: "Máquina guiada",
      ratio: 0.85,
      ratioDesc: "Carga total en placas",
      rationale: "Tensión constante en deltoides anterior y lateral sin necesidad de equilibrio.",
    },
  ],

  // Brazos
  "curl": [
    {
      name: "Curl con mancuernas en banco inclinado",
      category: "Mancuernas",
      ratio: 0.35,
      ratioDesc: "Peso por mancuerna",
      rationale: "Máximo estiramiento de cabeza larga del bíceps para hipertrofia óptima.",
      isDumbbellPair: true,
    },
    {
      name: "Curl en polea baja con barra recta o cuerda",
      category: "Poleas",
      ratio: 0.85,
      ratioDesc: "Carga en polea",
      rationale: "Tensión mecánica continua en todo el rango de flexión de codo.",
    },
  ],
  "tríceps": [
    {
      name: "Extensión de tríceps en polea alta con cuerda",
      category: "Poleas",
      ratio: 0.75,
      ratioDesc: "Carga en placas",
      rationale: "Permite separar la cuerda al final para máxima contracción de cabeza lateral.",
    },
    {
      name: "Press francés con barra Z o mancuernas",
      category: "Peso libre",
      ratio: 0.8,
      ratioDesc: "Carga total en barra Z",
      rationale: "Gran estímulo excéntrico en la cabeza larga del tríceps.",
    },
  ],
};

export function findSwapOptions(exerciseName: string): SwapAlternative[] {
  const norm = exerciseName.toLowerCase();
  for (const [key, list] of Object.entries(BIOMECHANICAL_SWAP_CATALOG)) {
    if (norm.includes(key)) {
      return list;
    }
  }
  // Alternativas genéricas según palabras clave
  if (norm.includes("banca") || norm.includes("pecho") || norm.includes("push")) {
    return BIOMECHANICAL_SWAP_CATALOG["press banca"];
  }
  if (norm.includes("sentadilla") || norm.includes("squat") || norm.includes("pierna") || norm.includes("cuadriceps")) {
    return BIOMECHANICAL_SWAP_CATALOG["sentadilla"];
  }
  if (norm.includes("jalon") || norm.includes("espalda") || norm.includes("pull") || norm.includes("dominada")) {
    return BIOMECHANICAL_SWAP_CATALOG["dominadas"];
  }
  if (norm.includes("militar") || norm.includes("hombro") || norm.includes("press vertical")) {
    return BIOMECHANICAL_SWAP_CATALOG["press militar"];
  }
  if (norm.includes("muerto") || norm.includes("isquio") || norm.includes("femoral")) {
    return BIOMECHANICAL_SWAP_CATALOG["peso muerto"];
  }
  return [
    {
      name: `${exerciseName} (Variante con Mancuernas)`,
      category: "Mancuernas / Peso libre",
      ratio: 0.4,
      ratioDesc: "Peso estimado por mancuerna",
      rationale: "Alternativa con peso libre para no frenar la sesión si la máquina está ocupada.",
      isDumbbellPair: true,
    },
    {
      name: `${exerciseName} (Variante en Polea)`,
      category: "Polea guiada",
      ratio: 0.9,
      ratioDesc: "Carga equivalente en polea",
      rationale: "Tensión mecánica constante con trayectoria segura.",
    },
  ];
}

interface SmartSwapModalProps {
  open: boolean;
  onClose: () => void;
  originalExerciseName: string;
  currentWeightKg: number | null;
  onApplySwap: (newExerciseName: string, suggestedWeightKg: number | null) => void;
}

export function SmartSwapModal({
  open,
  onClose,
  originalExerciseName,
  currentWeightKg,
  onApplySwap,
}: SmartSwapModalProps) {
  const alternatives = findSwapOptions(originalExerciseName);
  const [selectedAlt, setSelectedAlt] = useState<SwapAlternative>(alternatives[0]);

  if (!open) return null;

  const currentW = currentWeightKg && currentWeightKg > 0 ? currentWeightKg : 50;
  const convertedWeight = Math.round((currentW * selectedAlt.ratio) * 2) / 2; // redondear a 0.5kg

  return (
    <Modal
      onClose={onClose}
      title="Smart Swap · Sustitución Inteligente"
    >
      <div className="grid gap-3">
        <p className="text-xs text-muted" style={{ margin: 0 }}>
          ¿Máquina ocupada o molestia articular? Sustituye &quot;{originalExerciseName}&quot; por una variante biomecánicamente equivalente.
        </p>
        <div className="text-xs uppercase font-semibold text-muted">
          Alternativas Equivalentes (Mismo Patrón Motor):
        </div>

        <div className="grid gap-2">
          {alternatives.map((alt, idx) => {
            const isSel = selectedAlt.name === alt.name;
            const calcW = Math.round((currentW * alt.ratio) * 2) / 2;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedAlt(alt)}
                className="surface-interactive text-left"
                style={{
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  borderWidth: isSel ? 2 : 1,
                  borderColor: isSel ? "var(--color-brand)" : "var(--color-border)",
                  backgroundColor: isSel ? "var(--color-surface-hover)" : "var(--color-surface-raised)",
                  cursor: "pointer",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-sm" style={{ color: isSel ? "var(--color-brand)" : "var(--color-text)" }}>
                    {alt.name}
                  </div>
                  <span className="badge badge-neutral" style={{ fontSize: "0.65rem" }}>
                    {alt.category}
                  </span>
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                  {alt.rationale}
                </div>
                <div className="flex items-center gap-2" style={{ marginTop: 6, fontSize: "0.72rem" }}>
                  <span className="text-brand font-semibold">
                    Carga sugerida: {calcW} kg {alt.isDumbbellPair ? "por mancuerna" : "total"}
                  </span>
                  <span className="text-faint">({alt.ratioDesc})</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Resumen de conversión de carga */}
        <div
          style={{
            padding: "var(--space-3)",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(59, 130, 246, 0.06)",
            border: "1px solid rgba(59, 130, 246, 0.2)",
            marginTop: "var(--space-2)",
          }}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Ejercicio original:</span>
            <span className="font-semibold">{originalExerciseName} ({currentWeightKg ? `${currentWeightKg} kg` : "Sin peso"})</span>
          </div>
          <div className="flex items-center justify-between text-xs" style={{ marginTop: 4 }}>
            <span className="text-muted">Nuevo ejercicio:</span>
            <strong className="text-brand">{selectedAlt.name}</strong>
          </div>
          <div className="flex items-center justify-between text-xs" style={{ marginTop: 4 }}>
            <span className="text-muted">Carga adaptada automáticamente:</span>
            <span className="badge badge-brand font-bold">
              {convertedWeight} kg {selectedAlt.isDumbbellPair ? "/ mano" : "total"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2" style={{ marginTop: "var(--space-3)" }}>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onApplySwap(selectedAlt.name, convertedWeight);
              onClose();
            }}
          >
            <Check size={14} />
            <span>Aplicar Sustitución</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
