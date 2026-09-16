"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Scale, Save, Moon, FileUp, X, Trash2 } from "lucide-react";
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

interface SleepPreviewRow {
  date: string;
  hours: number | null;
  quality: number | null;
  score: number | null;
  deep_min: number | null;
  light_min: number | null;
  rem_min: number | null;
  awake_min: number | null;
  notes?: string | null;
}

const CHART_COLORS = {
  primary: "#2f6feb",
  secondary: "#f97316",
  tertiary: "#22c55e",
  quaternary: "#a855f7",
  grid: "#262c37",
  text: "#9aa3b2",
};

const TOOLTIP_STYLE = { background: "#171b24", border: "1px solid #262c37", borderRadius: 8, fontSize: 13 };

function ChartCard({ title, hasData, children }: { title: string; hasData: boolean; children: React.ReactNode }) {
  return (
    <div className="surface" style={{ padding: "var(--space-4)" }}>
      <div className="font-semibold text-sm" style={{ marginBottom: "var(--space-3)" }}>
        {title}
      </div>
      {hasData ? (
        <div style={{ width: "100%", height: 220 }}>{children}</div>
      ) : (
        <div className="flex items-center justify-center text-sm text-faint" style={{ height: 220 }}>
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
  const [weightForm, setWeightForm] = useState({ date: "", weight_kg: "" });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const [sleepPreview, setSleepPreview] = useState<SleepPreviewRow[] | null>(null);
  const [sleepPreviewInfo, setSleepPreviewInfo] = useState<{ skipped: number } | null>(null);
  const [sleepImportLoading, setSleepImportLoading] = useState(false);
  const [sleepCommitting, setSleepCommitting] = useState(false);
  const sleepFileRef = useRef<HTMLInputElement>(null);

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
      .then((d) => setSleepLogs((d.logs ?? []).slice().reverse()));
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

  async function handleImportSleepFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSleepImportLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/sleep/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.push("error", data.error ?? "No se pudo leer el archivo");
        return;
      }
      setSleepPreview(data.rows);
      setSleepPreviewInfo({ skipped: 0 });
    } finally {
      setSleepImportLoading(false);
      e.target.value = "";
    }
  }

  function removeSleepPreviewRow(i: number) {
    setSleepPreview((prev) => (prev ? prev.filter((_, idx) => idx !== i) : prev));
  }

  async function commitSleepImport() {
    if (!sleepPreview || sleepPreview.length === 0) return;
    setSleepCommitting(true);
    try {
      for (const row of sleepPreview) {
        await fetch("/api/sleep", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...row, source: "zepp" }),
        });
      }
      toast.push("success", `${sleepPreview.length} noche(s) importadas desde ZeppBridge`);
      setSleepPreview(null);
      setSleepPreviewInfo(null);
      load();
    } finally {
      setSleepCommitting(false);
    }
  }

  const chartData = weeks.map((w) => ({
    week: w.weekStart.slice(5),
    Cumplimiento: w.compliancePct !== null ? Math.round(w.compliancePct) : null,
    RPE: w.rpeAvg !== null ? Number(w.rpeAvg.toFixed(1)) : null,
    ACWR: w.acwr !== null ? Number(w.acwr.toFixed(2)) : null,
    Horas: w.sleepHoursAvg !== null ? Number(w.sleepHoursAvg.toFixed(1)) : null,
    Calidad: w.sleepQualityAvg !== null ? Number(w.sleepQualityAvg.toFixed(1)) : null,
    Puntuacion: w.sleepScoreAvg !== null ? Math.round(w.sleepScoreAvg) : null,
  }));
  const weightData = measurements.map((m) => ({ date: m.date.slice(5), kg: m.weight_kg }));

  const hasCompliance = chartData.some((d) => d.Cumplimiento !== null);
  const hasRpe = chartData.some((d) => d.RPE !== null || d.ACWR !== null);
  const hasSleep = chartData.some((d) => d.Horas !== null || d.Calidad !== null);
  const hasSleepScore = chartData.some((d) => d.Puntuacion !== null);
  const hasWeight = weightData.length > 0;

  return (
    <div>
      <PageHeader
        title="Progreso"
        description="Tendencias a lo largo del tiempo: carga, sueño y peso corporal."
        actions={
          <>
            <input ref={sleepFileRef} type="file" accept=".csv,.json,application/json,text/csv" onChange={handleImportSleepFile} style={{ display: "none" }} />
            <Button variant="secondary" loading={sleepImportLoading} onClick={() => sleepFileRef.current?.click()}>
              <FileUp size={15} />
              Importar sueño (ZeppBridge)
            </Button>
          </>
        }
      />

      {sleepPreview && (
        <div className="surface animate-in" style={{ padding: "var(--space-4)", marginBottom: "var(--space-5)", borderColor: "var(--color-brand)" }}>
          <div className="flex items-start justify-between" style={{ marginBottom: "var(--space-3)" }}>
            <div>
              <div className="font-semibold text-sm">Noches detectadas en el archivo de ZeppBridge</div>
              {sleepPreviewInfo && (
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                  Revisa antes de importar — se guardan por fecha, así que reimportar una noche ya guardada la actualiza sin duplicarla.
                </div>
              )}
            </div>
            <button className="btn btn-ghost btn-icon" aria-label="Descartar importación" onClick={() => setSleepPreview(null)}>
              <X size={15} />
            </button>
          </div>

          {sleepPreview.length === 0 ? (
            <p className="text-sm text-muted">No se ha reconocido ninguna noche. Prueba con otro archivo.</p>
          ) : (
            <>
              <div className="grid gap-2" style={{ marginBottom: "var(--space-3)", maxHeight: 360, overflowY: "auto" }}>
                {sleepPreview.map((row, i) => (
                  <div key={row.date} className="surface-raised flex flex-wrap items-center gap-3" style={{ padding: "var(--space-3)" }}>
                    <div style={{ minWidth: 100 }}>
                      <div className="text-xs text-faint">Fecha</div>
                      <div className="text-sm font-medium">{row.date}</div>
                    </div>
                    <div style={{ minWidth: 70 }}>
                      <div className="text-xs text-faint">Horas</div>
                      <div className="text-sm font-medium">{row.hours != null ? `${row.hours}h` : "—"}</div>
                    </div>
                    <div style={{ minWidth: 90 }}>
                      <div className="text-xs text-faint">Calidad (1-5)</div>
                      <select
                        className="field-input text-xs"
                        style={{ padding: "2px 6px", height: "auto" }}
                        value={row.quality ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : Number(e.target.value);
                          setSleepPreview((prev) =>
                            prev ? prev.map((item, idx) => (idx === i ? { ...item, quality: val } : item)) : prev
                          );
                        }}
                      >
                        <option value="">—</option>
                        {[1, 2, 3, 4, 5].map((q) => (
                          <option key={q} value={q}>
                            {q}/5
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ minWidth: 80 }}>
                      <div className="text-xs text-faint">Puntuación</div>
                      <div className="text-sm font-medium">{row.score != null ? `${row.score}/100` : "—"}</div>
                    </div>
                    <div style={{ minWidth: 80 }}>
                      <div className="text-xs text-faint">Profundo</div>
                      <div className="text-sm">{formatMin(row.deep_min)}</div>
                    </div>
                    <div style={{ minWidth: 80 }}>
                      <div className="text-xs text-faint">Ligero</div>
                      <div className="text-sm">{formatMin(row.light_min)}</div>
                    </div>
                    <div style={{ minWidth: 80 }}>
                      <div className="text-xs text-faint">REM</div>
                      <div className="text-sm">{formatMin(row.rem_min)}</div>
                    </div>
                    <div style={{ minWidth: 80 }}>
                      <div className="text-xs text-faint">Despierto</div>
                      <div className="text-sm">{formatMin(row.awake_min)}</div>
                    </div>
                    <button
                      className="btn btn-ghost btn-icon"
                      aria-label="Quitar esta noche"
                      style={{ marginLeft: "auto" }}
                      onClick={() => removeSleepPreviewRow(i)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <Button variant="primary" loading={sleepCommitting} onClick={commitSleepImport}>
                <Moon size={15} />
                Importar {sleepPreview.length} noche(s)
              </Button>
            </>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2" style={{ marginBottom: "var(--space-4)" }}>
        <ChartCard title="Cumplimiento semanal (%)" hasData={hasCompliance}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
              <XAxis dataKey="week" stroke={CHART_COLORS.text} fontSize={11} />
              <YAxis stroke={CHART_COLORS.text} fontSize={11} domain={[0, 100]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="Cumplimiento" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="RPE medio y carga aguda:crónica (ACWR)" hasData={hasRpe}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
              <XAxis dataKey="week" stroke={CHART_COLORS.text} fontSize={11} />
              <YAxis stroke={CHART_COLORS.text} fontSize={11} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="RPE" stroke={CHART_COLORS.secondary} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="ACWR" stroke={CHART_COLORS.tertiary} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sueño: horas y calidad (manual)" hasData={hasSleep}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
              <XAxis dataKey="week" stroke={CHART_COLORS.text} fontSize={11} />
              <YAxis stroke={CHART_COLORS.text} fontSize={11} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Horas" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="Calidad" stroke={CHART_COLORS.secondary} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Puntuación de sueño (ZeppBridge, 0-100)" hasData={hasSleepScore}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
              <XAxis dataKey="week" stroke={CHART_COLORS.text} fontSize={11} />
              <YAxis stroke={CHART_COLORS.text} fontSize={11} domain={[0, 100]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="Puntuacion" stroke={CHART_COLORS.quaternary} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Peso corporal (kg)" hasData={hasWeight}>
          <ResponsiveContainer>
            <LineChart data={weightData}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke={CHART_COLORS.text} fontSize={11} />
              <YAxis stroke={CHART_COLORS.text} fontSize={11} domain={["auto", "auto"]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="kg" stroke={CHART_COLORS.tertiary} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {!hasCompliance && !hasWeight && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <EmptyState
            icon={<Scale size={22} />}
            title="Todavía no hay histórico"
            description="En cuanto registres alguna sesión y algún peso, aquí aparecerán las tendencias de varias semanas."
          />
        </div>
      )}

      {sleepLogs.length > 0 && (
        <div className="surface" style={{ padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <div className="flex items-center gap-2 font-semibold text-sm" style={{ marginBottom: "var(--space-3)" }}>
            <Moon size={16} />
            Últimas noches
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="text-sm" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-xs text-faint" style={{ textAlign: "left" }}>
                  <th style={{ padding: "4px 8px" }}>Fecha</th>
                  <th style={{ padding: "4px 8px" }}>Horas</th>
                  <th style={{ padding: "4px 8px" }}>Calidad</th>
                  <th style={{ padding: "4px 8px" }}>Puntuación</th>
                  <th style={{ padding: "4px 8px" }}>Profundo</th>
                  <th style={{ padding: "4px 8px" }}>Ligero</th>
                  <th style={{ padding: "4px 8px" }}>REM</th>
                  <th style={{ padding: "4px 8px" }}>Despierto</th>
                </tr>
              </thead>
              <tbody>
                {sleepLogs.slice(0, 14).map((s) => (
                  <tr key={s.date} style={{ borderTop: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "4px 8px" }}>{s.date}</td>
                    <td style={{ padding: "4px 8px" }}>{s.hours != null ? `${s.hours}h` : "—"}</td>
                    <td style={{ padding: "4px 8px" }}>{s.quality != null ? `${s.quality}/5` : "—"}</td>
                    <td style={{ padding: "4px 8px" }}>{s.score != null ? `${s.score}/100` : "—"}</td>
                    <td style={{ padding: "4px 8px" }}>{formatMin(s.deep_min)}</td>
                    <td style={{ padding: "4px 8px" }}>{formatMin(s.light_min)}</td>
                    <td style={{ padding: "4px 8px" }}>{formatMin(s.rem_min)}</td>
                    <td style={{ padding: "4px 8px" }}>{formatMin(s.awake_min)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="surface" style={{ padding: "var(--space-4)" }}>
        <div className="font-semibold text-sm" style={{ marginBottom: "var(--space-3)" }}>
          Registrar peso
        </div>
        <div className="flex flex-wrap items-end gap-2">
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
            value={weightForm.weight_kg}
            onChange={(e) => setWeightForm((f) => ({ ...f, weight_kg: e.target.value }))}
          />
          <Button variant="primary" loading={saving} onClick={addWeight}>
            <Save size={15} />
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
