/**
 * Motor de Planificación Deportiva Adaptativa (EntrenoApp)
 * Cruza la agenda del Calendario de iPhone con el plan de entrenamiento semanal.
 * Detecta ventanas libres reales y genera versiones Express o reubicaciones inteligentes.
 */

import type { ParsedCalendarEvent } from "@/lib/ical-parser";

export type AdaptationStatus = "cleared" | "adapted_express" | "blocked";

export interface AdaptedSessionProposal {
  status: AdaptationStatus;
  badgeLabel: string;
  badgeTone: "success" | "warning" | "danger" | "neutral";
  availableMinutes: number;
  conflictingEventTitle: string | null;
  busyIntervals: Array<{ start: string; end: string; title: string }>;
  bestFreeWindow: { start: string; end: string; minutes: number } | null;
  originalSession: {
    id: number;
    date: string;
    discipline: string;
    planned_code: string | null;
    duration_min: number | null;
    distance_km: number | null;
    notes: string | null;
  };
  adaptedSession: {
    discipline: string;
    planned_code: string;
    duration_min: number;
    distance_km: number | null;
    notes: string;
    adaptationReason: string;
  };
  swapTargetDate?: string | null;
}

export interface DayCalendarAnalysis {
  date: string;
  totalEvents: number;
  hasAllDayBlocker: boolean;
  blockerTitle: string | null;
  busyIntervals: Array<{ start: string; end: string; title: string }>;
  freeWindows: Array<{ start: string; end: string; minutes: number }>;
  maxContinuousFreeMin: number;
}

/**
 * Convierte un string de hora HH:mm a minutos desde las 00:00
 */
function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

/**
 * Convierte minutos desde las 00:00 a formato HH:mm
 */
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Analiza la agenda de un día concreto a partir de los eventos del calendario
 */
export function analyzeDayAgenda(
  dateIso: string,
  events: ParsedCalendarEvent[],
  dayStartHour = 7, // 07:00
  dayEndHour = 22 // 22:00
): DayCalendarAnalysis {
  // Filtrar eventos que toquen este día
  const dayEvents = events.filter((ev) => {
    const evStartDate = ev.start_time.slice(0, 10);
    const evEndDate = ev.end_time.slice(0, 10);
    return dateIso >= evStartDate && dateIso <= evEndDate;
  });

  // Comprobar eventos de día completo bloqueantes
  let hasAllDayBlocker = false;
  let blockerTitle: string | null = null;

  for (const ev of dayEvents) {
    if (ev.all_day === 1) {
      const lower = ev.title.toLowerCase();
      // Palabras clave de eventos que bloquean por completo el día
      const isBlocking =
        lower.includes("viaje") ||
        lower.includes("vuelo") ||
        lower.includes("guardia") ||
        lower.includes("congreso") ||
        lower.includes("jornada") ||
        lower.includes("boda") ||
        lower.includes("evento") ||
        lower.includes("curso") ||
        lower.includes("fuera") ||
        lower.includes("trabajo");

      if (isBlocking || dayEvents.length === 1) {
        hasAllDayBlocker = true;
        blockerTitle = ev.title;
        break;
      }
    }
  }

  if (hasAllDayBlocker) {
    return {
      date: dateIso,
      totalEvents: dayEvents.length,
      hasAllDayBlocker: true,
      blockerTitle,
      busyIntervals: [{ start: "07:00", end: "22:00", title: blockerTitle || "Evento de día completo" }],
      freeWindows: [],
      maxContinuousFreeMin: 0,
    };
  }

  // Franjas de tiempo del día
  const dayStartMin = dayStartHour * 60;
  const dayEndMin = dayEndHour * 60;

  // Extraer intervalos ocupados con margen de 20 min antes y 20 min después
  const busyMinutes: Array<{ start: number; end: number; title: string }> = [];

  for (const ev of dayEvents) {
    if (ev.all_day === 1) continue;

    const startHhMm = ev.start_time.slice(11, 16);
    const endHhMm = ev.end_time.slice(11, 16);

    let startM = timeToMinutes(startHhMm);
    let endM = timeToMinutes(endHhMm);

    // Margen de cortesía / desplazamiento (20 min)
    startM = Math.max(dayStartMin, startM - 20);
    endM = Math.min(dayEndMin, endM + 20);

    if (endM > startM) {
      busyMinutes.push({ start: startM, end: endM, title: ev.title });
    }
  }

  // Ordenar y fusionar intervalos solapados
  busyMinutes.sort((a, b) => a.start - b.start);

  const mergedBusy: Array<{ start: number; end: number; title: string }> = [];
  for (const cur of busyMinutes) {
    if (mergedBusy.length === 0) {
      mergedBusy.push(cur);
    } else {
      const prev = mergedBusy[mergedBusy.length - 1];
      if (cur.start <= prev.end) {
        prev.end = Math.max(prev.end, cur.end);
        prev.title = `${prev.title} / ${cur.title}`;
      } else {
        mergedBusy.push(cur);
      }
    }
  }

  // Calcular ventanas libres
  const freeWindows: Array<{ start: string; end: string; minutes: number }> = [];
  let pointer = dayStartMin;

  for (const busy of mergedBusy) {
    if (busy.start > pointer) {
      const freeDuration = busy.start - pointer;
      if (freeDuration >= 20) {
        freeWindows.push({
          start: minutesToTime(pointer),
          end: minutesToTime(busy.start),
          minutes: freeDuration,
        });
      }
    }
    pointer = Math.max(pointer, busy.end);
  }

  if (pointer < dayEndMin) {
    const freeDuration = dayEndMin - pointer;
    if (freeDuration >= 20) {
      freeWindows.push({
        start: minutesToTime(pointer),
        end: minutesToTime(dayEndMin),
        minutes: freeDuration,
      });
    }
  }

  const maxContinuousFreeMin = freeWindows.reduce((max, w) => Math.max(max, w.minutes), 0);

  return {
    date: dateIso,
    totalEvents: dayEvents.length,
    hasAllDayBlocker: false,
    blockerTitle: null,
    busyIntervals: mergedBusy.map((b) => ({
      start: minutesToTime(b.start),
      end: minutesToTime(b.end),
      title: b.title,
    })),
    freeWindows,
    maxContinuousFreeMin,
  };
}

