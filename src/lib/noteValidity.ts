// Vigencia de las notas de usuario: rango de fechas + turno.
// Las notas antiguas (sin fechas ni turno) siguen activas hasta que se borren.

export type NoteShift = "morning" | "afternoon" | "all";

export interface NoteValidityFields {
  valid_from?: string | null; // YYYY-MM-DD
  valid_until?: string | null; // YYYY-MM-DD
  shift?: string | null;
}

export const DEFAULT_ABSENCE_MESSAGE = "No acude";

// Fecha de hoy en Madrid, formato YYYY-MM-DD
export const madridToday = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

// Date local (la elegida en el calendario) -> YYYY-MM-DD sin desfase de zona horaria
export const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// YYYY-MM-DD -> Date local a mediodía (evita saltos de día)
export const fromDateStr = (s: string): Date => new Date(`${s}T12:00:00`);

// ¿La nota está en vigor hoy?
export const isNoteActiveToday = (n: NoteValidityFields, today: string = madridToday()): boolean => {
  if (n.valid_from && today < n.valid_from) return false;
  if (n.valid_until && today > n.valid_until) return false;
  return true;
};

// ¿La nota ha caducado ya? (para listados de administración: se muestran también las futuras)
export const isNoteExpired = (n: NoteValidityFields, today: string = madridToday()): boolean =>
  !!n.valid_until && today > n.valid_until;

// ¿La nota aplica al turno de la tabla que se está pintando?
export const noteAppliesToShift = (n: NoteValidityFields, variant: "morning" | "afternoon"): boolean => {
  if (!n.shift || n.shift === "all") return true;
  return n.shift === variant;
};

export const shiftLabel = (shift?: string | null): string => {
  if (shift === "morning") return "Mañana";
  if (shift === "afternoon") return "Tarde";
  return "Todo el día";
};

const formatShort = (s: string): string => {
  const [, m, d] = s.split("-");
  return `${d}/${m}`;
};

// "12/11" · "12/11 – 14/11" · "Sin fecha"
export const formatNoteRange = (n: NoteValidityFields): string => {
  if (!n.valid_from && !n.valid_until) return "Sin fecha";
  const from = n.valid_from || n.valid_until!;
  const until = n.valid_until || n.valid_from!;
  return from === until ? formatShort(from) : `${formatShort(from)} – ${formatShort(until)}`;
};
