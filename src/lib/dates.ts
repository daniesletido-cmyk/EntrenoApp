export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// Lunes de la semana que contiene la fecha dada (YYYY-MM-DD) -> YYYY-MM-DD
export function weekStartOf(dateStr: string): string {
  const d = parseISODate(dateStr);
  const day = d.getUTCDay(); // 0 domingo .. 6 sabado
  const diff = day === 0 ? -6 : 1 - day; // llevar a lunes
  d.setUTCDate(d.getUTCDate() + diff);
  return toISODate(d);
}

export function addDays(dateStr: string, days: number): string {
  const d = parseISODate(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

export const DAY_NAMES_ES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// 1 = lunes ... 7 = domingo, a partir de una fecha YYYY-MM-DD
export function isoDayOfWeek(dateStr: string): number {
  const d = parseISODate(dateStr);
  const day = d.getUTCDay();
  return day === 0 ? 7 : day;
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function toLocalISODate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toLocalISODate(new Date());
}
