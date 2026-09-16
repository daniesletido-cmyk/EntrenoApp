"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import {
  Scale,
  Save,
  Moon,
  TrendingUp,
  Activity,
  Dumbbell,
  CheckCircle2,
  BedDouble,
  Flame,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { addDays, todayISO } from "@/lib/dates";

interface WeekHistory {
  weekStart: string;
  compliancePct: number | null;
  rpeAvg: number | null;
  durationTotalMin?: number;
  distanceTotalKm?: number;
  loadTotal?: number;
  completedCount?: number;
  plannedCount?: number;
  sleepHoursAvg: number | null;
  sleepQualityAvg: number | null;
  sleepScoreAvg: number | null;
  acwr: number | null;
  action: string;
}

interface Measurement {
  date: string;
  weight_kg: number | null;
}

interface SleepLog {
  date: string;
  hours: number | null;
  quality: number | null;
  score: number | null;
  deep_min: number | null;
  light_min: number | null;
  rem_min: number | null;
  awake_min: number | null;
  source: string | null;
}

const CHART_COLORS = {
  primary: "#3b82f6",
  secondary: "#f97316",
  success: "#22c55e",
  purple: "#a855f7",
  cyan: "#06b6d4",
  deepSleep: "#2563eb",
  remSleep: "#9333ea",
  lightSleep: "#38bdf8",
  awakeSleep: "#64748b",
  grid: "#1e293b",
  text: "#94a3b8",
};

const TOOLTIP_STYLE = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 8,
  fontSize: 12,
  color: "#f8fafc",
  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
};

function ChartCard({
  title,
  subtitle,
  badge,
  hasData,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  hasData: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="surface" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column" }}>
      <div className="flex items-start justify-between gap-2" style={{ marginBottom: "var(--space-3)" }}>
        <div>
          <div className="font-semibold text-sm flex items-center gap-2">{title}</div>
          {subtitle && <div className="text-xs text-muted" style={{ marginTop: 2 }}>{subtitle}</div>}
        </div>
        {badge}
      </div>
      {hasData ? (
        <div style={{ width: "100%", height: 240 }}>{children}</div>
      ) : (
        <div className="flex items-center justify-center text-sm text-faint" style={{ height: 240 }}>
          Todavía no hay datos suficientes
        </div>
      )}
    </div>
  );
}

