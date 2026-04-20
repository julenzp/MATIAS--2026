import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfWeek } from 'date-fns';

// Utility: parse "HH:MM" to minutes since midnight
function timeToMinutes(t: string): number | null {
  if (!t) return null;
  const parts = t.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function calcDelay(scheduled: string, actual: string | null): number | null {
  if (!actual) return null;
  const s = timeToMinutes(scheduled);
  const a = timeToMinutes(actual);
  if (s === null || a === null) return null;
  return a - s; // positive = late
}

/** Returns true for milestone / non-passenger rows that should be excluded from delay stats */
function isMilestoneRecord(r: { user_name?: string; status?: string }): boolean {
  const name = (r.user_name || '').toLowerCase();
  return name.includes('llegada al centro') || name.includes('salida del centro');
}

/** Only positive delays from present, non-milestone records */
function getPositiveDelays(records: { scheduled_time: string; actual_time: string | null; status: string; user_name?: string }[]): number[] {
  return records
    .filter(r => r.status === 'present' && !isMilestoneRecord(r))
    .map(r => calcDelay(r.scheduled_time, r.actual_time))
    .filter((d): d is number => d !== null && d > 0);
}

export interface DashboardData {
  // Summary
  rutasActivasHoy: number;
  incidenciasAbiertasHoy: number;
  retrasoMedio: number | null;
  usuariosTransportados: number;
  rutasConIncidencia: number;
  // Route table
  routeTableData: {
    ruta: string;
    estado: string;
    retrasoMedio: string;
    incidencias: number;
    registros: number;
  }[];
  // Charts
  retrasosPorRuta: { ruta: string; minutos: number }[];
  incidenciasPorDia: { fecha: string; incidencias: number }[];
  puntualidadSemanal: { semana: string; porcentaje: number }[];
  // Incidents
  incidents: {
    id: string;
    ruta: string;
    fecha: string;
    mensaje: string;
  }[];
}

async function fetchDashboardData(): Promise<DashboardData> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const days28ago = format(subDays(new Date(), 28), 'yyyy-MM-dd');
  const days7ago = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  // Parallel queries — all SELECT only
  const [attendanceRes, incidentsRes, incidents28Res, attendance7Res] = await Promise.all([
    // Today's attendance
    supabase
      .from('attendance_records')
      .select('id, route, scheduled_time, actual_time, status, user_name')
      .eq('record_date', today),
    // Today's incidents
    supabase
      .from('route_incidents')
      .select('id, route, incident_date, message')
      .eq('incident_date', today),
    // Last 28 days incidents (for chart)
    supabase
      .from('route_incidents')
      .select('id, route, incident_date, message')
      .gte('incident_date', days28ago)
      .order('incident_date', { ascending: false }),
    // Last 7 days attendance (for charts)
    supabase
      .from('attendance_records')
      .select('id, route, scheduled_time, actual_time, status, record_date, user_name')
      .gte('record_date', days7ago),
  ]);

  const todayAttendance = attendanceRes.data || [];
  const todayIncidents = incidentsRes.data || [];
  const incidents28 = incidents28Res.data || [];
  const attendance7 = attendance7Res.data || [];

  // === BLOQUE 1: Summary metrics ===
  const activeRoutes = new Set(todayAttendance.map(r => r.route).filter(Boolean));
  const rutasActivasHoy = activeRoutes.size;

  const incidenciasAbiertasHoy = todayIncidents.length;

  // Delay calculation — only positive delays from present, non-milestone records
  const delays = getPositiveDelays(todayAttendance);
  const retrasoMedio = delays.length > 0
    ? Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10
    : null;

  const usuariosTransportados = todayAttendance.filter(r => r.status === 'present').length;

  const rutasConIncidenciaSet = new Set(todayIncidents.map(i => i.route));
  const rutasConIncidencia = rutasConIncidenciaSet.size;

  // === Route table ===
  const routeMap = new Map<string, { delays: number[]; statuses: string[]; incCount: number }>();
  for (const r of todayAttendance) {
    const route = r.route || 'Sin ruta';
    if (!routeMap.has(route)) routeMap.set(route, { delays: [], statuses: [], incCount: 0 });
    const entry = routeMap.get(route)!;
    entry.statuses.push(r.status);
    // Only count positive delays from present, non-milestone records
    if (r.status === 'present' && !isMilestoneRecord(r)) {
      const d = calcDelay(r.scheduled_time, r.actual_time);
      if (d !== null && d > 0) entry.delays.push(d);
    }
  }
  for (const inc of todayIncidents) {
    const route = inc.route;
    if (routeMap.has(route)) {
      routeMap.get(route)!.incCount++;
    } else {
      routeMap.set(route, { delays: [], statuses: [], incCount: 1 });
    }
  }

  const routeTableData = Array.from(routeMap.entries()).map(([ruta, data]) => {
    const hasPending = data.statuses.includes('pending');
    const hasPresent = data.statuses.includes('present');
    const allDone = data.statuses.length > 0 && !hasPending;
    const estado = hasPending && hasPresent ? 'En ruta' : allDone ? 'Finalizada' : hasPending ? 'Pendiente' : 'Sin datos';
    const avgDelay = data.delays.length > 0
      ? Math.round(data.delays.reduce((a, b) => a + b, 0) / data.delays.length)
      : null;
    return {
      ruta,
      estado,
      retrasoMedio: avgDelay !== null ? `${avgDelay} min` : '—',
      incidencias: data.incCount,
      registros: data.statuses.length,
    };
  }).sort((a, b) => a.ruta.localeCompare(b.ruta));

  // === BLOQUE 2: Charts ===

  // Retrasos por ruta (7 days) — only positive delays from present, non-milestone records
  const routeDelayMap = new Map<string, number[]>();
  for (const r of attendance7) {
    if (r.status !== 'present') continue;
    if (isMilestoneRecord(r as any)) continue;
    const d = calcDelay(r.scheduled_time, r.actual_time);
    if (d !== null && d > 0 && r.route) {
      if (!routeDelayMap.has(r.route)) routeDelayMap.set(r.route, []);
      routeDelayMap.get(r.route)!.push(d);
    }
  }
  const retrasosPorRuta = Array.from(routeDelayMap.entries())
    .map(([ruta, delays]) => ({
      ruta,
      minutos: Math.round(delays.reduce((a, b) => a + b, 0) / delays.length * 10) / 10,
    }))
    .sort((a, b) => a.ruta.localeCompare(b.ruta));

  // Incidencias por día (28 days)
  const incByDay = new Map<string, number>();
  for (const inc of incidents28) {
    const d = inc.incident_date;
    incByDay.set(d, (incByDay.get(d) || 0) + 1);
  }
  const incidenciasPorDia = Array.from(incByDay.entries())
    .map(([fecha, incidencias]) => ({ fecha, incidencias }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Puntualidad por semana (7 days grouped)
  const weekMap = new Map<string, { onTime: number; total: number }>();
  for (const r of attendance7) {
    if (!r.actual_time || !r.scheduled_time) continue;
    const weekStart = format(startOfWeek(new Date(r.record_date), { weekStartsOn: 1 }), 'dd/MM');
    if (!weekMap.has(weekStart)) weekMap.set(weekStart, { onTime: 0, total: 0 });
    const entry = weekMap.get(weekStart)!;
    entry.total++;
    const d = calcDelay(r.scheduled_time, r.actual_time);
    if (d !== null && d <= 0) entry.onTime++;
  }
  const puntualidadSemanal = Array.from(weekMap.entries())
    .map(([semana, data]) => ({
      semana: `Sem ${semana}`,
      porcentaje: data.total > 0 ? Math.round((data.onTime / data.total) * 100) : 0,
    }));

  // Incidents list (last 28 days)
  const incidents = incidents28.map(i => ({
    id: i.id,
    ruta: i.route,
    fecha: i.incident_date,
    mensaje: i.message,
  }));

  return {
    rutasActivasHoy,
    incidenciasAbiertasHoy,
    retrasoMedio,
    usuariosTransportados,
    rutasConIncidencia,
    routeTableData,
    retrasosPorRuta,
    incidenciasPorDia,
    puntualidadSemanal,
    incidents,
  };
}

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard-data'],
    queryFn: fetchDashboardData,
    staleTime: 60_000, // 1 min
    refetchOnWindowFocus: false,
  });
}
