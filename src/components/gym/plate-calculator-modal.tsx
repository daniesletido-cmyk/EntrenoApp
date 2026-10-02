"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Scale, Check } from "lucide-react";

interface PlateDef {
  weight: number;
  color: string;
  textColor: string;
  height: number;
  width: number;
}

const AVAILABLE_PLATES: PlateDef[] = [
  { weight: 25, color: "#dc2626", textColor: "#ffffff", height: 86, width: 14 },
  { weight: 20, color: "#2563eb", textColor: "#ffffff", height: 86, width: 13 },
  { weight: 15, color: "#eab308", textColor: "#000000", height: 76, width: 12 },
  { weight: 10, color: "#16a34a", textColor: "#ffffff", height: 68, width: 11 },
  { weight: 5, color: "#f8fafc", textColor: "#000000", height: 54, width: 10 },
  { weight: 2.5, color: "#334155", textColor: "#ffffff", height: 44, width: 8 },
  { weight: 1.25, color: "#94a3b8", textColor: "#000000", height: 36, width: 7 },
];

export function calculatePlates(targetTotalKg: number, barWeightKg: number) {
  const remainingForSides = Math.max(0, targetTotalKg - barWeightKg);
  let perSide = remainingForSides / 2;

  const platesNeeded: { plate: PlateDef; count: number }[] = [];

  for (const plate of AVAILABLE_PLATES) {
    if (perSide >= plate.weight) {
      const count = Math.floor(perSide / plate.weight);
      platesNeeded.push({ plate, count });
      perSide = Math.round((perSide - count * plate.weight) * 100) / 100;
    }
  }

  const loadedPerSideKg = platesNeeded.reduce((acc, p) => acc + p.plate.weight * p.count, 0);
  const actualTotalKg = barWeightKg + loadedPerSideKg * 2;
  const remainderKg = Math.round((targetTotalKg - actualTotalKg) * 100) / 100;

  return {
    barWeightKg,
    platesNeeded,
    loadedPerSideKg,
    actualTotalKg,
    remainderKg,
  };
}

interface PlateCalculatorModalProps {
  open: boolean;
  onClose: () => void;
  initialWeightKg?: number | null;
  onApplyWeight?: (weightKg: number) => void;
}

