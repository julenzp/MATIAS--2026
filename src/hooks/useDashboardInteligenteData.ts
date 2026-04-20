import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardInteligenteData {
  rutasActivas: string[];
  incidenciasAbiertas: number;
  totalUsuarios: number;
  estadoGeneral: "Operativo" | "Con incidencias";
  routeTable: { route: string; centro: string; turno: string; estado: string; incidencias: number }[];
  incidenciasRecientes: { id: string; fecha: string; ruta: string; mensaje: string }[];
}

async function fetchDashboardInteligenteData(): Promise<DashboardInteligenteData> {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  // Active routes (from schedule_trips)
  const { data: trips } = await supabase
    .from("schedule_trips")
    .select("route")
    .eq("is_active", true);
  const rutasActivas = trips ? [...new Set(trips.map((t) => t.route))] : [];

  // Incidents (last 7 days)
  const { data: incidents } = await supabase
    .from("route_incidents")
    .select("id, route, message, incident_date, created_at")
    .gte("incident_date", weekAgo)
    .order("incident_date", { ascending: false })
    .limit(50);

  const todayIncidents = (incidents || []).filter((i) => i.incident_date === today);
  const incidenciasAbiertas = todayIncidents.length;

  // Total users
  const { count } = await supabase
    .from("passengers")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  const totalUsuarios = count ?? 0;

  // Route table
  const CENTROS: Record<string, string> = {
    ASPACE: "ASPACE Intxaurrondo",
    MATIA: "Matia Rezola",
    "AMARAEN FINDE": "Gureak Amaraene",
    BERMINGHAM: "Matia Bermingham",
    FRAISORO: "Matia Fraisoro",
    FRAISORO_2: "Matia Fraisoro 2",
    IGELDO: "Matia Igeldo",
    LAMOROUSE: "Matia Lamorouse",
    LASARTE: "Matia Lasarte",
    EGURTZEGI: "Matia Usurbil",
    EGILUZE: "Egiluze",
  };

  const incidentsByRoute = new Map<string, number>();
  for (const inc of todayIncidents) {
    incidentsByRoute.set(inc.route, (incidentsByRoute.get(inc.route) || 0) + 1);
  }

  const routeTable = rutasActivas.map((route) => {
    const incCount = incidentsByRoute.get(route) || 0;
    return {
      route,
      centro: CENTROS[route] || route,
      turno: "Diario",
      estado: incCount > 0 ? "Con incidencias" : "Operativo",
      incidencias: incCount,
    };
  });

  const incidenciasRecientes = (incidents || []).slice(0, 10).map((i) => ({
    id: i.id,
    fecha: i.incident_date,
    ruta: i.route,
    mensaje: i.message,
  }));

  return {
    rutasActivas,
    incidenciasAbiertas,
    totalUsuarios,
    estadoGeneral: incidenciasAbiertas === 0 ? "Operativo" : "Con incidencias",
    routeTable,
    incidenciasRecientes,
  };
}

export function useDashboardInteligenteData() {
  return useQuery({
    queryKey: ["dashboard-inteligente"],
    queryFn: fetchDashboardInteligenteData,
    staleTime: 60_000,
  });
}