function formatMin(min: number | null): string {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export default function ProgresoPage() {
  const [weeks, setWeeks] = useState<WeekHistory[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [activeTab, setActiveTab] = useState<"todos" | "entrenos" | "sueno" | "peso">("todos");
  const [weightForm, setWeightForm] = useState({ date: "", weight_kg: "" });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    fetch("/api/history?weeks=12")
      .then((r) => r.json())
      .then((d) => setWeeks(d.weeks ?? []));
    fetch("/api/measurements?limit=30")
      .then((r) => r.json())
      .then((d) => setMeasurements(d.measurements ?? []));
    const today = todayISO();
    fetch(`/api/sleep?from=${addDays(today, -30)}&to=${today}`)
      .then((r) => r.json())
      .then((d) => setSleepLogs(d.logs ?? []));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addWeight() {
    if (!weightForm.date || !weightForm.weight_kg) return;
    setSaving(true);
    try {
      await fetch("/api/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: weightForm.date, weight_kg: Number(weightForm.weight_kg) }),
      });
      setWeightForm({ date: "", weight_kg: "" });
      load();
      toast.push("success", "Peso registrado");
    } finally {
      setSaving(false);
    }
  }

  // Datos semanales para los gráficos de entrenamiento
  const weeklyTrainingData = weeks.map((w) => {
    const hours = w.durationTotalMin ? Math.round((w.durationTotalMin / 60) * 10) / 10 : 0;
    return {
      week: w.weekStart.slice(5),
      Cumplimiento: w.compliancePct !== null ? Math.round(w.compliancePct) : null,
      RPE: w.rpeAvg !== null ? Number(w.rpeAvg.toFixed(1)) : null,
      ACWR: w.acwr !== null ? Number(w.acwr.toFixed(2)) : null,
      HorasEntreno: hours,
      Kilometros: w.distanceTotalKm ?? 0,
      CargaTotal: w.loadTotal ?? 0,
      Sesiones: w.completedCount ?? 0,
      SueñoHoras: w.sleepHoursAvg !== null ? Number(w.sleepHoursAvg.toFixed(1)) : null,
      SueñoCalidad: w.sleepQualityAvg !== null ? Number(w.sleepQualityAvg.toFixed(1)) : null,
      SueñoScore: w.sleepScoreAvg !== null ? Math.round(w.sleepScoreAvg) : null,
    };
  });

  // Datos diarios de sueño (últimos 30 días) ordenados cronológicamente
  const dailySleepData = sleepLogs.map((s) => ({
    date: s.date.slice(5),
    fullDate: s.date,
    Horas: s.hours !== null ? Number(s.hours.toFixed(1)) : null,
    Calidad: s.quality,
    Score: s.score,
    ProfundoMin: s.deep_min ?? 0,
    RemMin: s.rem_min ?? 0,
    LigeroMin: s.light_min ?? 0,
    DespiertoMin: s.awake_min ?? 0,
    ProfundoHoras: s.deep_min ? Math.round((s.deep_min / 60) * 10) / 10 : 0,
    RemHoras: s.rem_min ? Math.round((s.rem_min / 60) * 10) / 10 : 0,
    LigeroHoras: s.light_min ? Math.round((s.light_min / 60) * 10) / 10 : 0,
  }));

  const weightData = measurements.map((m) => ({ date: m.date.slice(5), kg: m.weight_kg }));

  // Banderas de existencia de datos
  const hasCompliance = weeklyTrainingData.some((d) => d.Cumplimiento !== null);
  const hasVolume = weeklyTrainingData.some((d) => d.HorasEntreno > 0 || d.Kilometros > 0);
  const hasLoad = weeklyTrainingData.some((d) => d.CargaTotal > 0 || d.RPE !== null);
  const hasAcwr = weeklyTrainingData.some((d) => d.ACWR !== null);
  const hasDailySleep = dailySleepData.some((d) => d.Horas !== null);
  const hasSleepPhases = dailySleepData.some((d) => d.ProfundoMin > 0 || d.RemMin > 0);
  const hasSleepScore = dailySleepData.some((d) => d.Score !== null);
  const hasWeight = weightData.length > 0;

  // Cálculos para tarjetas KPI superiores
  const recentWeeks = weeks.slice(-4);
  const validCompliance = recentWeeks.map((w) => w.compliancePct).filter((v): v is number => v !== null);
  const avgCompliance = validCompliance.length > 0 ? Math.round(validCompliance.reduce((a, b) => a + b, 0) / validCompliance.length) : null;

  const validSleep = sleepLogs.slice(-14).filter((s) => s.hours !== null);
  const avgSleepHours = validSleep.length > 0
    ? (validSleep.reduce((acc, s) => acc + (s.hours ?? 0), 0) / validSleep.length).toFixed(1)
    : null;

  const validScores = sleepLogs.slice(-14).filter((s) => s.score !== null);
  const avgSleepScore = validScores.length > 0
    ? Math.round(validScores.reduce((acc, s) => acc + (s.score ?? 0), 0) / validScores.length)
    : null;

  const currentWeek = weeks[weeks.length - 1];
  const currentAcwr = currentWeek?.acwr ? Number(currentWeek.acwr.toFixed(2)) : null;

  return (
    <div>
      <PageHeader
        title="Progreso"
        description="Tendencias analíticas a lo largo del tiempo: carga de entreno, calidad de sueño y peso corporal."
      />

      {/* KPI Cards de resumen rápido */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          marginBottom: "var(--space-4)",
        }}
      >
        <div className="surface" style={{ padding: "var(--space-3)" }}>
          <div className="flex items-center justify-between text-xs text-muted" style={{ marginBottom: 4 }}>
            <span>Sueño Reciente</span>
            <BedDouble size={14} style={{ color: CHART_COLORS.primary }} />
          </div>
          <div className="text-xl font-bold">
            {avgSleepHours ? `${avgSleepHours}h` : "—"}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 2 }}>
            {avgSleepScore ? `Score medio: ${avgSleepScore}/100` : "Media últimos 14 días"}
          </div>
        </div>

        <div className="surface" style={{ padding: "var(--space-3)" }}>
          <div className="flex items-center justify-between text-xs text-muted" style={{ marginBottom: 4 }}>
            <span>Ratio ACWR</span>
            <Activity size={14} style={{ color: CHART_COLORS.secondary }} />
          </div>
          <div className="text-xl font-bold flex items-center gap-2">
            {currentAcwr !== null ? currentAcwr : "—"}
            {currentAcwr !== null && (
              <span
                className="badge text-xs"
                style={{
                  backgroundColor:
                    currentAcwr >= 0.8 && currentAcwr <= 1.3
                      ? "rgba(34, 197, 94, 0.15)"
                      : currentAcwr > 1.5
                      ? "rgba(239, 68, 68, 0.15)"
                      : "rgba(249, 115, 22, 0.15)",
                  color:
                    currentAcwr >= 0.8 && currentAcwr <= 1.3
                      ? "var(--color-success)"
                      : currentAcwr > 1.5
                      ? "var(--color-danger)"
                      : "var(--color-warning)",
                }}
              >
                {currentAcwr >= 0.8 && currentAcwr <= 1.3 ? "Óptimo" : currentAcwr > 1.5 ? "Sobrecarga" : "Precaución"}
              </span>
            )}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 2 }}>
            Zona óptima: 0.8 a 1.3
          </div>
        </div>

        <div className="surface" style={{ padding: "var(--space-3)" }}>
          <div className="flex items-center justify-between text-xs text-muted" style={{ marginBottom: 4 }}>
            <span>Cumplimiento 4 sem.</span>
            <CheckCircle2 size={14} style={{ color: CHART_COLORS.success }} />
          </div>
          <div className="text-xl font-bold">
            {avgCompliance !== null ? `${avgCompliance}%` : "—"}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 2 }}>
            Meta recomendada: 80%+
          </div>
        </div>

        <div className="surface" style={{ padding: "var(--space-3)" }}>
          <div className="flex items-center justify-between text-xs text-muted" style={{ marginBottom: 4 }}>
            <span>Volumen Última Sem.</span>
            <Flame size={14} style={{ color: CHART_COLORS.purple }} />
          </div>
          <div className="text-xl font-bold">
            {currentWeek?.durationTotalMin ? formatMin(currentWeek.durationTotalMin) : "—"}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 2 }}>
            {currentWeek?.distanceTotalKm ? `${currentWeek.distanceTotalKm} km recorridos` : "Tiempo en movimiento"}
          </div>
        </div>
      </div>

      {/* Selector de pestañas */}
      <div className="flex items-center gap-2" style={{ marginBottom: "var(--space-4)", overflowX: "auto" }}>
        <button
          type="button"
          className={`btn ${activeTab === "todos" ? "btn-primary" : "btn-secondary"} text-xs`}
          onClick={() => setActiveTab("todos")}
        >
          Visión Global
        </button>
        <button
          type="button"
          className={`btn ${activeTab === "entrenos" ? "btn-primary" : "btn-secondary"} text-xs`}
          onClick={() => setActiveTab("entrenos")}
        >
          <Dumbbell size={13} />
          Entrenamientos y Carga
        </button>
        <button
          type="button"
          className={`btn ${activeTab === "sueno" ? "btn-primary" : "btn-secondary"} text-xs`}
          onClick={() => setActiveTab("sueno")}
        >
          <Moon size={13} />
          Sueño y Recuperación
        </button>
        <button
          type="button"
          className={`btn ${activeTab === "peso" ? "btn-primary" : "btn-secondary"} text-xs`}
          onClick={() => setActiveTab("peso")}
        >
          <Scale size={13} />
          Peso Corporal
        </button>
      </div>

      {/* SECCIÓN 1: ENTRENAMIENTOS Y CARGA */}
      {(activeTab === "todos" || activeTab === "entrenos") && (
        <>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider" style={{ marginBottom: "var(--space-3)" }}>
            <Dumbbell size={14} />
            Métricas de Entrenamiento y Fatiga
          </div>

          <div className="grid gap-4 md:grid-cols-2" style={{ marginBottom: "var(--space-4)" }}>
            {/* Gráfico 1: Volumen Semanal (Horas y Km) */}
            <ChartCard
              title="Volumen semanal de entrenamiento"
              subtitle="Horas dedicadas y kilómetros completados por semana"
              hasData={hasVolume}
            >
              <ResponsiveContainer>
                <BarChart data={weeklyTrainingData}>
                  <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" stroke={CHART_COLORS.text} fontSize={11} />
                  <YAxis yAxisId="left" stroke={CHART_COLORS.primary} fontSize={11} unit="h" />
                  <YAxis yAxisId="right" orientation="right" stroke={CHART_COLORS.secondary} fontSize={11} unit="km" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
                  <Bar yAxisId="left" dataKey="HorasEntreno" name="Horas de entreno" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="Kilometros" name="Distancia (km)" stroke={CHART_COLORS.secondary} strokeWidth={2.5} dot={{ r: 3 }} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Gráfico 2: Carga Aguda:Crónica (ACWR) con Zonas */}
            <ChartCard
              title="Ratio Carga Aguda : Crónica (ACWR)"
              subtitle="Control del riesgo de sobreentrenamiento y progresión de carga"
              badge={
                <span className="badge text-xs" style={{ backgroundColor: "rgba(34, 197, 94, 0.15)", color: "var(--color-success)" }}>
                  Zona Segura: 0.8 - 1.3
                </span>
              }
              hasData={hasAcwr}
            >
              <ResponsiveContainer>
                <LineChart data={weeklyTrainingData}>
                  <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" stroke={CHART_COLORS.text} fontSize={11} />
                  <YAxis stroke={CHART_COLORS.text} fontSize={11} domain={[0, 2]} ticks={[0.5, 0.8, 1.0, 1.3, 1.5, 2.0]} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <ReferenceArea y1={0.8} y2={1.3} fill="rgba(34, 197, 94, 0.08)" stroke="none" />
                  <ReferenceLine y={1.5} stroke="rgba(239, 68, 68, 0.6)" strokeDasharray="3 3" label={{ value: "Riesgo alto (>1.5)", fill: "#ef4444", fontSize: 10, position: "insideTopRight" }} />
                  <ReferenceLine y={0.8} stroke="rgba(34, 197, 94, 0.4)" strokeDasharray="2 2" />
                  <ReferenceLine y={1.3} stroke="rgba(34, 197, 94, 0.4)" strokeDasharray="2 2" />
                  <Line
                    type="monotone"
                    dataKey="ACWR"
                    name="ACWR"
                    stroke={CHART_COLORS.cyan}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: CHART_COLORS.cyan }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Gráfico 3: Carga Interna Semanal (sRPE) y Esfuerzo (RPE) */}
            <ChartCard
              title="Carga interna y esfuerzo percibido (RPE)"
              subtitle="Carga semanal calculada (Duración × RPE) y media de esfuerzo"
              hasData={hasLoad}
            >
              <ResponsiveContainer>
                <AreaChart data={weeklyTrainingData}>
                  <defs>
                    <linearGradient id="colorCarga" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.purple} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={CHART_COLORS.purple} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" stroke={CHART_COLORS.text} fontSize={11} />
                  <YAxis yAxisId="left" stroke={CHART_COLORS.purple} fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" stroke={CHART_COLORS.secondary} fontSize={11} domain={[0, 10]} ticks={[2, 4, 6, 8, 10]} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
                  <Area yAxisId="left" type="monotone" dataKey="CargaTotal" name="Carga semanal (sRPE)" stroke={CHART_COLORS.purple} fill="url(#colorCarga)" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="RPE" name="RPE medio (1-10)" stroke={CHART_COLORS.secondary} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Gráfico 4: Cumplimiento del Plan (%) */}
            <ChartCard
              title="Cumplimiento del plan semanal (%)"
              subtitle="Porcentaje de sesiones completadas frente a las programadas"
              hasData={hasCompliance}
            >
              <ResponsiveContainer>
                <BarChart data={weeklyTrainingData}>
                  <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" stroke={CHART_COLORS.text} fontSize={11} />
                  <YAxis stroke={CHART_COLORS.text} fontSize={11} domain={[0, 100]} unit="%" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <ReferenceLine y={80} stroke={CHART_COLORS.success} strokeDasharray="3 3" label={{ value: "Meta (80%)", fill: CHART_COLORS.success, fontSize: 10, position: "insideTopLeft" }} />
                  <Bar dataKey="Cumplimiento" name="% Cumplimiento" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}

      {/* SECCIÓN 2: SUEÑO Y RECUPERACIÓN */}
      {(activeTab === "todos" || activeTab === "sueno") && (
        <>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider" style={{ marginBottom: "var(--space-3)", marginTop: "var(--space-2)" }}>
            <Moon size={14} />
            Métricas de Sueño y Recuperación (Zepp / Amazfit)
          </div>

          <div className="grid gap-4 md:grid-cols-2" style={{ marginBottom: "var(--space-4)" }}>
            {/* Gráfico 5: Horas de sueño diarias (últimas noches) */}
            <ChartCard
              title="Horas de sueño por noche (Últimos 30 días)"
              subtitle="Duración real del descanso nocturno"
              badge={
                <span className="badge text-xs" style={{ backgroundColor: "rgba(59, 130, 246, 0.15)", color: CHART_COLORS.primary }}>
                  Rango recomendado: 7h – 9h
                </span>
              }
              hasData={hasDailySleep}
            >
              <ResponsiveContainer>
                <AreaChart data={dailySleepData}>
                  <defs>
                    <linearGradient id="colorHoras" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke={CHART_COLORS.text} fontSize={11} />
                  <YAxis stroke={CHART_COLORS.text} fontSize={11} unit="h" domain={[4, 12]} ticks={[4, 6, 8, 10, 12]} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <ReferenceLine y={7.0} stroke="rgba(34, 197, 94, 0.5)" strokeDasharray="3 3" />
                  <ReferenceLine y={8.0} stroke="rgba(34, 197, 94, 0.8)" strokeDasharray="3 3" label={{ value: "8h objetivo", fill: "#22c55e", fontSize: 10, position: "insideTopLeft" }} />
                  <Area type="monotone" dataKey="Horas" name="Horas de sueño" stroke={CHART_COLORS.primary} fill="url(#colorHoras)" strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS.primary }} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Gráfico 6: Fases de sueño apiladas (ZeppBridge) */}
            <ChartCard
              title="Arquitectura del sueño por fases (Horas)"
              subtitle="Desglose de sueño Profundo, REM y Ligero registrado por el reloj"
              hasData={hasSleepPhases}
            >
              <ResponsiveContainer>
                <BarChart data={dailySleepData}>
                  <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke={CHART_COLORS.text} fontSize={11} />
                  <YAxis stroke={CHART_COLORS.text} fontSize={11} unit="h" />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(val, name) => [`${val} h`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
                  <Bar dataKey="ProfundoHoras" name="Profundo" stackId="a" fill={CHART_COLORS.deepSleep} />
                  <Bar dataKey="RemHoras" name="REM" stackId="a" fill={CHART_COLORS.remSleep} />
                  <Bar dataKey="LigeroHoras" name="Ligero" stackId="a" fill={CHART_COLORS.lightSleep} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Gráfico 7: Puntuación de sueño Zepp (0-100) y Calidad */}
            <ChartCard
              title="Puntuación y calidad del sueño"
              subtitle="Score global de Zepp (0-100) y Calidad estimada (1-5)"
              hasData={hasSleepScore}
            >
              <ResponsiveContainer>
                <LineChart data={dailySleepData}>
                  <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke={CHART_COLORS.text} fontSize={11} />
                  <YAxis yAxisId="score" stroke={CHART_COLORS.purple} fontSize={11} domain={[40, 100]} />
                  <YAxis yAxisId="quality" orientation="right" stroke={CHART_COLORS.secondary} fontSize={11} domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
                  <ReferenceLine yAxisId="score" y={80} stroke="rgba(168, 85, 247, 0.4)" strokeDasharray="3 3" label={{ value: "Óptimo (80+)", fill: CHART_COLORS.purple, fontSize: 10, position: "insideTopLeft" }} />
                  <Line yAxisId="score" type="monotone" dataKey="Score" name="Puntuación Zepp (0-100)" stroke={CHART_COLORS.purple} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                  <Line yAxisId="quality" type="monotone" dataKey="Calidad" name="Calidad (1-5)" stroke={CHART_COLORS.secondary} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Gráfico 8: Evolución semanal comparativa (Horas vs Score) */}
            <ChartCard
              title="Promedio semanal de descanso"
              subtitle="Horas medias y puntuación semanal a lo largo de las semanas"
              hasData={weeklyTrainingData.some((d) => d.SueñoHoras !== null)}
            >
              <ResponsiveContainer>
                <LineChart data={weeklyTrainingData}>
                  <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" stroke={CHART_COLORS.text} fontSize={11} />
                  <YAxis yAxisId="left" stroke={CHART_COLORS.primary} fontSize={11} unit="h" domain={[5, 11]} />
                  <YAxis yAxisId="right" orientation="right" stroke={CHART_COLORS.purple} fontSize={11} domain={[50, 100]} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
                  <Line yAxisId="left" type="monotone" dataKey="SueñoHoras" name="Media horas/semana" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                  <Line yAxisId="right" type="monotone" dataKey="SueñoScore" name="Score medio Zepp" stroke={CHART_COLORS.purple} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Tabla de últimas noches */}
          {sleepLogs.length > 0 && (
            <div className="surface" style={{ padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
              <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-3)" }}>
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Moon size={16} />
                  Historial de noches registradas
                </div>
                <div className="text-xs text-muted">Mostrando las últimas 14 noches</div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="text-sm" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr className="text-xs text-faint" style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                      <th style={{ padding: "8px" }}>Fecha</th>
                      <th style={{ padding: "8px" }}>Horas</th>
                      <th style={{ padding: "8px" }}>Calidad</th>
                      <th style={{ padding: "8px" }}>Puntuación Zepp</th>
                      <th style={{ padding: "8px" }}>Profundo</th>
                      <th style={{ padding: "8px" }}>REM</th>
                      <th style={{ padding: "8px" }}>Ligero</th>
                      <th style={{ padding: "8px" }}>Despierto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sleepLogs.slice().reverse().slice(0, 14).map((s) => (
                      <tr key={s.date} style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <td style={{ padding: "8px", fontWeight: 500 }}>{s.date}</td>
                        <td style={{ padding: "8px" }}>
                          {s.hours != null ? (
                            <span className="font-semibold">{s.hours}h</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ padding: "8px" }}>
                          {s.quality != null ? (
                            <span
                              className="badge text-xs"
                              style={{
                                backgroundColor:
                                  s.quality >= 4
                                    ? "rgba(34, 197, 94, 0.15)"
                                    : s.quality === 3
                                    ? "rgba(59, 130, 246, 0.15)"
                                    : "rgba(249, 115, 22, 0.15)",
                                color:
                                  s.quality >= 4
                                    ? "var(--color-success)"
                                    : s.quality === 3
                                    ? "var(--color-brand)"
                                    : "var(--color-warning)",
                              }}
                            >
                              {s.quality}/5
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ padding: "8px" }}>
                          {s.score != null ? (
                            <span className="font-medium">{s.score}/100</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ padding: "8px", color: CHART_COLORS.deepSleep }}>{formatMin(s.deep_min)}</td>
                        <td style={{ padding: "8px", color: CHART_COLORS.remSleep }}>{formatMin(s.rem_min)}</td>
                        <td style={{ padding: "8px", color: CHART_COLORS.lightSleep }}>{formatMin(s.light_min)}</td>
                        <td style={{ padding: "8px", color: CHART_COLORS.text }}>{formatMin(s.awake_min)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* SECCIÓN 3: PESO CORPORAL */}
      {(activeTab === "todos" || activeTab === "peso") && (
        <>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider" style={{ marginBottom: "var(--space-3)", marginTop: "var(--space-2)" }}>
            <Scale size={14} />
            Evolución del Peso Corporal
          </div>

          <div className="grid gap-4 md:grid-cols-3" style={{ marginBottom: "var(--space-4)" }}>
            <div className="md:col-span-2">
              <ChartCard title="Evolución de peso (kg)" subtitle="Histórico de pesajes registrados" hasData={hasWeight}>
                <ResponsiveContainer>
                  <AreaChart data={weightData}>
                    <defs>
                      <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" stroke={CHART_COLORS.text} fontSize={11} />
                    <YAxis stroke={CHART_COLORS.text} fontSize={11} domain={["dataMin - 1", "dataMax + 1"]} unit="kg" />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey="kg" name="Peso (kg)" stroke={CHART_COLORS.success} fill="url(#colorPeso)" strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS.success }} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="surface" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div className="font-semibold text-sm" style={{ marginBottom: "var(--space-1)" }}>
                  Registrar nuevo peso
                </div>
                <p className="text-xs text-muted" style={{ marginBottom: "var(--space-3)" }}>
                  Anota tu peso en ayunas para hacer seguimiento de tu evolución física.
                </p>
                <div className="grid gap-3">
                  <Input
                    label="Fecha"
                    type="date"
                    value={weightForm.date}
                    onChange={(e) => setWeightForm((f) => ({ ...f, date: e.target.value }))}
                  />
                  <Input
                    label="Peso (kg)"
                    type="number"
                    step="0.1"
                    placeholder="ej. 73.5"
                    value={weightForm.weight_kg}
                    onChange={(e) => setWeightForm((f) => ({ ...f, weight_kg: e.target.value }))}
                  />
                </div>
              </div>
              <Button variant="primary" loading={saving} onClick={addWeight} style={{ marginTop: "var(--space-3)" }}>
                <Save size={15} />
                Guardar peso
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Estado vacío si no hay ningún dato todavía */}
      {!hasCompliance && !hasDailySleep && !hasWeight && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <EmptyState
            icon={<Scale size={24} />}
            title="Todavía no hay suficiente histórico"
            description="A medida que registres sesiones de entreno o importes tus noches de sueño desde el Registro, verás aquí tus gráficos y análisis avanzados."
          />
        </div>
      )}
    </div>
  );
}
