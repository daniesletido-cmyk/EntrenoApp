"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Moon,
  Save,
  Footprints,
  Dumbbell,
  Waves,
  Flame,
  MoreHorizontal,
  AlertTriangle,
  Watch,
  Heart,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowLeftRight,
  RotateCcw,
  Pencil,
  Trash2,
  CheckCircle2,
  Zap,
  Sparkles,
  Target,
  Activity,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { weekStartOf, todayISO, weekDates, DAY_NAMES_ES, isoDayOfWeek } from "@/lib/dates";
import WeekSwitcher from "@/components/week-switcher";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Select, Input, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { ZeppSleepRow } from "@/lib/import/zepp-sleep";
import { WorkoutDetailModal } from "@/components/workout-detail-modal";

interface FitLap {
  index: number;
  distanceKm: number | null;
  durationMin: number | null;
  avgPaceMinKm: number | null;
  avgHeartRate: number | null;
  avgCadence?: number | null;
}

interface FitZoneDistribution {
  r0Pct: number;
  r1Pct: number;
  r2Pct: number;
  r3Pct: number;
  r5Pct: number;
  targetZoneName?: string | null;
  targetCompliancePct?: number | null;
}

interface FitDeepAnalysis {
  avgCadence?: number | null;
  maxCadence?: number | null;
  elevationGainM?: number | null;
  aerobicDecouplingPct?: number | null;
  pacingStabilityScore?: number | null;
  zoneDistribution?: FitZoneDistribution | null;
}

interface FitSummary {
  date: string;
  sport: string;
  sportRaw: string | null;
  subSportRaw: string | null;
  activityName: string;
  durationMin: number | null;
  distanceKm: number | null;
  avgPaceMinKm: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  calories: number | null;
  avgCadence?: number | null;
  elevationGainM?: number | null;
  laps: FitLap[];
  deepAnalysis?: FitDeepAnalysis;
}

interface FitFeedbackItem {
  tone: "positive" | "neutral" | "warning";
  category?: "objetivo" | "ritmo" | "cardio" | "cadencia" | "estrategia";
  text: string;
}

interface SwapSuggestion {
  matchId: number;
  matchDate: string;
  matchDiscipline: string;
  matchPlannedCode: string | null;
  todayId: number | null;
  todayDiscipline: string | null;
  todayPlannedCode: string | null;
}

interface FitImportResult {
  summary: FitSummary;
  feedback: FitFeedbackItem[];
  matchedSessionId: number | null;
  suggestedActivityName?: string;
  otherSessionsThatDay: {
    id: number;
    discipline: string;
    planned_code: string | null;
    status: string;
    is_long_run?: number;
    isDisciplineMatch?: boolean;
  }[];
  swapSuggestions: SwapSuggestion[];
}

const FEEDBACK_ICON: Record<FitFeedbackItem["tone"], React.ReactNode> = {
  positive: <TrendingUp size={15} style={{ color: "var(--color-success)" }} />,
  warning: <TrendingDown size={15} style={{ color: "var(--color-warning)" }} />,
  neutral: <Minus size={15} style={{ color: "var(--color-text-muted)" }} />,
};

const DISCIPLINE_LABEL: Record<string, string> = {
  carrera: "Carrera",
  gimnasio: "Gimnasio",
  natacion: "Natación",
  crossfit: "CrossFit",
  otro: "Otro",
};

function formatPace(minKm: number | null): string {
  if (minKm === null) return "—";
  const min = Math.floor(minKm);
  const sec = Math.round((minKm - min) * 60);
  return `${min}:${sec.toString().padStart(2, "0")} min/km`;
}

function dayLabel(date: string): string {
  return DAY_NAMES_ES[isoDayOfWeek(date) - 1] ?? date;
}

// Debe coincidir con el texto que se añade a las notas al aplicar un .fit
// (ver applyFitImport más abajo) — así se reconocen también las
// importaciones antiguas, aplicadas antes de que existiera fit_backup.
const FIT_IMPORT_MARKER = "Importado desde .fit";

function hasFitImport(s: SessionRow): boolean {
  return !!s.fit_backup || !!(s.notes && s.notes.includes(FIT_IMPORT_MARKER));
}

interface SessionRow {
  id: number;
  date: string;
  discipline: string;
  planned_code: string | null;
  is_long_run: number;
  is_extra?: number;
  status: string;
  rpe: number | null;
  duration_min: number | null;
  distance_km: number | null;
  notes: string | null;
  // Presente (no null) cuando el último cambio de esta sesión fue aplicar un
  // .fit importado — habilita el botón "Deshacer importación .fit".
  fit_backup: string | null;
}

interface SleepRow {
  id: number;
  date: string;
  hours: number | null;
  quality: number | null;
  notes: string | null;
  score?: number | null;
  deep_min?: number | null;
  light_min?: number | null;
  rem_min?: number | null;
  awake_min?: number | null;
  source?: string | null;
  nap_min?: number | null;
  nap_count?: number | null;
  nap_notes?: string | null;
}

interface SleepImportPreviewItem extends ZeppSleepRow {
  status: "new" | "update" | "duplicate";
  isDuplicate: boolean;
  isNecessary: boolean;
  existingData?: {
    hours: number | null;
    quality: number | null;
    score: number | null;
    deep_min: number | null;
    rem_min: number | null;
    nap_min?: number | null;
  } | null;
}

interface SleepImportSummary {
  total: number;
  newCount: number;
  updateCount: number;
  duplicateCount: number;
  necessaryCount: number;
  napCount?: number;
}

const STATUS_OPTIONS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "realizada", label: "Realizada" },
  { value: "parcial", label: "Parcial" },
  { value: "no_realizada", label: "No realizada" },
];

const DISCIPLINE_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  carrera: Footprints,
  gimnasio: Dumbbell,
  natacion: Waves,
  crossfit: Flame,
  otro: MoreHorizontal,
};

const INJURY_KEYWORDS = ["dolor", "molestia", "tirón", "tiron", "pinchazo", "rodilla", "tobillo"];

