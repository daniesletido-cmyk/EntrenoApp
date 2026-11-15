/**
 * RFC 5545 iCalendar (.ics) Parser ligero y autónomo para EntrenoApp
 * Soporta feeds de iCloud (Apple Calendar), CalDAV, Google Calendar y Outlook.
 * Normaliza a hora local 'Europe/Madrid' y expande eventos recurrentes (RRULE)
 * en una ventana de evaluación configurable (por defecto 14 días).
 */

export interface ParsedCalendarEvent {
  id: string;
  title: string;
  start_time: string; // Formato ISO local YYYY-MM-DDTHH:mm:ss
  end_time: string;
  all_day: number; // 0 o 1
  location?: string;
  description?: string;
  source?: string;
}

/**
 * Despliega líneas compuestas (line unfolding) según RFC 5545 §3.1
 * Las líneas que empiezan por espacio o tabulación se unen a la línea anterior.
 */
export function unfoldICalLines(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = normalized.split("\n");
  const unfolded: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (line.startsWith(" ") || line.startsWith("\t")) {
      if (unfolded.length > 0) {
        unfolded[unfolded.length - 1] += line.slice(1);
      }
    } else if (line.trim().length > 0) {
      unfolded.push(line);
    }
  }

  return unfolded;
}

/**
 * Decodifica secuencias de escape RFC 5545: \, -> , | \; -> ; | \n -> salto de línea
 */
function unescapeICalText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

/**
 * Parsea una fecha/hora RFC 5545
 * Casos habituales:
 * - 20261115 (All-Day, VALUE=DATE)
 * - 20261115T093000Z (UTC)
 * - 20261115T103000 (Local / TZID=Europe/Madrid)
 */
