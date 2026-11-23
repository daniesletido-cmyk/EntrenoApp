"use client";

import { useEffect, useState } from "react";
import { Gauge, RefreshCw, Save, ShieldAlert, Sparkles, Watch, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { PaceZone, PaceZonesConfig } from "@/lib/pace-zones-calc";

export function PaceZonesCard() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [vamInput, setVamInput] = useState("3:59");
  const [toleranceInput, setToleranceInput] = useState("5");
  const [config, setConfig] = useState<PaceZonesConfig | null>(null);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings/pace-zones");
      const data = await res.json();
      if (data?.config) {
        setConfig(data.config);
        setVamInput(data.config.vamPaceStr || "3:59");
        setToleranceInput(String(data.config.toleranceSecKm ?? 5));
      }
    } catch (err) {
      toast.push("error", "Error al cargar las zonas de ritmo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      const res = await fetch("/api/settings/pace-zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recalculate_from_vam",
          vamPaceStr: vamInput,
          toleranceSecKm: parseInt(toleranceInput, 10) || 5,
        }),
      });
      const data = await res.json();
      if (res.ok && data.config) {
        setConfig(data.config);
        toast.push("success", `Zonas recalculadas con éxito a partir de VAM ${data.config.vamPaceStr} min/km`);
      } else {
        toast.push("error", data.error || "No se pudo recalcular las zonas");
      }
    } catch (err) {
      toast.push("error", "Error de conexión al recalcular zonas");
    } finally {
      setRecalculating(false);
    }
  };

  const handleSaveCustom = async () => {
    if (!config) return;
    try {
      setSaving(true);
      const res = await fetch("/api/settings/pace-zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_custom",
          config: {
            ...config,
            vamPaceStr: vamInput,
            toleranceSecKm: parseInt(toleranceInput, 10) || 5,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.config) {
        setConfig(data.config);
        toast.push("success", "Configuración de ritmo guardada. Tus entrenamientos y el Suunto 9 Peak Pro ya usan estas zonas.");
      } else {
        toast.push("error", data.error || "Error al guardar las zonas");
      }
    } catch (err) {
      toast.push("error", "Error de conexión al guardar las zonas");
    } finally {
      setSaving(false);
    }
  };

  const handleZonePaceChange = (zoneKey: string, field: "minSecKm" | "maxSecKm", val: number) => {
    if (!config) return;
    const currentZone = config.zones[zoneKey];
    if (!currentZone) return;
    const updatedZone = { ...currentZone, [field]: val };
    setConfig({
      ...config,
      zones: {
        ...config.zones,
        [zoneKey]: updatedZone,
      },
    });
  };

  if (loading) {
    return (
      <section className="surface p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-subtle text-brand animate-spin">
            <RefreshCw size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">Zonas de Ritmo y Tolerancia Suunto</h2>
            <p className="text-xs text-text-muted">Cargando perfil fisiológico de carrera...</p>
          </div>
        </div>
      </section>
    );
  }

  const zoneKeys = ["z1", "z2", "z3", "z4", "z5", "z6"];
  const zoneColors: Record<string, { bg: string; text: string; border: string }> = {
    z1: { bg: "rgba(16, 185, 129, 0.1)", text: "rgb(16, 185, 129)", border: "rgba(16, 185, 129, 0.25)" },
    z2: { bg: "rgba(59, 130, 246, 0.1)", text: "rgb(59, 130, 246)", border: "rgba(59, 130, 246, 0.25)" },
    z3: { bg: "rgba(168, 85, 247, 0.1)", text: "rgb(168, 85, 247)", border: "rgba(168, 85, 247, 0.25)" },
    z4: { bg: "rgba(245, 158, 11, 0.1)", text: "rgb(245, 158, 11)", border: "rgba(245, 158, 11, 0.25)" },
    z5: { bg: "rgba(239, 68, 68, 0.1)", text: "rgb(239, 68, 68)", border: "rgba(239, 68, 68, 0.25)" },
    z6: { bg: "rgba(217, 70, 239, 0.1)", text: "rgb(217, 70, 239)", border: "rgba(217, 70, 239, 0.25)" },
  };

  return (
    <section className="surface p-5 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-subtle text-brand">
            <Gauge size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-text">Zonas de Ritmo de Carrera (min/km)</h2>
              <span className="badge badge-success text-[10px]">Suunto 9 Peak Pro Ready</span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Prescripción biomecánica por ritmo estricto y exportación con tolerancia para alertas en el reloj.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleRecalculate}
            disabled={recalculating}
            className="text-xs py-1.5 px-3"
          >
            <RefreshCw size={13} className={recalculating ? "animate-spin mr-1.5" : "mr-1.5"} />
            Recalcular de VAM
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveCustom}
            disabled={saving}
            className="text-xs py-1.5 px-3"
          >
            <Save size={13} className="mr-1.5" />
            Guardar Zonas
          </Button>
        </div>
      </div>

      {/* Alerta Médica de Prescripción por Ritmo */}
      <div
        className="p-3.5 rounded-xl flex items-start gap-3"
        style={{
          background: "rgba(59, 130, 246, 0.08)",
          border: "1px solid rgba(59, 130, 246, 0.25)",
        }}
      >
        <ShieldAlert size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-text leading-relaxed">
          <strong className="text-blue-500 font-semibold">Principio Fisiológico & Seguridad: </strong>
          Debido a tu perfil con taquicardia sinusal en reposo, todos los objetivos de tus entrenamientos se definen y
          exportan al reloj <strong>exclusivamente por RITMO (min/km)</strong>. El pulso se monitoriza únicamente en diferido
          para vigilar el desacoplamiento aeróbico y la fatiga, sin forzar topes en pulsaciones durante la carrera.
        </div>
      </div>

      {/* Controles de VAM y Margen de Tolerancia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-raised border border-border">
        <div>
          <label className="text-xs font-semibold text-text block mb-1">
            VAM (Velocidad Aeróbica Máxima)
          </label>
          <div className="flex items-center gap-2">
            <Input
              value={vamInput}
              onChange={(e) => setVamInput(e.target.value)}
              placeholder="3:59"
              className="text-sm font-bold tabular-nums"
            />
            <span className="text-xs font-semibold text-text-muted whitespace-nowrap">min/km</span>
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            Test oficial Dani Espinosa (Susana / Daniels): 3:59 min/km (15.06 km/h).
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-text block mb-1">
            Tolerancia de Ritmo Suunto (Alertas Reloj)
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="2"
              max="15"
              value={toleranceInput}
              onChange={(e) => setToleranceInput(e.target.value)}
              placeholder="5"
              className="text-sm font-bold tabular-nums"
            />
            <span className="text-xs font-semibold text-text-muted whitespace-nowrap">± s/km</span>
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            Margen de velocidad en el Suunto 9 Peak Pro para activar aviso vibratorio por salida de zona.
          </p>
        </div>
      </div>

      {/* Tabla de Zonas */}
      {config && (
        <div className="space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">
            Zonas de Entrenamiento Activas
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {zoneKeys.map((key) => {
              const zone = config.zones[key];
              if (!zone) return null;
              const color = zoneColors[key] || { bg: "transparent", text: "inherit", border: "var(--color-border)" };

              return (
                <div
                  key={key}
                  className="p-3.5 rounded-xl border transition-all"
                  style={{
                    background: "var(--color-surface-raised)",
                    borderColor: color.border,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-bold uppercase"
                        style={{ background: color.bg, color: color.text }}
                      >
                        {zone.code}
                      </span>
                      <span className="text-xs font-bold text-text">{zone.name}</span>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-text-muted">
                      {zone.pctVam} VAM
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm font-extrabold tabular-nums" style={{ color: color.text }}>
                      {zone.formatted}
                    </div>
                    <span className="text-[11px] text-text-muted italic max-w-[200px] truncate text-right">
                      {zone.description}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 text-[11px] text-text-muted">
        <Watch size={13} className="text-brand" />
        <span>Sincronizado automáticamente con Intervals.icu y exportador SuuntoPlus Guides / .FIT binary.</span>
      </div>
    </section>
  );
}