/**
 * Genera la propuesta adaptativa cruzando la sesión del día con el análisis del calendario
 */
export function generateAdaptiveProposal(
  session: {
    id: number;
    date: string;
    discipline: string;
    planned_code: string | null;
    duration_min: number | null;
    distance_km: number | null;
    notes: string | null;
  },
  analysis: DayCalendarAnalysis,
  weekSessions: Array<{ id: number; date: string; discipline: string; planned_code: string | null }> = []
): AdaptedSessionProposal {
  const originalDuration = session.duration_min || 50;
  const bestWindow = analysis.freeWindows.reduce<{ start: string; end: string; minutes: number } | null>(
    (acc, cur) => (!acc || cur.minutes > acc.minutes ? cur : acc),
    null
  );

  const availableMin = analysis.maxContinuousFreeMin;

  // CASO A: Día libre o hueco amplio (≥ 75 min disponibles, o hueco suficiente para la sesión + 15 min de margen)
  if (analysis.totalEvents === 0 || availableMin >= Math.max(75, originalDuration + 15)) {
    return {
      status: "cleared",
      badgeLabel: `Agenda despejada · Sesión completa (${originalDuration} min)`,
      badgeTone: "success",
      availableMinutes: availableMin,
      conflictingEventTitle: null,
      busyIntervals: analysis.busyIntervals,
      bestFreeWindow: bestWindow,
      originalSession: session,
      adaptedSession: {
        discipline: session.discipline,
        planned_code: session.planned_code || "Entrenamiento programado",
        duration_min: originalDuration,
        distance_km: session.distance_km,
        notes: session.notes || "",
        adaptationReason: "Agenda con hueco suficiente; sesión mantenida al 100%.",
      },
    };
  }

  // CASO C: Día bloqueado por evento (< 25 min libres o evento de día completo)
  if (analysis.hasAllDayBlocker || availableMin < 28) {
    const blockerName = analysis.blockerTitle || analysis.busyIntervals[0]?.title || "Compromiso de agenda";

    // Buscar día libre en la misma semana para swap
    const availableRestDays = weekSessions.filter(
      (ws) => ws.date !== session.date && ws.discipline === "descanso"
    );
    const swapTargetDate = availableRestDays[0]?.date || null;

    return {
      status: "blocked",
      badgeLabel: `Día bloqueado por agenda (${blockerName}) · Reubicación sugerida`,
      badgeTone: "danger",
      availableMinutes: availableMin,
      conflictingEventTitle: blockerName,
      busyIntervals: analysis.busyIntervals,
      bestFreeWindow: bestWindow,
      swapTargetDate,
      originalSession: session,
      adaptedSession: {
        discipline: "descanso",
        planned_code: `Descanso Activo / Movilidad Express (${blockerName})`,
        duration_min: 15,
        distance_km: null,
        notes: `SESIÓN ADAPTADA POR AGENDA BLOQUEADA:\n- Compromiso detectado en el Calendario de iPhone: "${blockerName}".\n- Tiempo libre en agenda insuficiente (<25 min).\n- Plan de acción: Día de descanso activo con 10-15 min de estiramientos o drenaje miofascial al terminar el día.\n- ${swapTargetDate ? `La sesión clave se reubica hacia el ${swapTargetDate}.` : "Asimila descanso sin pérdida de estado de forma."}`,
        adaptationReason: `Bloqueo de agenda por "${blockerName}". Reubicación de carga recomendada.`,
      },
    };
  }

  // CASO B: Día con agenda apretada (30 - 65 min libres) -> VERSIÓN EXPRESS
  const targetDuration = Math.min(Math.max(availableMin - 5, 30), 45);
  const conflictingTitle = analysis.busyIntervals[0]?.title || "Agenda compacta";

  const expressSession = buildExpressSession(session, targetDuration, conflictingTitle);

  return {
    status: "adapted_express",
    badgeLabel: `Adaptado por agenda (${conflictingTitle}) · Versión Express (${targetDuration} min)`,
    badgeTone: "warning",
    availableMinutes: availableMin,
    conflictingEventTitle: conflictingTitle,
    busyIntervals: analysis.busyIntervals,
    bestFreeWindow: bestWindow,
    originalSession: session,
    adaptedSession: expressSession,
  };
}

