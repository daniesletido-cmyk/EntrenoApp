export interface WorkoutCopyData {
  date?: string;
  discipline: string;
  planned_code?: string | null;
  is_long_run?: number | boolean;
  status?: string;
  rpe?: number | null;
  duration_min?: number | null;
  distance_km?: number | null;
  notes?: string | null;
}

const DISCIPLINE_EMOJI: Record<string, string> = {
  carrera: "🏃 Carrera",
  gimnasio: "🏋️ Gimnasio",
  natacion: "🏊 Natación",
  crossfit: "🔥 CrossFit",
  otro: "⚡ Otro",
  descanso: "🛌 Descanso",
};

const STATUS_TEXT: Record<string, string> = {
  pendiente: "Pendiente",
  realizada: "Realizada",
  parcial: "Parcial",
  no_realizada: "No realizada",
};

export function formatWorkoutForNotes(w: WorkoutCopyData): string {
  const label = DISCIPLINE_EMOJI[w.discipline] ?? w.discipline;
  const code = w.planned_code ? ` · ${w.planned_code}` : "";
  const longRun = w.is_long_run ? " (Tirada larga)" : "";

  let dateStr = "";
  if (w.date) {
    try {
      const d = new Date(w.date + "T00:00:00Z");
      const day = String(d.getUTCDate()).padStart(2, "0");
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const year = d.getUTCFullYear();
      dateStr = ` (${day}/${month}/${year})`;
    } catch {
      dateStr = ` (${w.date})`;
    }
  }

  const header = `${label}${code}${longRun}${dateStr}`;
  const lines: string[] = [header];

  // Status & metrics
  const statusStr = w.status ? STATUS_TEXT[w.status] ?? w.status : null;
  const metrics: string[] = [];
  if (w.duration_min !== null && w.duration_min !== undefined) metrics.push(`${w.duration_min} min`);
  if (w.distance_km !== null && w.distance_km !== undefined) metrics.push(`${w.distance_km} km`);
  if (w.rpe !== null && w.rpe !== undefined) metrics.push(`RPE ${w.rpe}`);

  if (statusStr) {
    if (metrics.length > 0) {
      lines.push(`Estado: ${statusStr} (${metrics.join(" · ")})`);
    } else {
      lines.push(`Estado: ${statusStr}`);
    }
  }

  // Notes (recipes, exercises, warmup, cooldown, etc.)
  if (w.notes && w.notes.trim()) {
    lines.push("");
    lines.push(w.notes.trim());
  }

  return lines.join("\n");
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback
    }
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    el.style.top = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export async function copyWorkoutToClipboard(w: WorkoutCopyData): Promise<boolean> {
  const text = formatWorkoutForNotes(w);
  return copyTextToClipboard(text);
}