export default function RegistroPage() {
  const [weekStart, setWeekStart] = useState(weekStartOf(todayISO()));
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sleepByDate, setSleepByDate] = useState<Record<string, SleepRow>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [fitResult, setFitResult] = useState<FitImportResult | null>(null);
  const [fitTargetId, setFitTargetId] = useState<number | "new">("new");
  const [fitActivityName, setFitActivityName] = useState("");
  const [fitDiscipline, setFitDiscipline] = useState("carrera");
  const [fitRpe, setFitRpe] = useState("");
  const [fitLoading, setFitLoading] = useState(false);
  const [fitApplying, setFitApplying] = useState(false);
  const [sleepPreview, setSleepPreview] = useState<SleepImportPreviewItem[] | null>(null);
  const [sleepSummary, setSleepSummary] = useState<SleepImportSummary | null>(null);
  const [selectedSleepDates, setSelectedSleepDates] = useState<Set<string>>(new Set());
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [sleepImportLoading, setSleepImportLoading] = useState(false);
  const [sleepCommitting, setSleepCommitting] = useState(false);
  const [applyingSwapId, setApplyingSwapId] = useState<number | null>(null);
  const [undoingFitId, setUndoingFitId] = useState<number | null>(null);
  const [editingSession, setEditingSession] = useState<SessionRow | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: number | null; name: string }>({
    open: false,
    id: null,
    name: "",
  });
  const [confirmUndo, setConfirmUndo] = useState<{
    open: boolean;
    id: number | null;
    exact: boolean;
    message: string;
  }>({ open: false, id: null, exact: false, message: "" });
  const [adaptiveModal, setAdaptiveModal] = useState<{
    open: boolean;
    readiness: any;
  } | null>(null);
  const [applyingModalAdj, setApplyingModalAdj] = useState(false);
  const [detailSessionId, setDetailSessionId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sleepFileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const days = weekDates(weekStart);
  const weekEnd = days[6];

  // Modo de visualización: por defecto 'horizontal' (un día enfocado con navegación)
  const [viewMode, setViewMode] = useState<"horizontal" | "all">("horizontal");

  // Fecha seleccionada: por defecto hoy si está en la semana actual, o el primer día
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const t = todayISO();
    const currentWeekDays = weekDates(weekStartOf(t));
    return currentWeekDays.includes(t) ? t : currentWeekDays[0];
  });

  // Al cambiar la semana, si hoy está en ella se abre hoy automáticamente; si no, el primer día
  useEffect(() => {
    const wDays = weekDates(weekStart);
    const t = todayISO();
    if (wDays.includes(t)) {
      setSelectedDate(t);
    } else {
      setSelectedDate(wDays[0]);
    }
  }, [weekStart]);

  const currentIndex = Math.max(0, days.indexOf(selectedDate));
  const prevDate = currentIndex > 0 ? days[currentIndex - 1] : null;
  const nextDate = currentIndex < days.length - 1 ? days[currentIndex + 1] : null;

  const goToPrevDay = useCallback(() => {
    if (prevDate) setSelectedDate(prevDate);
  }, [prevDate]);

  const goToNextDay = useCallback(() => {
    if (nextDate) setSelectedDate(nextDate);
  }, [nextDate]);

  // Soporte de navegación táctil swipe
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 45) {
      if (diff > 0 && nextDate) {
        goToNextDay();
      } else if (diff < 0 && prevDate) {
        goToPrevDay();
      }
    }
    setTouchStartX(null);
  }

  // Soporte de flechas del teclado (izquierda / derecha)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === "ArrowLeft") goToPrevDay();
      if (e.key === "ArrowRight") goToNextDay();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToPrevDay, goToNextDay]);

  const load = useCallback(() => {
    fetch(`/api/sessions?week=${weekStart}`)
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []));
    fetch(`/api/sleep?from=${weekStart}&to=${weekEnd}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, SleepRow> = {};
        for (const l of d.logs ?? []) map[l.date] = l;
        setSleepByDate(map);
      });
  }, [weekStart, weekEnd]);

  useEffect(() => {
    load();
  }, [load]);

  async function evaluateReadinessFeedback(date: string) {
    try {
      const res = await fetch(`/api/readiness?date=${date}&t=${Date.now()}`);
      const data = await res.json();
      if (data.readiness && data.readiness.proposedMicroAdjustments?.some((a: any) => !a.isApplied)) {
        setAdaptiveModal({ open: true, readiness: data.readiness });
      }
    } catch {}
  }

  async function handleApplyModalAdjustment() {
    if (!adaptiveModal) return;
    setApplyingModalAdj(true);
    try {
      const res = await fetch("/api/readiness/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: adaptiveModal.readiness.date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      toast.push("success", `Adaptación aplicada (${data.appliedCount} sesión/es modificada/s)`);
      setAdaptiveModal(null);
      load();
    } catch {
      toast.push("error", "Error aplicando la adaptación");
    } finally {
      setApplyingModalAdj(false);
    }
  }

  async function handleRevertAdjustment(sessionId: number, targetDate: string) {
    try {
      const res = await fetch("/api/readiness/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: targetDate, sessionId, action: "revert" }),
      });
      if (!res.ok) throw new Error();
      toast.push("success", "Ajuste inteligente revertido");
      load();
    } catch {
      toast.push("error", "No se pudo revertir el ajuste");
    }
  }

  async function saveSession(s: SessionRow) {
    setSavingId(s.id);
    try {
      await fetch(`/api/sessions/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: s.status,
          rpe: s.rpe,
          duration_min: s.duration_min,
          distance_km: s.distance_km,
          notes: s.notes,
        }),
      });
      load();
      toast.push("success", "Sesión guardada");
      if (s.status === "realizada" || s.status === "parcial") {
        evaluateReadinessFeedback(s.date);
      }
    } catch {
      toast.push("error", "No se pudo guardar la sesión");
    } finally {
      setSavingId(null);
    }
  }

  async function saveEditedSession(s: SessionRow) {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/sessions/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discipline: s.discipline,
          planned_code: s.planned_code?.trim() || null,
          is_long_run: s.is_long_run,
          is_extra: s.is_extra,
          status: s.status,
          rpe: s.rpe,
          duration_min: s.duration_min,
          distance_km: s.distance_km,
          notes: s.notes,
        }),
      });
      if (!res.ok) throw new Error();
      toast.push("success", "Sesión modificada correctamente");
      setEditingSession(null);
      load();
      if (s.status === "realizada" || s.status === "parcial") {
        evaluateReadinessFeedback(s.date);
      }
    } catch {
      toast.push("error", "No se pudo modificar la sesión");
    } finally {
      setSavingEdit(false);
    }
  }

  async function executeDeleteSession() {
    const { id } = confirmDelete;
    if (!id) return;
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.push("success", "Sesión eliminada");
      setEditingSession(null);
      setConfirmDelete({ open: false, id: null, name: "" });
      load();
    } catch {
      toast.push("error", "No se pudo eliminar la sesión");
    }
  }

  async function saveSleep(date: string, sleep: Partial<SleepRow>) {
    await fetch("/api/sleep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, ...sleep }),
    });
    load();
    evaluateReadinessFeedback(date);
  }

  async function handleSleepFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSleepImportLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/sleep/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.push("error", data.error ?? "No se pudo leer el archivo de sueño");
        return;
      }
      const rows: SleepImportPreviewItem[] = data.rows ?? [];
      const summary: SleepImportSummary = data.summary ?? {
        total: rows.length,
        newCount: rows.filter((r) => r.status === "new").length,
        updateCount: rows.filter((r) => r.status === "update").length,
        duplicateCount: rows.filter((r) => r.status === "duplicate").length,
        necessaryCount: rows.filter((r) => r.isNecessary).length,
      };

      setSleepPreview(rows);
      setSleepSummary(summary);
      setShowDuplicates(false);

      // Preseleccionar automáticamente SOLO las noches necesarias
      const necessaryDates = new Set<string>();
      for (const r of rows) {
        if (r.isNecessary) necessaryDates.add(r.date);
      }
      setSelectedSleepDates(necessaryDates);

      if (summary.necessaryCount === 0) {
        toast.push(
          "info",
          `Todas las ${summary.total} noches ya están registradas. No hay noches nuevas que importar.`
        );
      } else if (summary.duplicateCount > 0) {
        toast.push(
          "info",
          `${summary.necessaryCount} noche(s) listas para importar. Se han omitido ${summary.duplicateCount} noche(s) repetidas.`
        );
      }
    } catch {
      toast.push("error", "Error al procesar el archivo de sueño");
    } finally {
      setSleepImportLoading(false);
      e.target.value = "";
    }
  }

  async function commitSleepImport() {
    if (!sleepPreview || sleepPreview.length === 0) return;
    const toImport = sleepPreview.filter((r) => selectedSleepDates.has(r.date));
    if (toImport.length === 0) {
      toast.push("info", "No hay ninguna noche seleccionada para importar");
      return;
    }

    setSleepCommitting(true);
    try {
      const res = await fetch("/api/sleep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logs: toImport.map((row) => ({ ...row, source: "zepp" })),
        }),
      });

      if (!res.ok) throw new Error();

      const skippedCount = sleepSummary ? sleepSummary.total - toImport.length : 0;
      toast.push(
        "success",
        `${toImport.length} noche(s) añadidas al registro${skippedCount > 0 ? ` (${skippedCount} repetidas omitidas)` : ""}`
      );
      setSleepPreview(null);
      setSleepSummary(null);
      setSelectedSleepDates(new Set());
      load();
      evaluateReadinessFeedback(toImport[0]?.date || todayISO());
    } catch {
      toast.push("error", "Error al guardar el sueño en el registro");
    } finally {
      setSleepCommitting(false);
    }
  }

  function updateLocalSession(id: number, patch: Partial<SessionRow>) {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function handleFitFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFitLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/sessions/import-fit", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.push("error", data.error ?? "No se pudo leer el archivo .fit");
        return;
      }
      setFitResult(data);
      const targetId = data.matchedSessionId ?? "new";
      setFitTargetId(targetId);
      setFitDiscipline(data.summary.sport ?? "carrera");
      setFitActivityName(data.suggestedActivityName ?? data.summary.activityName ?? "");
      setFitRpe("");
    } finally {
      setFitLoading(false);
      e.target.value = "";
    }
  }

  function handleFitTargetChange(target: number | "new") {
    setFitTargetId(target);
    if (target === "new") {
      setFitActivityName(fitResult?.summary.activityName ?? "");
      setFitDiscipline(fitResult?.summary.sport ?? "carrera");
    } else {
      const s = sessions.find((item) => item.id === target);
      if (s) {
        setFitActivityName(s.planned_code || fitResult?.summary.activityName || "");
        setFitDiscipline(s.discipline || fitResult?.summary.sport || "carrera");
      }
    }
  }

  // Aplica una sugerencia de intercambio: si hoy había algo pendiente con lo
  // que intercambiar, se intercambian las fechas de las dos sesiones; si no
  // había nada pendiente hoy, simplemente se mueve la sesión encontrada a la
  // fecha de hoy. En ambos casos, la sesión resultante queda seleccionada
  // como destino para aplicar el .fit.
  async function applySwapSuggestion(s: SwapSuggestion) {
    if (!fitResult) return;
    setApplyingSwapId(s.matchId);
    try {
      if (s.todayId) {
        const res = await fetch("/api/sessions/swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idA: s.todayId, idB: s.matchId }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.push("error", data.error ?? "No se pudo intercambiar");
          return;
        }
        toast.push("success", `Intercambiado con el entreno del ${dayLabel(s.matchDate)}`);
      } else {
        const res = await fetch(`/api/sessions/${s.matchId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: fitResult.summary.date }),
        });
        if (!res.ok) {
          toast.push("error", "No se pudo mover la sesión");
          return;
        }
        toast.push("success", "Sesión movida a hoy");
      }
      setFitResult((prev) => (prev ? { ...prev, matchedSessionId: s.matchId, swapSuggestions: [] } : prev));
      setFitTargetId(s.matchId);
      const sessionWeek = weekStartOf(fitResult.summary.date);
      if (sessionWeek !== weekStart) setWeekStart(sessionWeek);
      else load();
    } finally {
      setApplyingSwapId(null);
    }
  }

  // Deshace la última importación de .fit aplicada a esta sesión. Si tiene
  // backup exacto (fit_backup) se restaura tal cual; si es una importación
  // antigua sin backup, el servidor hace un reset razonable (ver
  // undoFitImport en src/lib/repo/sessions.ts) — el texto de confirmación
  // avisa de cada caso.
  function undoFitImport(id: number, exact: boolean) {
    const message = exact
      ? "¿Deshacer la importación del .fit en esta sesión? Se restaurará el estado, RPE, duración, distancia y notas que tenía antes de importar el archivo. Si has editado algo después, también se perderá."
      : 'Esta importación es antigua y no tiene guardado el estado de antes, así que no se puede restaurar exactamente. Se volverá a "Pendiente", se quitarán RPE/duración/distancia, y se borrará solo la nota de la importación (se conserva cualquier detalle que hubieras escrito a mano). ¿Continuar?';
    setConfirmUndo({ open: true, id, exact, message });
  }

  async function executeUndoFit() {
    const { id } = confirmUndo;
    if (!id) return;
    setConfirmUndo((prev) => ({ ...prev, open: false }));
    setUndoingFitId(id);
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ undoFit: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.push("error", data.error ?? "No se pudo deshacer la importación");
        return;
      }
      load();
      toast.push("success", "Importación de .fit deshecha");
    } finally {
      setUndoingFitId(null);
    }
  }

  async function applyFitImport() {
    if (!fitResult) return;
    setFitApplying(true);
    try {
      const { summary } = fitResult;
      const fitNote = `Importado desde .fit${summary.avgHeartRate ? ` · FC media ${summary.avgHeartRate} lpm (solo informativa)` : ""}`;
      let targetId = fitTargetId;
      let existingNotes: string | null = null;
      if (targetId === "new") {
        const created = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: summary.date,
            discipline: fitDiscipline,
            planned_code: fitActivityName.trim() || null,
            is_extra: true,
          }),
        }).then((r) => r.json());
        targetId = created.session.id;
      } else {
        existingNotes = sessions.find((s) => s.id === Number(targetId))?.notes ?? null;
      }
      // No se pisa el detalle del entreno planificado (p. ej. importado de una foto del plan) — se conserva y se
      // añade debajo la nota del .fit.
      const notes = existingNotes ? `${existingNotes}\n---\n${fitNote}` : fitNote;
      await fetch(`/api/sessions/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "realizada",
          discipline: fitDiscipline,
          planned_code: fitActivityName.trim() || undefined,
          rpe: fitRpe === "" ? null : Number(fitRpe),
          duration_min: summary.durationMin,
          distance_km: summary.distanceKm,
          notes,
          fitImport: true,
          fit_data: JSON.stringify(summary),
        }),
      });
      setFitResult(null);
      const sessionWeek = weekStartOf(summary.date);
      if (sessionWeek !== weekStart) setWeekStart(sessionWeek);
      else load();
      toast.push("success", `Entreno importado del .fit: ${fitActivityName.trim() || DISCIPLINE_LABEL[fitDiscipline] || "Sesión"}`);

      // Tras aplicar, comprobamos si esta sesión ha hecho que convenga
      // ajustar la semana — igual que si se hubiera registrado a mano.
      const rec = await fetch(`/api/recommendations?week=${sessionWeek}`).then((r) => r.json());
      if (rec.action === "alerta_medica") {
        toast.push("error", "Esta sesión ha generado una alerta médica — revisa Recomendaciones antes de seguir entrenando.");
      } else if (rec.action === "reducir") {
        toast.push("info", "Esta sesión sugiere ajustar la carga — mira Recomendaciones para ver el ajuste propuesto.");
      }
      evaluateReadinessFeedback(summary.date);
    } catch {
      toast.push("error", "No se pudo aplicar el entreno importado");
    } finally {
      setFitApplying(false);
    }
  }

  const totalSessions = sessions.filter((s) => s.discipline !== "descanso").length;

  return (
    <div>
      <PageHeader
        title="Registro"
        description="Marca lo que realmente hiciste cada día y cómo dormiste esa noche."
        actions={
          <>
            <input ref={fileInputRef} type="file" accept=".fit" onChange={handleFitFile} style={{ display: "none" }} />
            <Button variant="secondary" loading={fitLoading} onClick={() => fileInputRef.current?.click()}>
              <Watch size={15} />
              Importar .fit
            </Button>
            <input
              ref={sleepFileInputRef}
              type="file"
              accept=".csv,.json,application/json,text/csv"
              onChange={handleSleepFile}
              style={{ display: "none" }}
            />
            <Button variant="secondary" loading={sleepImportLoading} onClick={() => sleepFileInputRef.current?.click()}>
              <Moon size={15} />
              Importar sueño
            </Button>
          </>
        }
      />
      <WeekSwitcher weekStart={weekStart} onChange={setWeekStart} />

      {sleepPreview && sleepSummary && (
        <div
          className="surface animate-in"
          style={{
            padding: "var(--space-4)",
            marginBottom: "var(--space-5)",
            borderColor: sleepSummary.necessaryCount > 0 ? "var(--color-brand)" : "var(--color-border)",
          }}
        >
          <div className="flex items-start justify-between" style={{ marginBottom: "var(--space-3)" }}>
            <div>
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Moon size={16} style={{ color: "var(--color-brand)" }} />
                {sleepSummary.necessaryCount > 0
                  ? `Noches de sueño para importar (${selectedSleepDates.size} de ${sleepSummary.necessaryCount} necesarias seleccionadas)`
                  : "Noches de sueño analizadas"}
              </div>
              <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                {sleepSummary.total} noches leídas en el archivo:{" "}
                <span style={{ color: "var(--color-success)", fontWeight: 600 }}>{sleepSummary.newCount} nueva(s)</span>
                {sleepSummary.updateCount > 0 && (
                  <span style={{ color: "var(--color-brand)", fontWeight: 600 }}>
                    , {sleepSummary.updateCount} con datos actualizados
                  </span>
                )}
                {sleepSummary.napCount && sleepSummary.napCount > 0 ? (
                  <span style={{ color: "#a855f7", fontWeight: 700 }}>
                    {" "}· 💤 {sleepSummary.napCount} con siesta diferenciada
                  </span>
                ) : null}
                {sleepSummary.duplicateCount > 0 && (
                  <span>
                    {" "}y <strong style={{ color: "var(--color-text-muted)" }}>{sleepSummary.duplicateCount} repetida(s)</strong> que ya tienes registradas (omitidas automáticamente)
                  </span>
                )}.
              </div>
            </div>
            <button
              className="btn btn-ghost btn-icon"
              aria-label="Descartar importación"
              onClick={() => {
                setSleepPreview(null);
                setSleepSummary(null);
              }}
            >
              <X size={15} />
            </button>
          </div>

          {sleepSummary.necessaryCount === 0 ? (
            <div style={{ padding: "var(--space-3) 0" }}>
              <div
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  backgroundColor: "rgba(34, 197, 94, 0.08)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid rgba(34, 197, 94, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--space-3)",
                }}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={20} style={{ color: "var(--color-success)", flexShrink: 0 }} />
                  <div>
                    <div className="font-semibold text-sm" style={{ color: "var(--color-success)" }}>
                      Todas las noches ya están registradas
                    </div>
                    <div className="text-xs text-muted">
                      El archivo contiene {sleepSummary.total} noches de sueño y todas ya están guardadas en tu app con los mismos datos. No hay nada nuevo que importar.
                    </div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSleepPreview(null);
                    setSleepSummary(null);
                  }}
                >
                  Entendido
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Controles de selección y filtro de duplicadas */}
              <div
                className="flex items-center justify-between gap-2"
                style={{ marginBottom: "var(--space-2)", fontSize: "var(--text-xs)" }}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    style={{ padding: "0.2rem 0.5rem" }}
                    onClick={() => {
                      const allNecessary = new Set<string>();
                      for (const r of sleepPreview) {
                        if (r.isNecessary) allNecessary.add(r.date);
                      }
                      setSelectedSleepDates(allNecessary);
                    }}
                  >
                    Seleccionar solo necesarias ({sleepSummary.necessaryCount})
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost text-xs text-muted"
                    style={{ padding: "0.2rem 0.5rem" }}
                    onClick={() => setSelectedSleepDates(new Set())}
                  >
                    Deseleccionar todas
                  </button>
                </div>

                {sleepSummary.duplicateCount > 0 && (
                  <button
                    type="button"
                    className="btn btn-ghost text-xs text-muted"
                    style={{ padding: "0.2rem 0.5rem" }}
                    onClick={() => setShowDuplicates((prev) => !prev)}
                  >
                    {showDuplicates
                      ? `Ocultar ${sleepSummary.duplicateCount} repetidas`
                      : `Ver ${sleepSummary.duplicateCount} repetidas omitidas`}
                  </button>
                )}
              </div>

              {/* Lista de noches */}
              <div className="grid gap-2" style={{ marginBottom: "var(--space-4)", maxHeight: 320, overflowY: "auto" }}>
                {sleepPreview
                  .filter((row) => showDuplicates || row.isNecessary)
                  .map((row) => {
                    const isSelected = selectedSleepDates.has(row.date);
                    return (
                      <div
                        key={row.date}
                        className="surface-raised flex flex-wrap items-center justify-between gap-2"
                        style={{
                          padding: "var(--space-2) var(--space-3)",
                          opacity: row.isDuplicate && !isSelected ? 0.6 : 1,
                          borderLeft: isSelected
                            ? row.status === "new"
                              ? "3px solid var(--color-success)"
                              : "3px solid var(--color-brand)"
                            : "3px solid transparent",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              setSelectedSleepDates((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(row.date);
                                else next.delete(row.date);
                                return next;
                              });
                            }}
                            style={{ cursor: "pointer" }}
                          />
                          <span className="text-sm font-semibold">{row.date}</span>

                          {row.status === "new" && (
                            <span
                              className="badge"
                              style={{
                                backgroundColor: "rgba(34, 197, 94, 0.15)",
                                color: "var(--color-success)",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                              }}
                            >
                              Nueva
                            </span>
                          )}
                          {row.status === "update" && (
                            <span
                              className="badge"
                              style={{
                                backgroundColor: "rgba(59, 130, 246, 0.15)",
                                color: "var(--color-brand)",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                              }}
                            >
                              Actualiza datos
                            </span>
                          )}
                          {row.status === "duplicate" && (
                            <span className="badge badge-neutral" style={{ fontSize: "0.68rem" }}>
                              Repetida (Ya en registro)
                            </span>
                          )}

                          <span className="text-xs text-muted font-medium">
                            {row.hours != null ? `${row.hours}h` : "—"}
                          </span>
                          {row.score != null && (
                            <span className="text-xs text-muted">Score: {row.score}/100</span>
                          )}
                          {row.deep_min != null && (
                            <span className="text-xs text-faint">Prof: {row.deep_min}m</span>
                          )}
                          {row.rem_min != null && (
                            <span className="text-xs text-faint">REM: {row.rem_min}m</span>
                          )}
                          {row.nap_min != null && row.nap_min > 0 && (
                            <span
                              className="badge"
                              style={{
                                backgroundColor: "rgba(168, 85, 247, 0.18)",
                                color: "#c084fc",
                                border: "1px solid rgba(168, 85, 247, 0.35)",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                              }}
                              title={row.nap_notes || undefined}
                            >
                              💤 Siesta: {row.nap_min}m
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted">Calidad:</span>
                          <select
                            className="field-input text-xs"
                            style={{ padding: "2px 8px", height: "auto" }}
                            value={row.quality ?? ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? null : Number(e.target.value);
                              setSleepPreview((prev) =>
                                prev ? prev.map((item) => (item.date === row.date ? { ...item, quality: val } : item)) : prev
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
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon"
                            aria-label="Quitar noche"
                            onClick={() => {
                              setSleepPreview((prev) => (prev ? prev.filter((item) => item.date !== row.date) : prev));
                              setSelectedSleepDates((prev) => {
                                const next = new Set(prev);
                                next.delete(row.date);
                                return next;
                              });
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="flex items-center justify-between gap-2" style={{ flexWrap: "wrap" }}>
                <div className="text-xs text-muted">
                  Solo se importarán las <strong style={{ color: "var(--color-text)" }}>{selectedSleepDates.size} noches seleccionadas</strong>. Las repetidas se omiten.
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSleepPreview(null);
                      setSleepSummary(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    loading={sleepCommitting}
                    disabled={selectedSleepDates.size === 0}
                    onClick={commitSleepImport}
                  >
                    <Save size={15} />
                    Importar {selectedSleepDates.size} noche{selectedSleepDates.size !== 1 ? "s" : ""} necesaria{selectedSleepDates.size !== 1 ? "s" : ""}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {fitResult && (
        <div className="surface animate-in" style={{ padding: "var(--space-4)", marginBottom: "var(--space-5)", borderColor: "var(--color-brand)" }}>
          <div className="flex items-start justify-between" style={{ marginBottom: "var(--space-3)" }}>
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Watch size={16} />
              Entreno leído del archivo .fit
            </div>
            <button className="btn btn-ghost btn-icon" aria-label="Descartar importación" onClick={() => setFitResult(null)}>
              <X size={15} />
            </button>
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", marginBottom: "var(--space-4)" }}>
            <MiniStat label="Fecha" value={fitResult.summary.date} />
            <MiniStat label="Actividad" value={fitResult.summary.activityName} />
            <MiniStat label="Deporte" value={DISCIPLINE_LABEL[fitResult.summary.sport] ?? "Otro"} />
            <MiniStat label="Duración" value={fitResult.summary.durationMin !== null ? `${fitResult.summary.durationMin} min` : "—"} />
            <MiniStat label="Distancia" value={fitResult.summary.distanceKm !== null ? `${fitResult.summary.distanceKm} km` : "—"} />
            {fitResult.summary.sport === "carrera" && (
              <MiniStat label="Ritmo medio" value={formatPace(fitResult.summary.avgPaceMinKm)} />
            )}
            {fitResult.summary.calories !== null && <MiniStat label="Calorías" value={String(fitResult.summary.calories)} />}
            {fitResult.summary.avgCadence != null && (
              <MiniStat label="Cadencia" value={`${fitResult.summary.avgCadence} ppm`} hint="Cadencia media de zancada" />
            )}
            {fitResult.summary.elevationGainM != null && (
              <MiniStat label="Desnivel +" value={`+${fitResult.summary.elevationGainM} m`} />
            )}
            {fitResult.summary.deepAnalysis?.aerobicDecouplingPct != null && (
              <MiniStat
                label="Desacopl. cardíaco"
                value={`${fitResult.summary.deepAnalysis.aerobicDecouplingPct > 0 ? "+" : ""}${fitResult.summary.deepAnalysis.aerobicDecouplingPct}%`}
                hint="Deriva FC 1ª vs 2ª mitad (<5% excelente, >5% fatiga aeróbica)"
              />
            )}
            {fitResult.summary.deepAnalysis?.pacingStabilityScore != null && (
              <MiniStat
                label="Estabilidad ritmo"
                value={`${fitResult.summary.deepAnalysis.pacingStabilityScore}/100`}
                hint="Consistencia de ritmo en la sesión"
              />
            )}
            {fitResult.summary.avgHeartRate !== null && (
              <MiniStat
                label="FC media"
                value={`${fitResult.summary.avgHeartRate} lpm`}
                icon={<Heart size={13} />}
                hint="Solo informativa — entrenas por RPE/ritmo"
              />
            )}
          </div>

          {/* Desglose de zonas VAM para carrera */}
          {fitResult.summary.deepAnalysis?.zoneDistribution && fitResult.summary.sport === "carrera" && (
            <div className="surface-raised" style={{ padding: "var(--space-3)", marginBottom: "var(--space-4)" }}>
              <div className="flex flex-wrap items-center justify-between gap-2" style={{ marginBottom: "var(--space-2)" }}>
                <div className="flex items-center gap-1.5 text-xs uppercase font-semibold text-muted">
                  <Target size={14} style={{ color: "var(--color-brand)" }} />
                  Distribución de Zonas VAM (VAM 3:59)
                </div>
                {fitResult.summary.deepAnalysis.zoneDistribution.targetZoneName && (
                  <span className="badge badge-brand" style={{ fontSize: "0.72rem", padding: "2px 8px" }}>
                    Objetivo: {fitResult.summary.deepAnalysis.zoneDistribution.targetZoneName} ({fitResult.summary.deepAnalysis.zoneDistribution.targetCompliancePct ?? 0}%)
                  </span>
                )}
              </div>

              {/* Barra segmentada */}
              <div
                style={{
                  height: 12,
                  borderRadius: 6,
                  overflow: "hidden",
                  display: "flex",
                  backgroundColor: "#21262d",
                  marginBottom: "var(--space-2)",
                }}
              >
                {fitResult.summary.deepAnalysis.zoneDistribution.r0Pct > 0 && (
                  <div
                    title={`R0 Regenerativo (>5:25): ${fitResult.summary.deepAnalysis.zoneDistribution.r0Pct}%`}
                    style={{ width: `${fitResult.summary.deepAnalysis.zoneDistribution.r0Pct}%`, backgroundColor: "#64748b" }}
                  />
                )}
                {fitResult.summary.deepAnalysis.zoneDistribution.r1Pct > 0 && (
                  <div
                    title={`R1 Base Aeróbica (5:25-4:59): ${fitResult.summary.deepAnalysis.zoneDistribution.r1Pct}%`}
                    style={{ width: `${fitResult.summary.deepAnalysis.zoneDistribution.r1Pct}%`, backgroundColor: "#10b981" }}
                  />
                )}
                {fitResult.summary.deepAnalysis.zoneDistribution.r2Pct > 0 && (
                  <div
                    title={`R2 Tempo (4:59-4:35): ${fitResult.summary.deepAnalysis.zoneDistribution.r2Pct}%`}
                    style={{ width: `${fitResult.summary.deepAnalysis.zoneDistribution.r2Pct}%`, backgroundColor: "#f59e0b" }}
                  />
                )}
                {fitResult.summary.deepAnalysis.zoneDistribution.r3Pct > 0 && (
                  <div
                    title={`R4 Sub-VAM / Maratón (4:35-4:10): ${fitResult.summary.deepAnalysis.zoneDistribution.r3Pct}%`}
                    style={{ width: `${fitResult.summary.deepAnalysis.zoneDistribution.r3Pct}%`, backgroundColor: "#8b5cf6" }}
                  />
                )}
                {fitResult.summary.deepAnalysis.zoneDistribution.r5Pct > 0 && (
                  <div
                    title={`R5 Series (<4:10): ${fitResult.summary.deepAnalysis.zoneDistribution.r5Pct}%`}
                    style={{ width: `${fitResult.summary.deepAnalysis.zoneDistribution.r5Pct}%`, backgroundColor: "#ef4444" }}
                  />
                )}
              </div>

              {/* Leyenda de porcentajes */}
              <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                <span className="flex items-center gap-1">
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#64748b", display: "inline-block" }} />
                  R0 (&gt;5:25): <strong style={{ color: "var(--color-text)" }}>{fitResult.summary.deepAnalysis.zoneDistribution.r0Pct}%</strong>
                </span>
                <span className="flex items-center gap-1">
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#10b981", display: "inline-block" }} />
                  R1 Base (5:25-4:59): <strong style={{ color: "var(--color-text)" }}>{fitResult.summary.deepAnalysis.zoneDistribution.r1Pct}%</strong>
                </span>
                <span className="flex items-center gap-1">
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#f59e0b", display: "inline-block" }} />
                  R2 Tempo (4:59-4:35): <strong style={{ color: "var(--color-text)" }}>{fitResult.summary.deepAnalysis.zoneDistribution.r2Pct}%</strong>
                </span>
                <span className="flex items-center gap-1">
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#8b5cf6", display: "inline-block" }} />
                  R4 Maratón (4:35-4:10): <strong style={{ color: "var(--color-text)" }}>{fitResult.summary.deepAnalysis.zoneDistribution.r3Pct}%</strong>
                </span>
                <span className="flex items-center gap-1">
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ef4444", display: "inline-block" }} />
                  R5 Series (&lt;4:10): <strong style={{ color: "var(--color-text)" }}>{fitResult.summary.deepAnalysis.zoneDistribution.r5Pct}%</strong>
                </span>
              </div>
            </div>
          )}

          {fitResult.swapSuggestions.length > 0 && (
            <div className="grid gap-2" style={{ marginBottom: "var(--space-4)" }}>
              {fitResult.swapSuggestions.map((s) => (
                <div
                  key={s.matchId}
                  className="surface-raised flex flex-wrap items-center justify-between gap-3 text-sm"
                  style={{ padding: "var(--space-3)", borderColor: "var(--color-brand)" }}
                >
                  <span className="flex items-start gap-2">
                    <ArrowLeftRight size={15} style={{ marginTop: 2, flexShrink: 0, color: "var(--color-brand)" }} />
                    <span>
                      Tenías <strong>{DISCIPLINE_LABEL[s.matchDiscipline] ?? s.matchDiscipline}</strong>
                      {s.matchPlannedCode ? ` (${s.matchPlannedCode})` : ""} planificado para el {dayLabel(s.matchDate)} — parece que lo
                      has hecho hoy.
                      {s.todayId
                        ? ` ¿Intercambio las fechas con ${DISCIPLINE_LABEL[s.todayDiscipline ?? ""] ?? s.todayDiscipline}${
                            s.todayPlannedCode ? ` (${s.todayPlannedCode})` : ""
                          }?`
                        : " ¿Muevo esa sesión a hoy?"}
                    </span>
                  </span>
                  <Button variant="secondary" loading={applyingSwapId === s.matchId} onClick={() => applySwapSuggestion(s)}>
                    <ArrowLeftRight size={14} />
                    {s.todayId ? "Intercambiar" : "Mover a hoy"}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {fitResult.feedback.length > 0 && (
            <div className="grid gap-2" style={{ marginBottom: "var(--space-4)" }}>
              {fitResult.feedback.map((f, i) => (
                <div key={i} className="surface-raised flex items-start gap-2 text-sm" style={{ padding: "var(--space-2) var(--space-3)" }}>
                  <span style={{ marginTop: 2, flexShrink: 0 }}>{FEEDBACK_ICON[f.tone]}</span>
                  {f.text}
                </div>
              ))}
            </div>
          )}

          {fitResult.summary.laps.length >= 3 && (
            <div className="surface-raised" style={{ padding: "var(--space-3)", marginBottom: "var(--space-4)" }}>
              <div className="text-xs uppercase text-muted" style={{ marginBottom: "var(--space-2)", fontWeight: 600 }}>
                Ritmo y FC por vuelta
              </div>
              <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer>
                  <LineChart data={fitResult.summary.laps.map((l) => ({ vuelta: l.index, Ritmo: l.avgPaceMinKm, FC: l.avgHeartRate }))}>
                    <CartesianGrid stroke="#262c37" strokeDasharray="3 3" />
                    <XAxis dataKey="vuelta" stroke="#9aa3b2" fontSize={11} />
                    <YAxis yAxisId="left" stroke="#9aa3b2" fontSize={11} reversed />
                    <YAxis yAxisId="right" orientation="right" stroke="#9aa3b2" fontSize={11} />
                    <Tooltip contentStyle={{ background: "#171b24", border: "1px solid #262c37", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line yAxisId="left" type="monotone" dataKey="Ritmo" stroke="#2f6feb" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                    <Line yAxisId="right" type="monotone" dataKey="FC" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2" style={{ marginBottom: "var(--space-3)" }}>
            <Select
              label="Aplicar a"
              value={String(fitTargetId)}
              onChange={(e) => handleFitTargetChange(e.target.value === "new" ? "new" : Number(e.target.value))}
            >
              {fitResult.matchedSessionId && (() => {
                const matched = fitResult.otherSessionsThatDay.find((s) => s.id === fitResult.matchedSessionId);
                const label = matched
                  ? `${DISCIPLINE_LABEL[matched.discipline] ?? matched.discipline}${matched.planned_code ? ` — ${matched.planned_code}` : ""} (${matched.status})`
                  : "Sesión planificada ese día";
                return <option value={fitResult.matchedSessionId}>[Recomendado] {label}</option>;
              })()}
              {fitResult.otherSessionsThatDay
                .filter((s) => s.id !== fitResult.matchedSessionId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {DISCIPLINE_LABEL[s.discipline] ?? s.discipline}
                    {s.planned_code ? ` — ${s.planned_code}` : ""} ({s.status})
                  </option>
                ))}
              <option value="new">+ Crear una nueva sesión ese día</option>
            </Select>

            <Input
              label="Nombre de la actividad"
              hint="Nombre que tendrá este entreno (ej. R1, Día A, Carrera)"
              value={fitActivityName}
              onChange={(e) => setFitActivityName(e.target.value)}
            />

            <Select
              label="Disciplina"
              value={fitDiscipline}
              onChange={(e) => setFitDiscipline(e.target.value)}
            >
              <option value="carrera">Carrera</option>
              <option value="gimnasio">Gimnasio</option>
              <option value="natacion">Natación</option>
              <option value="crossfit">CrossFit</option>
              <option value="otro">Otro</option>
            </Select>

            <Input
              label="RPE (0-10)"
              hint="El reloj no mide esfuerzo percibido — dilo tú"
              type="number"
              min={0}
              max={10}
              value={fitRpe}
              onChange={(e) => setFitRpe(e.target.value)}
            />
          </div>

          <Button variant="primary" loading={fitApplying} onClick={applyFitImport}>
            <Save size={15} />
            Aplicar al registro
          </Button>
        </div>
      )}

      {totalSessions === 0 && (
        <div style={{ marginBottom: "var(--space-5)" }}>
          <EmptyState
            icon={<Footprints size={22} />}
            title="No hay sesiones planificadas esta semana"
            description="Ve a Plan semanal y añade las sesiones de esta semana antes de poder registrarlas aquí."
          />
        </div>
      )}

      {/* Cabecera del selector de días y conmutador de vista */}
      <div className="flex items-center justify-between gap-2 mb-2 px-1">
        <span className="text-xs font-semibold text-muted tracking-wider uppercase">Días de la semana</span>
        <div className="inline-flex items-center bg-surface-raised rounded-lg p-0.5 border border-border/60 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("horizontal")}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              viewMode === "horizontal"
                ? "bg-brand text-white shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            Día a día
          </button>
          <button
            type="button"
            onClick={() => setViewMode("all")}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              viewMode === "all"
                ? "bg-brand text-white shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            Ver semana
          </button>
        </div>
      </div>

      {/* Selector Horizontal de los 7 Días */}
      <div className="w-full mb-3">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((date, idx) => {
            const isSelected = viewMode === "horizontal" && date === selectedDate;
            const isToday = date === todayISO();
            const daySessions = sessions.filter((s) => s.date === date && s.discipline !== "descanso");
            const hasCompleted = daySessions.some((s) => s.status === "realizada");
            const daySleep = sleepByDate[date];
            const hasSleep = daySleep && (daySleep.hours != null || (daySleep.nap_min != null && daySleep.nap_min > 0));
            const dayNum = parseInt(date.split("-")[2] || "1", 10);
            const dayLetter = DAY_NAMES_ES[idx].substring(0, 3).toUpperCase();

            return (
              <button
                key={date}
                type="button"
                onClick={() => {
                  setSelectedDate(date);
                  if (viewMode === "all") setViewMode("horizontal");
                }}
                className={`group relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 select-none border text-center ${
                  isSelected
                    ? "bg-brand text-white border-brand shadow-md shadow-brand/25 scale-[1.02]"
                    : isToday
                    ? "bg-brand/10 text-brand border-brand/40 hover:bg-brand/15"
                    : "bg-surface-raised/70 text-muted hover:text-foreground hover:bg-surface-raised border-border/60"
                }`}
                style={{
                  minHeight: "56px",
                }}
                title={`${DAY_NAMES_ES[idx]} ${dayNum} (${daySessions.length} sesiones${hasSleep ? " · Sueño anotado" : ""})`}
              >
                {isToday && (
                  <span
                    className={`absolute -top-1.5 px-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      isSelected ? "bg-white text-brand" : "bg-brand text-white"
                    }`}
                    style={{ lineHeight: "12px" }}
                  >
                    Hoy
                  </span>
                )}
                <span className={`text-[10px] sm:text-xs font-semibold tracking-wide uppercase ${isSelected ? "opacity-90" : "opacity-75"}`}>
                  {dayLetter}
                </span>
                <span className="text-sm sm:text-base font-extrabold leading-none mt-0.5">
                  {dayNum}
                </span>
                <div className="flex items-center gap-0.5 mt-1 h-1.5">
                  {daySessions.length > 0 ? (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected
                          ? "bg-white"
                          : hasCompleted
                          ? "bg-emerald-500"
                          : "bg-brand"
                      }`}
                    />
                  ) : (
                    <span className="w-1 h-1 rounded-full opacity-0" />
                  )}
                  {hasSleep && (
                    <span
                      className={`w-1 h-1 rounded-full ${
                        isSelected ? "bg-white/80" : "bg-purple-400"
                      }`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controles de Navegación Horizontal (solo en modo horizontal) */}
      {viewMode === "horizontal" && (
        <div className="flex items-center justify-between gap-2 mb-3 bg-surface border border-border/70 rounded-xl px-3 py-2 shadow-xs">
          <button
            type="button"
            onClick={goToPrevDay}
            disabled={!prevDate}
            className="btn btn-ghost btn-icon-sm disabled:opacity-25 disabled:pointer-events-none"
            aria-label="Día anterior"
            title="Día anterior (← Flecha izquierda)"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="text-center min-w-0 flex-1 px-1">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="font-bold text-sm sm:text-base text-foreground capitalize">
                {DAY_NAMES_ES[currentIndex]}, {parseInt(selectedDate.split("-")[2] || "1", 10)} de{" "}
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("es-ES", { month: "long" })}
              </span>
              {selectedDate === todayISO() && (
                <span className="badge badge-brand text-[10px] px-1.5 py-0.5">
                  Hoy
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted truncate mt-0.5">
              Usa las flechas, botones o desliza para navegar
            </div>
          </div>

          <button
            type="button"
            onClick={goToNextDay}
            disabled={!nextDate}
            className="btn btn-ghost btn-icon-sm disabled:opacity-25 disabled:pointer-events-none"
            aria-label="Día siguiente"
            title="Día siguiente (Flecha derecha →)"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Renderizado de Día(s) */}
      {(() => {
        function renderDayCard(date: string, i: number) {
          const daySessions = sessions.filter((s) => s.date === date);
          const sleep = sleepByDate[date] ?? { id: 0, date, hours: null, quality: null, notes: null };
          const isToday = date === todayISO();

          return (
            <div
              key={date}
              className="surface w-full overflow-hidden"
              style={{
                padding: "var(--space-4)",
                borderLeft: isToday ? "3px solid var(--color-brand)" : undefined,
              }}
            >
              <div className="flex items-center justify-between gap-2 w-full" style={{ marginBottom: "var(--space-3)" }}>
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    style={{
                      width: 38,
                      height: 42,
                      borderRadius: "var(--radius-sm)",
                      background: isToday ? "var(--color-brand)" : "var(--color-surface-raised)",
                      color: isToday ? "#ffffff" : "var(--color-text)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      border: isToday ? "none" : "1px solid var(--color-border)",
                      boxShadow: isToday ? "0 4px 12px rgba(59, 130, 246, 0.35)" : "none",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.05em", opacity: isToday ? 0.95 : 0.65 }}>
                      {DAY_NAMES_ES[i].substring(0, 3).toUpperCase()}
                    </span>
                    <span style={{ fontSize: "1rem", fontWeight: 800, lineHeight: 1 }}>
                      {parseInt(date.split("-")[2] || "1", 10)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm truncate">{DAY_NAMES_ES[i]}</span>
                      {isToday && (
                        <span className="badge badge-brand" style={{ fontSize: "0.62rem", padding: "0.08rem 0.35rem" }}>
                          Hoy
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted truncate" style={{ marginTop: 1 }}>
                      {daySessions.length === 0
                        ? "Sin entrenamientos planificados"
                        : `${daySessions.length} entreno${daySessions.length > 1 ? "s" : ""}`}
                    </div>
                  </div>
                </div>
              </div>

              {daySessions.length === 0 && (
                <div
                  className="text-xs text-muted py-2.5 px-3 rounded-lg bg-surface-raised/40 border border-border/40"
                  style={{ marginBottom: "var(--space-3)" }}
                >
                  Día de descanso o sin entrenamientos planificados. Puedes registrar el descanso y sueño abajo.
                </div>
              )}

              {daySessions.map((s) => {
                const Icon = DISCIPLINE_ICON[s.discipline] ?? MoreHorizontal;
                const hasInjuryNote = s.notes && INJURY_KEYWORDS.some((k) => s.notes!.toLowerCase().includes(k));
                return (
                  <div
                    key={s.id}
                    className="surface-raised"
                    style={{ padding: "var(--space-3)", marginBottom: "var(--space-3)" }}
                  >
                    <div className="flex items-center justify-between gap-2" style={{ marginBottom: "var(--space-3)" }}>
                      <div className="flex items-center gap-2 text-sm font-medium" style={{ flexWrap: "wrap" }}>
                        <Icon size={16} className="text-muted" />
                        <span className="font-semibold">{s.planned_code || DISCIPLINE_LABEL[s.discipline] || s.discipline}</span>
                        {s.planned_code && <span className="text-xs text-muted">({DISCIPLINE_LABEL[s.discipline] ?? s.discipline})</span>}
                        {!!s.is_long_run && <span className="badge badge-info">Tirada larga</span>}
                        {!!s.is_extra && (
                          <span
                            className="badge"
                            style={{
                              fontSize: 10,
                              background: "rgba(234, 179, 8, 0.15)",
                              color: "var(--color-warning)",
                              border: "1px solid rgba(234, 179, 8, 0.3)",
                            }}
                          >
                            Extra
                          </span>
                        )}
                        {hasFitImport(s) && <span className="badge badge-success" style={{ fontSize: 10 }}>.FIT</span>}
                        {s.notes && s.notes.includes("[Ajuste inteligente]") && (
                          <span
                            className="badge"
                            style={{
                              fontSize: 10,
                              background: "rgba(59, 130, 246, 0.15)",
                              color: "var(--color-brand)",
                              border: "1px solid rgba(59, 130, 246, 0.3)",
                            }}
                          >
                            Adaptado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="secondary" onClick={() => setDetailSessionId(s.id)}>
                          <Activity size={13} />
                          Ver detalle
                        </Button>
                        <Button variant="ghost" onClick={() => setEditingSession({ ...s })}>
                          <Pencil size={13} />
                          Editar
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
                      <Select
                        label="Estado"
                        value={s.status}
                        onChange={(e) => updateLocalSession(s.id, { status: e.target.value })}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                      <Input
                        label="RPE (0-10)"
                        type="number"
                        min={0}
                        max={10}
                        value={s.rpe ?? ""}
                        onChange={(e) => updateLocalSession(s.id, { rpe: e.target.value === "" ? null : Number(e.target.value) })}
                      />
                      <Input
                        label="Duración (min)"
                        type="number"
                        value={s.duration_min ?? ""}
                        onChange={(e) =>
                          updateLocalSession(s.id, { duration_min: e.target.value === "" ? null : Number(e.target.value) })
                        }
                      />
                      {s.discipline === "carrera" && (
                        <Input
                          label="Distancia (km)"
                          type="number"
                          step="0.1"
                          value={s.distance_km ?? ""}
                          onChange={(e) =>
                            updateLocalSession(s.id, { distance_km: e.target.value === "" ? null : Number(e.target.value) })
                          }
                        />
                      )}
                    </div>

                    <div style={{ marginTop: "var(--space-3)" }}>
                      <Textarea
                        label="Notas / molestias"
                        hint="Si notas dolor articular o algo raro, anótalo aquí sin falta."
                        rows={2}
                        value={s.notes ?? ""}
                        onChange={(e) => updateLocalSession(s.id, { notes: e.target.value })}
                      />
                      {hasInjuryNote && (
                        <div className="flex items-center gap-1 text-xs" style={{ color: "var(--color-warning)", marginTop: 4 }}>
                          <AlertTriangle size={13} />
                          Esta nota se revisará en Recomendaciones.
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2" style={{ marginTop: "var(--space-3)" }}>
                      <Button variant="primary" loading={savingId === s.id} onClick={() => saveSession(s)}>
                        <Save size={15} />
                        Guardar
                      </Button>
                      {hasFitImport(s) && (
                        <Button
                          variant="ghost"
                          loading={undoingFitId === s.id}
                          onClick={() => undoFitImport(s.id, !!s.fit_backup)}
                        >
                          <RotateCcw size={15} />
                          {s.fit_backup ? "Deshacer importación .fit" : "Quitar datos del .fit"}
                        </Button>
                      )}
                      {s.status === "pendiente" && s.notes && s.notes.includes("[Ajuste inteligente]") && (
                        <Button
                          variant="ghost"
                          onClick={() => handleRevertAdjustment(s.id, s.date)}
                          title="Revertir este ajuste inteligente y volver al plan base"
                        >
                          <RotateCcw size={14} />
                          Revertir adaptación
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-3)" }}>
                <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-2)" }}>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Moon size={14} />
                    Sueño de esa noche
                  </div>
                  <div className="flex items-center gap-2">
                    {sleep.nap_min != null && sleep.nap_min > 0 && (
                      <span
                        className="badge"
                        style={{
                          background: "rgba(168, 85, 247, 0.12)",
                          color: "#c084fc",
                          border: "1px solid rgba(168, 85, 247, 0.25)",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                        }}
                      >
                        💤 Siesta: {sleep.nap_min}m
                      </span>
                    )}
                    {sleep.score != null && (
                      <span className="text-xs text-muted">
                        Zepp: <strong>{sleep.score}/100</strong>
                        {sleep.deep_min != null ? ` · Prof: ${sleep.deep_min}m` : ""}
                        {sleep.rem_min != null ? ` · REM: ${sleep.rem_min}m` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}
                  key={`sleep-${date}-${sleep.id || 'none'}-${sleep.hours ?? ''}-${sleep.quality ?? ''}-${sleep.nap_min ?? ''}`}
                >
                  <Input
                    label="Horas noche"
                    type="number"
                    step="0.1"
                    defaultValue={sleep.hours ?? ""}
                    onBlur={(e) =>
                      saveSleep(date, {
                        hours: e.target.value === "" ? null : Number(e.target.value),
                        quality: sleep.quality,
                        nap_min: sleep.nap_min,
                        nap_count: sleep.nap_count,
                      })
                    }
                  />
                  <Select
                    label="Calidad"
                    defaultValue={sleep.quality ?? ""}
                    onChange={(e) =>
                      saveSleep(date, {
                        hours: sleep.hours,
                        quality: e.target.value === "" ? null : Number(e.target.value),
                        nap_min: sleep.nap_min,
                        nap_count: sleep.nap_count,
                      })
                    }
                  >
                    <option value="">Sin registrar</option>
                    {[1, 2, 3, 4, 5].map((q) => (
                      <option key={q} value={q}>
                        {q}/5
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Siesta (min)"
                    type="number"
                    step="5"
                    placeholder="Ej: 30"
                    defaultValue={sleep.nap_min ?? ""}
                    onBlur={(e) => {
                      const val = e.target.value === "" ? null : Number(e.target.value);
                      saveSleep(date, {
                        hours: sleep.hours,
                        quality: sleep.quality,
                        nap_min: val,
                        nap_count: val && val > 0 ? (sleep.nap_count || 1) : 0,
                      });
                    }}
                  />
                </div>
                {(sleep.notes || sleep.nap_notes) && (
                  <div className="text-xs text-muted flex flex-col gap-1" style={{ marginTop: "var(--space-2)" }}>
                    {sleep.notes && <div>{sleep.notes}</div>}
                    {sleep.nap_notes && <div style={{ color: "#c084fc" }}>💤 {sleep.nap_notes}</div>}
                  </div>
                )}
                {sleep.hours != null && sleep.nap_min != null && sleep.nap_min > 0 && (
                  <div className="text-xs text-muted" style={{ marginTop: "var(--space-1)" }}>
                    Total descanso del día: <strong>{(sleep.hours + sleep.nap_min / 60).toFixed(1)}h</strong> (noche + siesta)
                  </div>
                )}
              </div>
            </div>
          );
        }

        if (viewMode === "horizontal") {
          return (
            <div
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="w-full transition-opacity duration-150"
            >
              {renderDayCard(selectedDate, currentIndex)}
            </div>
          );
        }

        return (
          <div className="grid gap-3 w-full">
            {days.map((date, i) => renderDayCard(date, i))}
          </div>
        );
      })()}

      <ConfirmDialog
        open={confirmUndo.open}
        title="Deshacer importación .fit"
        description={confirmUndo.message}
        confirmLabel="Deshacer"
        tone="danger"
        onConfirm={executeUndoFit}
        onCancel={() => setConfirmUndo((p) => ({ ...p, open: false }))}
      />

      {editingSession && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 250,
            padding: "var(--space-4)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingEdit) setEditingSession(null);
          }}
        >
          <div
            className="surface animate-in"
            style={{
              width: "min(500px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{ padding: "var(--space-4)", borderBottom: "1px solid var(--color-border)" }}
            >
              <div className="font-semibold text-base flex items-center gap-2">
                <Pencil size={16} />
                Editar sesión ({editingSession.date})
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                disabled={savingEdit}
                onClick={() => setEditingSession(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-3" style={{ padding: "var(--space-4)" }}>
              <Input
                label="Nombre de la actividad"
                hint="Ej. R1, Día A, Carrera 40', Caminata..."
                value={editingSession.planned_code ?? ""}
                onChange={(e) => setEditingSession({ ...editingSession, planned_code: e.target.value })}
              />

              <Select
                label="Disciplina"
                value={editingSession.discipline}
                onChange={(e) => setEditingSession({ ...editingSession, discipline: e.target.value })}
              >
                <option value="carrera">Carrera</option>
                <option value="gimnasio">Gimnasio</option>
                <option value="natacion">Natación</option>
                <option value="crossfit">CrossFit</option>
                <option value="otro">Otro</option>
                <option value="descanso">Descanso</option>
              </Select>

              {editingSession.discipline === "carrera" && (
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ marginTop: 2 }}>
                  <input
                    type="checkbox"
                    checked={!!editingSession.is_long_run}
                    onChange={(e) => setEditingSession({ ...editingSession, is_long_run: e.target.checked ? 1 : 0 })}
                  />
                  <span>Tirada larga</span>
                </label>
              )}

              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ marginTop: 2 }}>
                <input
                  type="checkbox"
                  checked={!!editingSession.is_extra}
                  onChange={(e) => setEditingSession({ ...editingSession, is_extra: e.target.checked ? 1 : 0 })}
                />
                <span>Sesión extra (fuera de la planificación)</span>
              </label>

              <Select
                label="Estado"
                value={editingSession.status}
                onChange={(e) => setEditingSession({ ...editingSession, status: e.target.value })}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>

              <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <Input
                  label="Duración (min)"
                  type="number"
                  value={editingSession.duration_min ?? ""}
                  onChange={(e) =>
                    setEditingSession({
                      ...editingSession,
                      duration_min: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
                <Input
                  label="RPE (0-10)"
                  type="number"
                  min={0}
                  max={10}
                  value={editingSession.rpe ?? ""}
                  onChange={(e) =>
                    setEditingSession({
                      ...editingSession,
                      rpe: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>

              {editingSession.discipline === "carrera" && (
                <Input
                  label="Distancia (km)"
                  type="number"
                  step="0.1"
                  value={editingSession.distance_km ?? ""}
                  onChange={(e) =>
                    setEditingSession({
                      ...editingSession,
                      distance_km: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              )}

              <Textarea
                label="Notas / molestias"
                rows={3}
                value={editingSession.notes ?? ""}
                onChange={(e) => setEditingSession({ ...editingSession, notes: e.target.value })}
              />
            </div>

            <div
              className="flex items-center justify-between gap-2"
              style={{
                padding: "var(--space-3) var(--space-4)",
                borderTop: "1px solid var(--color-border)",
                background: "var(--color-surface-raised)",
              }}
            >
              <Button
                variant="ghost"
                onClick={() =>
                  setConfirmDelete({
                    open: true,
                    id: editingSession.id,
                    name: editingSession.planned_code || editingSession.discipline,
                  })
                }
                style={{ color: "var(--color-danger)" }}
              >
                <Trash2 size={14} />
                Eliminar sesión
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="secondary" disabled={savingEdit} onClick={() => setEditingSession(null)}>
                  Cancelar
                </Button>
                <Button variant="primary" loading={savingEdit} onClick={() => saveEditedSession(editingSession)}>
                  <Save size={14} />
                  Guardar cambios
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {adaptiveModal && adaptiveModal.open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.72)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 300,
            padding: "var(--space-4)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !applyingModalAdj) setAdaptiveModal(null);
          }}
        >
          <div
            className="surface animate-in"
            style={{
              width: "min(520px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              boxShadow: "var(--shadow-md)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{ padding: "var(--space-4)", borderBottom: "1px solid var(--color-border)" }}
            >
              <div className="font-bold text-base flex items-center gap-2">
                <Zap size={18} style={{ color: "var(--color-brand)" }} />
                Evaluación de Carga & Recuperación
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                disabled={applyingModalAdj}
                onClick={() => setAdaptiveModal(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "var(--space-4)" }}>
              <div className="flex items-center justify-between gap-2" style={{ marginBottom: "var(--space-3)" }}>
                <div>
                  <div className="text-xs text-muted">Tu nivel de Readiness calculado</div>
                  <div className="font-extrabold text-lg flex items-center gap-2" style={{ marginTop: 2 }}>
                    <span>{adaptiveModal.readiness.score}/100</span>
                    <span
                      className={`badge ${
                        adaptiveModal.readiness.tone === "success"
                          ? "badge-success"
                          : adaptiveModal.readiness.tone === "warning"
                          ? "badge-warning"
                          : adaptiveModal.readiness.tone === "danger"
                          ? "badge-danger"
                          : "badge-brand"
                      }`}
                    >
                      {adaptiveModal.readiness.verdict?.badgeLabel || adaptiveModal.readiness.levelLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: "0.75rem 0.9rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border)",
                  marginBottom: "var(--space-3)",
                }}
              >
                <div className="font-semibold text-sm">
                  {adaptiveModal.readiness.verdict?.title || adaptiveModal.readiness.headline}
                </div>
                <p className="text-xs text-muted" style={{ marginTop: 4, lineHeight: 1.45 }}>
                  {adaptiveModal.readiness.verdict?.actionGuidance || adaptiveModal.readiness.coachAdvice}
                </p>
              </div>

              {adaptiveModal.readiness.proposedMicroAdjustments?.length > 0 && (
                <div>
                  <div className="font-semibold text-xs uppercase text-muted" style={{ marginBottom: "var(--space-2)" }}>
                    Modulación sugerida para los próximos días:
                  </div>
                  <div className="grid gap-2">
                    {adaptiveModal.readiness.proposedMicroAdjustments.map((adj: any) => (
                      <div
                        key={adj.sessionId}
                        style={{
                          padding: "0.6rem 0.8rem",
                          borderRadius: "var(--radius-sm)",
                          background: "rgba(59, 130, 246, 0.08)",
                          border: "1px solid rgba(59, 130, 246, 0.25)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-1 text-xs">
                          <span className="font-bold">
                            {adj.date} ({adj.discipline})
                          </span>
                          <span className="badge badge-warning" style={{ fontSize: "0.68rem" }}>
                            Propuesta
                          </span>
                        </div>
                        <div className="text-xs" style={{ marginTop: 3 }}>
                          Cambiar a: <strong>{adj.suggestedPlannedCode || "Descanso / Regenerativo"}</strong>
                        </div>
                        <div className="text-xs text-muted" style={{ marginTop: 2, lineHeight: 1.35 }}>
                          {adj.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className="flex items-center justify-end gap-2"
              style={{
                padding: "var(--space-3) var(--space-4)",
                borderTop: "1px solid var(--color-border)",
                background: "var(--color-surface-raised)",
              }}
            >
              <Button variant="secondary" disabled={applyingModalAdj} onClick={() => setAdaptiveModal(null)}>
                Mantener plan original
              </Button>
              {adaptiveModal.readiness.proposedMicroAdjustments?.length > 0 && (
                <Button variant="primary" loading={applyingModalAdj} onClick={handleApplyModalAdjustment}>
                  <Sparkles size={14} />
                  Aplicar adaptación
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {detailSessionId && (
        <WorkoutDetailModal
          sessionId={detailSessionId}
          onClose={() => setDetailSessionId(null)}
          onEdit={(id) => {
            const s = sessions.find((item) => item.id === id);
            if (s) setEditingSession(s);
          }}
        />
      )}

      <ConfirmDialog
        open={confirmDelete.open}
        title="Eliminar sesión"
        description={`¿Seguro que quieres eliminar la sesión "${confirmDelete.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        tone="danger"
        onConfirm={executeDeleteSession}
        onCancel={() => setConfirmDelete({ open: false, id: null, name: "" })}
      />
    </div>
  );
}

function MiniStat({ label, value, icon, hint }: { label: string; value: string; icon?: React.ReactNode; hint?: string }) {
  return (
    <div className="surface-raised" style={{ padding: "var(--space-2) var(--space-3)" }} title={hint}>
      <div className="text-xs text-muted flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="font-semibold text-sm" style={{ marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}