/**
 * Compacta una sesión para que quepa en targetDuration minutos preservando el estímulo fisiológico
 */
function buildExpressSession(
  session: {
    discipline: string;
    planned_code: string | null;
    duration_min: number | null;
    distance_km: number | null;
    notes: string | null;
  },
  targetDurationMin: number,
  reason: string
): {
  discipline: string;
  planned_code: string;
  duration_min: number;
  distance_km: number | null;
  notes: string;
  adaptationReason: string;
} {
  const disc = session.discipline;

  if (disc === "carrera") {
    // Carrera Express: Calentamiento 6-8 min + Parte principal compacta + 4 min vuelta calma
    const warmKm = 1.0;
    const coolKm = 0.5;
    const mainTimeMin = targetDurationMin - 12; // tiempo para bloque clave
    // Estimar km a ritmo medio de 5:10 min/km (~0.19 km por min)
    const mainKm = Math.round((mainTimeMin / 5.2) * 10) / 10;
    const totalKm = Math.round((warmKm + mainKm + coolKm) * 10) / 10;

    const baseCode = (session.planned_code || "Rodaje").replace(/\(.*\)/, "").trim();

    return {
      discipline: "carrera",
      planned_code: `${baseCode} (Versión Express · ${mainKm} km Clave · ${totalKm} km Total)`,
      duration_min: targetDurationMin,
      distance_km: totalKm,
      notes: `RUNNING EXPRESS · Adaptación por agenda (${reason} · ${targetDurationMin} min disponibles):\n- Calentamiento (1.0 km · ~6 min · Ritmo: 5:45 - 5:30 min/km (Zona R0 suave)): Trote suave de activación rápida + movilidad dinámica.\n- Parte principal (${mainKm.toFixed(1)} km · ~${mainTimeMin} min · Estímulo concentrado): Mantener el ritmo objetivo de la sesión original concentrado en ${mainKm.toFixed(1)} km continuos sin pausas para optimizar la ventana de tiempo.\n- Vuelta a la calma (0.5 km · ~4 min · Ritmo: > 6:00 min/km): Trote muy suave y 2 min de estiramientos clave.\n- Justificación: Adaptación compacta que preserva el 85% del beneficio aeróbico en el 60% del tiempo.`,
      adaptationReason: `Ventana disponible de ${targetDurationMin} min por ${reason}. Estructura condensada con estímulo íntegro.`,
    };
  }

  if (disc === "crossfit") {
    return {
      discipline: "crossfit",
      planned_code: `CrossFit WOD Express (${targetDurationMin} min · Estímulo Concentrado)`,
      duration_min: targetDurationMin,
      distance_km: null,
      notes: `CROSSFIT EXPRESS (${targetDurationMin} min · Adaptación por agenda: ${reason}):\n- 5 min: Calentamiento dinámico y activación escapular/cadera.\n- 20-25 min: Bloque de fuerza en biseries o AMRAP de alta densidad con menor descanso para condensar la carga neuromuscular sin perder estímulo de potencia.\n- 5 min: Vuelta a la calma y estiramiento de tren inferior.\n- Objetivo: Máxima densidad de trabajo en ventana reducida.`,
      adaptationReason: `Agenda ajustada (${targetDurationMin} min). WOD condensado en bloques densos.`,
    };
  }

  if (disc === "natacion") {
    const compactMeters = Math.min(1300, Math.round((targetDurationMin / 45) * 1900 / 50) * 50);
    return {
      discipline: "natacion",
      planned_code: `NAT-Express (Pull-Buoy & Umbral · ${compactMeters}m)`,
      duration_min: targetDurationMin,
      distance_km: compactMeters / 1000,
      notes: `NATACIÓN EXPRESS (${compactMeters}m · ${targetDurationMin} min · Adaptado por: ${reason}):\n- 200m calentamiento suave continuo.\n- 800m bloque continuo con pull-buoy (series de 100m a ritmo constante con 15s descanso).\n- 200m vuelta a la calma.\n- Enfoque: Descompresión articular y estímulo aeróbico rápido.`,
      adaptationReason: `Agenda comprimida (${targetDurationMin} min). Sesión de natación concentrada a ${compactMeters}m.`,
    };
  }

  // Fallback general
  return {
    discipline: disc,
    planned_code: `${session.planned_code || "Sesión"} (Versión Express · ${targetDurationMin} min)`,
    duration_min: targetDurationMin,
    distance_km: session.distance_km ? Math.round((session.distance_km * 0.7) * 10) / 10 : null,
    notes: `SESIÓN EXPRESS ADAPTADA (${targetDurationMin} min por ${reason}):\n- Estructura condensada para cumplir el estímulo clave en la ventana de tiempo libre disponible.\n${session.notes || ""}`,
    adaptationReason: `Adaptada a ${targetDurationMin} min por disponibilidad en calendario de iPhone.`,
  };
}
