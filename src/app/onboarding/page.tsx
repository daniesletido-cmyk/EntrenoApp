"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { EntrenoLogo } from "@/components/brand/entreno-logo";
import { calculatePaceZonesFromVam, secKmToPace, paceToSecKm } from "@/lib/pace-zones-calc";
import {
  User,
  Heart,
  Timer,
  Target,
  Calendar,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Dumbbell,
  Waves,
  Flame,
  Activity,
  Layers,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  // Paso 1: Fisiología y Marcas
  const [fullName, setFullName] = useState(
    profile?.full_name || user?.user_metadata?.full_name || ""
  );
  const [weightKg, setWeightKg] = useState<number | "">(profile?.weight_kg || 70);
  const [restingHr, setRestingHr] = useState<number | "">(profile?.resting_hr || "");
  const [maxHr, setMaxHr] = useState<number | "">(profile?.max_hr || "");

  // Selector de Marca
  const [referenceDist, setReferenceDist] = useState<"5K" | "10K" | "21K" | "42K" | "pace">("10K");
  const [refMinutes, setRefMinutes] = useState(48);
  const [refSeconds, setRefSeconds] = useState(0);

  // Paso 2: Objetivo y Disciplinas
  const [targetDistance, setTargetDistance] = useState<"10K" | "Media Maratón" | "Maratón" | "Carrera Popular / Fitness">("Maratón");
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 5);
    return d.toISOString().split("T")[0];
  });
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [disciplines, setDisciplines] = useState<string[]>(["carrera", "crossfit", "fuerza"]);

  // Cálculo de VAM y Zonas en tiempo real
  const computedVam = useMemo(() => {
    let totalSec = refMinutes * 60 + refSeconds;
    if (totalSec <= 0) totalSec = 2880; // 48 min por defecto

    let distKm = 10;
    let factor = 1.0;

    switch (referenceDist) {
      case "5K":
        distKm = 5;
        factor = 0.93; // 5K se corre a ~93% de VAM
        break;
      case "10K":
        distKm = 10;
        factor = 0.88; // 10K se corre a ~88-90% de VAM
        break;
      case "21K":
        distKm = 21.0975;
        factor = 0.82; // Media Maratón a ~82-84% de VAM
        break;
      case "42K":
        distKm = 42.195;
        factor = 0.77; // Maratón a ~77% de VAM
        break;
      case "pace":
        // Si ingresó ritmo directo min/km
        distKm = 1;
        factor = 0.88;
        break;
    }

    const paceSecKm = totalSec / distKm;
    const vamSecKm = Math.round(paceSecKm * factor);
    const zones = calculatePaceZonesFromVam(vamSecKm, 5);

    return {
      vamSecKm,
      vamPaceStr: secKmToPace(vamSecKm),
      speedKmH: (3600 / vamSecKm).toFixed(2),
      zones,
    };
  }, [referenceDist, refMinutes, refSeconds]);

  const toggleDiscipline = (disc: string) => {
    if (disc === "carrera") return; // Obligatorio
    setDisciplines((prev) =>
      prev.includes(disc) ? prev.filter((d) => d !== disc) : [...prev, disc]
    );
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const payload = {
        fullName: fullName || "Atleta",
        weightKg: Number(weightKg) || 70,
        restingHr: restingHr ? Number(restingHr) : null,
        maxHr: maxHr ? Number(maxHr) : null,
        vamSecKm: computedVam.vamSecKm,
        vamPace: computedVam.vamPaceStr,
        targetDistance,
        targetDate,
        daysPerWeek,
        disciplines,
      };

      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await refreshProfile();
        router.push("/hoy");
      } else {
        alert("Hubo un problema al guardar tu configuración. Inténtalo de nuevo.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión al guardar tu plan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6"
      style={{
        background: "var(--color-bg)",
        color: "var(--color-text)",
      }}
    >
      <div
        className="w-full max-w-[420px] sm:max-w-lg rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl relative overflow-hidden"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Glow atlético */}
        <div
          className="absolute -top-20 -right-20 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: "#DC2626" }}
        />

        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm"
              style={{
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
              }}
            >
              <EntrenoLogo size={24} />
            </div>
            <div>
              <span className="text-xs font-black tracking-wider uppercase" style={{ color: "#DC2626" }}>
                Configuración Inicial
              </span>
              <h2 className="text-base font-black leading-tight">
                Paso {step} de 3
              </h2>
            </div>
          </div>

          {/* Indicador de progreso */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className="h-2 rounded-full transition-all"
                style={{
                  width: step === s ? 24 : 8,
                  background: step >= s ? "#DC2626" : "var(--color-border)",
                }}
              />
            ))}
          </div>
        </div>

        {/* =====================================================================
            PASO 1: PERFIL FISIOLÓGICO Y MARCAS
        ===================================================================== */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-lg font-black tracking-tight">
                Perfil Fisiológico y Marcas
              </h3>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                Calcularemos tu VAM y tus 5 zonas de ritmo exactas para ajustar cada sesión.
              </p>
            </div>

            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold" style={{ color: "var(--color-text-muted)" }}>
                  Tu Nombre o Apodo
                </label>
                <div
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl"
                  style={{
                    background: "var(--color-surface-raised)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <User size={16} style={{ color: "var(--color-text-muted)" }} />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. Carlos Martínez"
                    className="w-full bg-transparent text-sm font-medium outline-none"
                    style={{ color: "var(--color-text)" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold" style={{ color: "var(--color-text-muted)" }}>
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value ? Number(e.target.value) : "")}
                    placeholder="70"
                    className="w-full px-3 py-2 rounded-xl text-sm font-semibold outline-none"
                    style={{
                      background: "var(--color-surface-raised)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold" style={{ color: "var(--color-text-muted)" }}>
                    FC Reposo
                  </label>
                  <input
                    type="number"
                    value={restingHr}
                    onChange={(e) => setRestingHr(e.target.value ? Number(e.target.value) : "")}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 rounded-xl text-sm font-semibold outline-none"
                    style={{
                      background: "var(--color-surface-raised)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold" style={{ color: "var(--color-text-muted)" }}>
                    FC Máxima
                  </label>
                  <input
                    type="number"
                    value={maxHr}
                    onChange={(e) => setMaxHr(e.target.value ? Number(e.target.value) : "")}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 rounded-xl text-sm font-semibold outline-none"
                    style={{
                      background: "var(--color-surface-raised)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  />
                </div>
              </div>

              {/* Marca reciente de referencia */}
              <div
                className="p-4 rounded-2xl flex flex-col gap-3"
                style={{
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Timer size={14} className="text-[#DC2626]" />
                    Marca reciente o ritmo de referencia:
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#DC2626]">
                    VAM: {computedVam.vamPaceStr}/km ({computedVam.speedKmH} km/h)
                  </span>
                </div>

                {/* Chips de distancia */}
                <div className="grid grid-cols-4 gap-1.5">
                  {(["5K", "10K", "21K", "42K"] as const).map((dist) => (
                    <button
                      key={dist}
                      type="button"
                      onClick={() => {
                        setReferenceDist(dist);
                        if (dist === "5K") { setRefMinutes(23); setRefSeconds(0); }
                        else if (dist === "10K") { setRefMinutes(48); setRefSeconds(0); }
                        else if (dist === "21K") { setRefMinutes(105); setRefSeconds(0); }
                        else if (dist === "42K") { setRefMinutes(225); setRefSeconds(0); }
                      }}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                        referenceDist === dist
                          ? "bg-[#DC2626] text-white shadow-sm"
                          : "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      }`}
                      style={{
                        border: referenceDist === dist ? "1px solid #DC2626" : "1px solid var(--color-border)",
                      }}
                    >
                      {dist}
                    </button>
                  ))}
                </div>

                {/* Input de tiempo */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={10}
                      max={360}
                      value={refMinutes}
                      onChange={(e) => setRefMinutes(Math.max(1, Number(e.target.value)))}
                      className="w-16 text-center py-1.5 rounded-xl text-base font-black outline-none font-mono"
                      style={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text)",
                      }}
                    />
                    <span className="text-xs font-bold text-[var(--color-text-muted)]">min</span>
                  </div>
                  <span className="font-bold">:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={refSeconds}
                      onChange={(e) => setRefSeconds(Math.min(59, Math.max(0, Number(e.target.value))))}
                      className="w-14 text-center py-1.5 rounded-xl text-base font-black outline-none font-mono"
                      style={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text)",
                      }}
                    />
                    <span className="text-xs font-bold text-[var(--color-text-muted)]">seg</span>
                  </div>
                </div>

                {/* Previsualización rápida de zonas calculadas */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded-xl" style={{ background: "var(--color-surface)" }}>
                    <span className="font-bold text-[#DC2626]">R1 (Base Aeróbica):</span>
                    <div className="font-mono text-xs font-semibold">{computedVam.zones.zones.z2?.formatted}</div>
                  </div>
                  <div className="p-2 rounded-xl" style={{ background: "var(--color-surface)" }}>
                    <span className="font-bold text-[#DC2626]">R2 (Tempo/Maratón):</span>
                    <div className="font-mono text-xs font-semibold">{computedVam.zones.zones.z3?.formatted}</div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full min-h-[48px] rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-[#DC2626] text-white hover:bg-[#b91c1c] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-red-600/20"
            >
              <span>Continuar al Objetivo</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* =====================================================================
            PASO 2: OBJETIVO PRINCIPAL Y DISCIPLINAS
        ===================================================================== */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-lg font-black tracking-tight">
                Objetivo y Disponibilidad
              </h3>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                Diseñaremos la carga semanal equilibrando tu carrera con tus otras pasiones.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Selector de Objetivo */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold" style={{ color: "var(--color-text-muted)" }}>
                  Distancia Objetivo Principal
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["10K", "Media Maratón", "Maratón", "Carrera Popular / Fitness"] as const).map((dist) => (
                    <button
                      key={dist}
                      type="button"
                      onClick={() => setTargetDistance(dist)}
                      className={`p-3 rounded-2xl text-left font-bold text-xs transition-all flex flex-col gap-1 ${
                        targetDistance === dist
                          ? "bg-[#DC2626] text-white shadow-md"
                          : "bg-[var(--color-surface-raised)] text-[var(--color-text)] hover:border-[#DC2626]"
                      }`}
                      style={{
                        border: targetDistance === dist ? "1px solid #DC2626" : "1px solid var(--color-border)",
                      }}
                    >
                      <Target size={16} />
                      <span>{dist}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fecha objetivo */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold" style={{ color: "var(--color-text-muted)" }}>
                  Fecha Estimada de la Prueba
                </label>
                <div
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl"
                  style={{
                    background: "var(--color-surface-raised)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <Calendar size={16} style={{ color: "var(--color-text-muted)" }} />
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-transparent text-sm font-medium outline-none"
                    style={{ color: "var(--color-text)" }}
                  />
                </div>
              </div>

              {/* Días por semana */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold" style={{ color: "var(--color-text-muted)" }}>
                    Días disponibles por semana
                  </label>
                  <span className="text-xs font-black text-[#DC2626]">{daysPerWeek} días/semana</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setDaysPerWeek(num)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        daysPerWeek === num
                          ? "bg-[#DC2626] text-white shadow-sm"
                          : "bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]"
                      }`}
                      style={{
                        border: daysPerWeek === num ? "1px solid #DC2626" : "1px solid var(--color-border)",
                      }}
                    >
                      {num} días
                    </button>
                  ))}
                </div>
              </div>

              {/* Disciplinas complementarias */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold" style={{ color: "var(--color-text-muted)" }}>
                  Disciplinas que practicas (Multi-Deporte)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleDiscipline("crossfit")}
                    className={`p-2.5 rounded-2xl text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      disciplines.includes("crossfit")
                        ? "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]"
                        : "bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border-[var(--color-border)]"
                    }`}
                    style={{ border: "1px solid" }}
                  >
                    <Flame size={16} />
                    <span>CrossFit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleDiscipline("natacion")}
                    className={`p-2.5 rounded-2xl text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      disciplines.includes("natacion")
                        ? "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]"
                        : "bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border-[var(--color-border)]"
                    }`}
                    style={{ border: "1px solid" }}
                  >
                    <Waves size={16} />
                    <span>Natación</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleDiscipline("fuerza")}
                    className={`p-2.5 rounded-2xl text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      disciplines.includes("fuerza")
                        ? "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]"
                        : "bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border-[var(--color-border)]"
                    }`}
                    style={{ border: "1px solid" }}
                  >
                    <Dumbbell size={16} />
                    <span>Gimnasio</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="min-h-[48px] px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                style={{
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
              >
                <ArrowLeft size={15} />
                <span>Atrás</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 min-h-[48px] rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-[#DC2626] text-white hover:bg-[#b91c1c] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-red-600/20"
              >
                <span>Revisar y Generar Plan</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            PASO 3: CONFIRMACIÓN Y GENERACIÓN AUTOMÁTICA
        ===================================================================== */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                <Sparkles size={20} className="text-[#DC2626]" />
                Tu Ecosistema Personalizado
              </h3>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                Hemos estructurado tu primera semana de entrenamientos aplicando la Regla de Oro.
              </p>
            </div>

            {/* Resumen Card */}
            <div
              className="p-4 rounded-2xl flex flex-col gap-3"
              style={{
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-center justify-between pb-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <div>
                  <div className="text-sm font-black">{fullName || "Atleta"}</div>
                  <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                    {targetDistance} · Objetivo {targetDate ? new Date(targetDate).toLocaleDateString() : "Próximamente"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-[#DC2626] font-mono">{computedVam.vamPaceStr}/km</div>
                  <div className="text-[10px] uppercase font-bold" style={{ color: "var(--color-text-muted)" }}>VAM Calculada</div>
                </div>
              </div>

              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span style={{ color: "var(--color-text-muted)" }}>Frecuencia:</span>
                  <span className="font-bold">{daysPerWeek} sesiones planificadas/sem</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: "var(--color-text-muted)" }}>Disciplinas:</span>
                  <span className="font-bold capitalize">{disciplines.join(" + ")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: "var(--color-text-muted)" }}>Estructura Running:</span>
                  <span className="font-bold text-[#DC2626]">Calentamiento + Clave + Calma</span>
                </div>
              </div>

              <div
                className="p-2.5 rounded-xl text-[11px] flex items-center gap-2 mt-1"
                style={{
                  background: "rgba(220, 38, 38, 0.08)",
                  border: "1px solid rgba(220, 38, 38, 0.2)",
                  color: "var(--color-text)",
                }}
              >
                <CheckCircle2 size={16} className="text-[#DC2626] shrink-0" />
                <span>Tu espacio en la nube quedará 100% blindado con políticas Supabase RLS.</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={submitting}
                className="min-h-[48px] px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                style={{
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
              >
                <ArrowLeft size={15} />
                <span>Atrás</span>
              </button>

              <button
                type="button"
                onClick={handleComplete}
                disabled={submitting}
                className="flex-1 min-h-[48px] rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-[#DC2626] text-white hover:bg-[#b91c1c] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-red-600/20 disabled:opacity-60"
              >
                {submitting ? (
                  <span>Generando tu Plan…</span>
                ) : (
                  <>
                    <span>Generar mi Plan y Comenzar</span>
                    <Sparkles size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