export function parseICalDate(
  value: string,
  params: string = ""
): { date: Date; allDay: boolean; isoLocal: string } {
  const cleanVal = value.trim();
  const isDateOnly = cleanVal.length === 8 && !cleanVal.includes("T");
  const hasValueDate = params.includes("VALUE=DATE");

  if (isDateOnly || hasValueDate) {
    const year = parseInt(cleanVal.slice(0, 4), 10);
    const month = parseInt(cleanVal.slice(4, 6), 10) - 1;
    const day = parseInt(cleanVal.slice(6, 8), 10);
    const d = new Date(Date.UTC(year, month, day, 0, 0, 0));
    const pad = (n: number) => String(n).padStart(2, "0");
    const isoLocal = `${year}-${pad(month + 1)}-${pad(day)}T00:00:00`;
    return { date: d, allDay: true, isoLocal };
  }

  // DateTime format: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  const match = cleanVal.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (match) {
    const [, y, m, d, hh, mm, ss, z] = match;
    const pad = (n: number | string) => String(n).padStart(2, "0");

    if (z === "Z") {
      // Fecha en UTC: convertir a hora local en Europe/Madrid (+1h en invierno, +2h en verano)
      const utcDate = new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss));
      // Formatear en hora española
      const madridFmt = new Intl.DateTimeFormat("es-ES", {
        timeZone: "Europe/Madrid",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(utcDate);

      const parts: Record<string, string> = {};
      for (const p of madridFmt) parts[p.type] = p.value;
      const isoLocal = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
      return { date: utcDate, allDay: false, isoLocal };
    } else {
      // Fecha local (habitual en iCloud con TZID=Europe/Madrid)
      const isoLocal = `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
      const dObj = new Date(+y, +m - 1, +d, +hh, +mm, +ss);
      return { date: dObj, allDay: false, isoLocal };
    }
  }

  // Fallback si no encaja con regex estándar
  const fallbackDate = new Date(cleanVal);
  return {
    date: isNaN(fallbackDate.getTime()) ? new Date() : fallbackDate,
    allDay: false,
    isoLocal: cleanVal,
  };
}

/**
 * Parsea una duración RFC 5545 (ej: PT1H30M, PT45M, P1D)
 */
function parseICalDurationMs(duration: string): number {
  let ms = 0;
  const match = duration.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/);
  if (!match) return 3600000; // default 1h
  const [, d, h, m, s] = match;
  if (d) ms += parseInt(d, 10) * 86400000;
  if (h) ms += parseInt(h, 10) * 3600000;
  if (m) ms += parseInt(m, 10) * 60000;
  if (s) ms += parseInt(s, 10) * 1000;
  return ms > 0 ? ms : 3600000;
}

interface RawVEvent {
  uid: string;
  summary: string;
  dtstart: string;
  dtstartParams: string;
  dtend?: string;
  dtendParams?: string;
  duration?: string;
  rrule?: string;
  location?: string;
  description?: string;
}

/**
 * Parsea el feed completo .ics y expande eventos entre windowStart y windowEnd
 */
export function parseICalFeed(
  icsContent: string,
  daysForward: number = 14,
  baseDate: Date = new Date()
): ParsedCalendarEvent[] {
  const lines = unfoldICalLines(icsContent);
  const rawEvents: RawVEvent[] = [];
  let currentEvent: RawVEvent | null = null;

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const propFull = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1);
    const semicolonIdx = propFull.indexOf(";");
    const propName = (semicolonIdx !== -1 ? propFull.slice(0, semicolonIdx) : propFull).toUpperCase();
    const propParams = semicolonIdx !== -1 ? propFull.slice(semicolonIdx + 1) : "";

    if (propName === "BEGIN" && value.toUpperCase() === "VEVENT") {
      currentEvent = {
        uid: "",
        summary: "",
        dtstart: "",
        dtstartParams: "",
      };
    } else if (propName === "END" && value.toUpperCase() === "VEVENT") {
      if (currentEvent && currentEvent.dtstart) {
        if (!currentEvent.uid) {
          currentEvent.uid = `event-${rawEvents.length}-${Date.now()}`;
        }
        rawEvents.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      switch (propName) {
        case "UID":
          currentEvent.uid = value.trim();
          break;
        case "SUMMARY":
          currentEvent.summary = unescapeICalText(value);
          break;
        case "DTSTART":
          currentEvent.dtstart = value.trim();
          currentEvent.dtstartParams = propParams;
          break;
        case "DTEND":
          currentEvent.dtend = value.trim();
          currentEvent.dtendParams = propParams;
          break;
        case "DURATION":
          currentEvent.duration = value.trim();
          break;
        case "RRULE":
          currentEvent.rrule = value.trim();
          break;
        case "LOCATION":
          currentEvent.location = unescapeICalText(value);
          break;
        case "DESCRIPTION":
          currentEvent.description = unescapeICalText(value);
          break;
      }
    }
  }

  // Definir ventana de tiempo [windowStart, windowEnd]
  const windowStart = new Date(baseDate);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + daysForward);
  windowEnd.setHours(23, 59, 59, 999);

  const results: ParsedCalendarEvent[] = [];

  for (const ev of rawEvents) {
    const startParsed = parseICalDate(ev.dtstart, ev.dtstartParams);
    let endParsed = ev.dtend
      ? parseICalDate(ev.dtend, ev.dtendParams)
      : null;

    if (!endParsed) {
      if (startParsed.allDay) {
        const dEnd = new Date(startParsed.date);
        dEnd.setHours(23, 59, 59, 999);
        const isoEnd = startParsed.isoLocal.slice(0, 10) + "T23:59:59";
        endParsed = { date: dEnd, allDay: true, isoLocal: isoEnd };
      } else if (ev.duration) {
        const ms = parseICalDurationMs(ev.duration);
        const dEnd = new Date(startParsed.date.getTime() + ms);
        endParsed = { date: dEnd, allDay: false, isoLocal: new Date(new Date(startParsed.isoLocal).getTime() + ms).toISOString().slice(0, 19) };
      } else {
        // Por defecto 1 hora si no especifica fin
        const dEnd = new Date(startParsed.date.getTime() + 3600000);
        endParsed = { date: dEnd, allDay: false, isoLocal: new Date(new Date(startParsed.isoLocal).getTime() + 3600000).toISOString().slice(0, 19) };
      }
    }

    // Duración en milisegundos de la instancia
    const durationMs = Math.max(endParsed.date.getTime() - startParsed.date.getTime(), 1800000);

    // Caso 1: Evento no recurrente
    if (!ev.rrule) {
      if (startParsed.date <= windowEnd && endParsed.date >= windowStart) {
        results.push({
          id: ev.uid,
          title: ev.summary || "Compromiso de agenda",
          start_time: startParsed.isoLocal,
          end_time: endParsed.isoLocal,
          all_day: startParsed.allDay ? 1 : 0,
          location: ev.location,
          description: ev.description,
          source: "ical",
        });
      }
      continue;
    }

    // Caso 2: Evento recurrente (RRULE)
    const rruleProps: Record<string, string> = {};
    for (const part of ev.rrule.split(";")) {
      const [k, v] = part.split("=");
      if (k && v) rruleProps[k.toUpperCase()] = v.toUpperCase();
    }

    const freq = rruleProps["FREQ"];
    const interval = parseInt(rruleProps["INTERVAL"] || "1", 10);
    const count = rruleProps["COUNT"] ? parseInt(rruleProps["COUNT"], 10) : Infinity;
    const until = rruleProps["UNTIL"] ? parseICalDate(rruleProps["UNTIL"]).date : null;
    const byDay = rruleProps["BYDAY"] ? rruleProps["BYDAY"].split(",") : null;

    let curDate = new Date(startParsed.date);
    let occurrences = 0;

    // Iterar para encontrar ocurrencias dentro de la ventana
    // Máximo 100 iteraciones de seguridad para no bloquear el bucle
    let loopGuard = 0;
    while (curDate <= windowEnd && occurrences < count && loopGuard < 120) {
      loopGuard++;

      if (until && curDate > until) break;

      const instEnd = new Date(curDate.getTime() + durationMs);

      // Comprobar si coincide con BYDAY si está especificado
      let dayMatches = true;
      if (byDay && byDay.length > 0) {
        const dayCodeMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
        const curCode = dayCodeMap[curDate.getDay()];
        dayMatches = byDay.some((b) => b.includes(curCode));
      }

      if (dayMatches && curDate <= windowEnd && instEnd >= windowStart && curDate >= startParsed.date) {
        occurrences++;

        // Formatear ISO local de esta instancia
        const pad = (n: number) => String(n).padStart(2, "0");
        const instStartIso = `${curDate.getFullYear()}-${pad(curDate.getMonth() + 1)}-${pad(curDate.getDate())}T${pad(curDate.getHours())}:${pad(curDate.getMinutes())}:${pad(curDate.getSeconds())}`;
        const instEndIso = `${instEnd.getFullYear()}-${pad(instEnd.getMonth() + 1)}-${pad(instEnd.getDate())}T${pad(instEnd.getHours())}:${pad(instEnd.getMinutes())}:${pad(instEnd.getSeconds())}`;

        results.push({
          id: `${ev.uid}_${instStartIso.slice(0, 10).replace(/-/g, "")}`,
          title: ev.summary || "Compromiso recurrente",
          start_time: instStartIso,
          end_time: instEndIso,
          all_day: startParsed.allDay ? 1 : 0,
          location: ev.location,
          description: ev.description,
          source: "ical",
        });
      }

      // Avanzar fecha según FREQ
      if (freq === "DAILY") {
        curDate.setDate(curDate.getDate() + interval);
      } else if (freq === "WEEKLY") {
        if (byDay && byDay.length > 1) {
          // Si tiene múltiples días por semana, avanzamos 1 día a la vez comprobando BYDAY
          curDate.setDate(curDate.getDate() + 1);
        } else {
          curDate.setDate(curDate.getDate() + (7 * interval));
        }
      } else if (freq === "MONTHLY") {
        curDate.setMonth(curDate.getMonth() + interval);
      } else if (freq === "YEARLY") {
        curDate.setFullYear(curDate.getFullYear() + interval);
      } else {
        curDate.setDate(curDate.getDate() + 1);
      }
    }
  }

  // Ordenar por hora de inicio ascendente
  results.sort((a, b) => a.start_time.localeCompare(b.start_time));

  return results;
}