export function PlateCalculatorModal({
  open,
  onClose,
  initialWeightKg,
  onApplyWeight,
}: PlateCalculatorModalProps) {
  const [targetWeight, setTargetWeight] = useState<number>(initialWeightKg && initialWeightKg > 0 ? initialWeightKg : 80);
  const [barWeight, setBarWeight] = useState<number>(20);

  if (!open) return null;

  const result = calculatePlates(targetWeight, barWeight);

  const flatPlatesList: PlateDef[] = [];
  result.platesNeeded.forEach((item) => {
    for (let i = 0; i < item.count; i++) {
      flatPlatesList.push(item.plate);
    }
  });

  return (
    <Modal
      onClose={onClose}
      title="Calculadora de Discos & Barra"
    >
      <div className="grid gap-4">
        <p className="text-xs text-muted" style={{ margin: 0 }}>
          Visualiza exactamente qué discos cargar por cada lado de la barra según el estándar olímpico.
        </p>
        {/* Controles de Carga */}
        <div className="surface-raised" style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs uppercase font-semibold text-muted">Peso Objetivo Total:</span>
              <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 34, height: 34, padding: 0 }}
                  onClick={() => setTargetWeight((w) => Math.max(barWeight, Math.round((w - 2.5) * 10) / 10))}
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  step="0.5"
                  className="field-input font-bold text-center text-lg"
                  style={{ width: 90, height: 36 }}
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(Number(e.target.value) || barWeight)}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 34, height: 34, padding: 0 }}
                  onClick={() => setTargetWeight((w) => Math.round((w + 2.5) * 10) / 10)}
                >
                  <Plus size={14} />
                </button>
                <span className="font-bold text-base">kg</span>
              </div>
            </div>

            {/* Selector de Barra */}
            <div>
              <span className="text-xs uppercase font-semibold text-muted">Tipo de Barra:</span>
              <div className="flex items-center gap-1.5" style={{ marginTop: 4 }}>
                {[
                  { w: 20, label: "20 kg (Olímpica)" },
                  { w: 15, label: "15 kg (Técnica)" },
                  { w: 10, label: "10 kg (Z-Bar)" },
                ].map((b) => (
                  <button
                    key={b.w}
                    type="button"
                    onClick={() => setBarWeight(b.w)}
                    className={`btn ${barWeight === b.w ? "btn-primary" : "btn-ghost"} text-xs`}
                    style={{ padding: "0.25rem 0.5rem" }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Representación Visual de la Barra con Discos */}
        <div
          style={{
            padding: "var(--space-4) var(--space-2)",
            backgroundColor: "#090d16",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="text-xs font-semibold text-muted" style={{ marginBottom: 12 }}>
            Discos cargados en cada manga (un lado):
          </div>

          <div className="flex items-center justify-center" style={{ height: 100, minWidth: 280 }}>
            {/* Eje de la barra */}
            <div
              style={{
                width: 32,
                height: 14,
                backgroundColor: "#475569",
                borderRadius: "3px 0 0 3px",
              }}
              title="Barra central"
            />
            {/* Tope / cuello de la manga */}
            <div
              style={{
                width: 12,
                height: 48,
                backgroundColor: "#94a3b8",
                borderRadius: 2,
                boxShadow: "0 0 4px rgba(0,0,0,0.5)",
              }}
              title="Cuello de la barra"
            />

            {/* Pila de discos cargados */}
            {flatPlatesList.length === 0 ? (
              <div className="text-xs text-faint italic" style={{ marginLeft: 16 }}>
                Barra sola (sin discos)
              </div>
            ) : (
              flatPlatesList.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    width: p.width,
                    height: p.height,
                    backgroundColor: p.color,
                    color: p.textColor,
                    border: "1px solid rgba(0,0,0,0.4)",
                    borderRadius: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.6rem",
                    fontWeight: 800,
                    writingMode: "vertical-rl",
                    textOrientation: "upright",
                    letterSpacing: "-1px",
                    boxShadow: "inset 0 0 3px rgba(0,0,0,0.4)",
                    marginRight: 1,
                  }}
                  title={`${p.weight} kg`}
                >
                  {p.weight}
                </div>
              ))
            )}

            {/* Manga libre y clip */}
            <div
              style={{
                width: Math.max(30, 110 - flatPlatesList.length * 13),
                height: 14,
                backgroundColor: "#64748b",
                borderRadius: "0 4px 4px 0",
              }}
              title="Manga de carga"
            />
          </div>
        </div>

        {/* Lista desglosada para cargar en el gimnasio */}
        <div className="surface-raised" style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-2)" }}>
            <span className="text-xs font-bold uppercase text-muted">Receta por cada lado:</span>
            <span className="text-xs font-semibold text-brand">{result.loadedPerSideKg} kg / lado</span>
          </div>

          {result.platesNeeded.length === 0 ? (
            <div className="text-xs text-muted">No necesitas discos adicionales. Usa la barra sola de {barWeight} kg.</div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {result.platesNeeded.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5"
                  style={{
                    padding: "4px 8px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      backgroundColor: item.plate.color,
                      border: "1px solid rgba(0,0,0,0.3)",
                    }}
                  />
                  <span className="text-xs font-bold">
                    {item.count}× {item.plate.weight} kg
                  </span>
                </div>
              ))}
            </div>
          )}

          {result.remainderKg !== 0 && (
            <div className="text-xs text-warning" style={{ marginTop: 8 }}>
              Nota: Hay una diferencia de {result.remainderKg} kg respecto a los discos mínimos disponibles (1.25 kg).
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-2" style={{ marginTop: "var(--space-2)" }}>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          {onApplyWeight && (
            <Button
              variant="primary"
              onClick={() => {
                onApplyWeight(result.actualTotalKg);
                onClose();
              }}
            >
              <Check size={14} />
              <span>Fijar {result.actualTotalKg} kg en la serie</span>
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
