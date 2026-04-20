import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Incidencia = {
  id: string;
  route: string;
  mensaje: string;
  creado_por: string;
  created_at: string;
  respuesta: string | null;
  respondido_at: string | null;
  respondido_por: string | null;
  leido_at: string | null;
  leido_por: string | null;
  estado: string;
};

export const useIncidencias = (routeCode: string) => {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchIncidencias = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      const { data, error } = await supabase
        .from("incidencias" as any)
        .select("*")
        .eq("route", routeCode)
        .order("created_at", { ascending: true });

      if (!mountedRef.current) return;
      if (error) {
        console.error("Error fetching incidencias:", error);
        setIncidencias([]);
      } else {
        setIncidencias((data as any[]) || []);
      }
    } catch (err) {
      console.error("Error in fetchIncidencias:", err);
      if (mountedRef.current) setIncidencias([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [routeCode]);

  const addIncidencia = useCallback(async (mensaje: string, creado_por: string) => {
    const payload = {
      route: routeCode,
      mensaje,
      creado_por,
      estado: "abierta",
    };

    const { error } = await supabase
      .from("incidencias" as any)
      .insert(payload);

    if (error) {
      console.error("[Incidencias] Insert error:", error);
      throw error;
    }

    // Log activity
    try {
      await supabase.from("activity_log" as any).insert({
        user_code: creado_por,
        action_type: "INCIDENCIA_CREADA",
        page_name: routeCode,
        details: { mensaje, creado_por },
      });
    } catch {}

    fetchIncidencias();
  }, [routeCode, fetchIncidencias]);

  const responderIncidencia = useCallback(async (id: string, respuesta: string) => {
    const { error } = await supabase
      .from("incidencias" as any)
      .update({
        respuesta,
        respondido_at: new Date().toISOString(),
        respondido_por: "empresa",
        estado: "respondida",
      })
      .eq("id", id);

    if (error) throw error;

    // Log activity
    try {
      const inc = incidencias.find(i => i.id === id);
      await supabase.from("activity_log" as any).insert({
        user_code: "empresa",
        action_type: "INCIDENCIA_RESPONDIDA",
        page_name: inc?.route || routeCode,
        details: { respuesta },
      });
    } catch {}

    fetchIncidencias();
  }, [routeCode, fetchIncidencias, incidencias]);

  const marcarLeida = useCallback(async (id: string, leido_por: string) => {
    const { error } = await supabase
      .from("incidencias" as any)
      .update({
        leido_at: new Date().toISOString(),
        leido_por,
        estado: "leida",
      })
      .eq("id", id);

    if (error) throw error;

    // Log activity
    try {
      await supabase.from("activity_log" as any).insert({
        user_code: leido_por,
        action_type: "INCIDENCIA_LEIDA",
        page_name: routeCode,
        details: { leido_por },
      });
    } catch {}

    fetchIncidencias();
  }, [routeCode, fetchIncidencias]);

  const deleteIncidencia = useCallback(async (id: string) => {
    setIncidencias(prev => prev.filter(i => i.id !== id));
    const { error } = await supabase
      .from("incidencias" as any)
      .delete()
      .eq("id", id);
    if (error) {
      await fetchIncidencias();
      throw error;
    }
  }, [fetchIncidencias]);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    fetchIncidencias();

    const channel = supabase
      .channel(`incidencias_${routeCode}_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidencias", filter: `route=eq.${routeCode}` },
        () => fetchIncidencias()
      )
      .subscribe();

    // Polling fallback: refetch every 15s in case realtime WebSocket drops (common in mobile PWAs)
    pollIntervalRef.current = setInterval(() => {
      if (mountedRef.current) fetchIncidencias();
    }, 15_000);

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [routeCode, fetchIncidencias]);

  return { incidencias, loading, addIncidencia, responderIncidencia, marcarLeida, deleteIncidencia, refetch: fetchIncidencias };
};

/** Hook for all incidencias (empresa panel) — merges 'incidencias' + legacy 'route_incidents' */
export const useAllIncidencias = () => {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      // Fetch from new table
      const { data: newData, error: err1 } = await supabase
        .from("incidencias" as any)
        .select("*")
        .order("created_at", { ascending: false });

      // Fetch from legacy table (last 30 days)
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      const { data: legacyData, error: err2 } = await supabase
        .from("route_incidents")
        .select("*")
        .gte("created_at", monthAgo.toISOString())
        .order("created_at", { ascending: false });

      if (err1) console.error("Error fetching incidencias:", err1);
      if (err2) console.error("Error fetching route_incidents:", err2);

      const fromNew: Incidencia[] = ((newData as any[]) || []);

      // Map legacy route_incidents to Incidencia format
      const fromLegacy: Incidencia[] = ((legacyData as any[]) || []).map((ri) => ({
        id: ri.id,
        route: ri.route,
        mensaje: ri.message,
        creado_por: "Auxiliar",
        created_at: ri.created_at,
        respuesta: null,
        respondido_at: null,
        respondido_por: null,
        leido_at: null,
        leido_por: null,
        estado: "abierta",
      }));

      // Merge and sort by date desc
      const merged = [...fromNew, ...fromLegacy].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setIncidencias(merged);
    } catch {
      setIncidencias([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const responderIncidencia = useCallback(async (id: string, respuesta: string) => {
    const legacyInc = incidencias.find(
      (i) => i.id === id && i.creado_por === "Auxiliar" && i.estado === "abierta"
    );

    const existingIncidencia = incidencias.find(
      (i) => i.id === id && (i.respuesta !== null || i.respondido_at !== null || i.respondido_por !== null || i.creado_por !== "Auxiliar" || i.estado !== "abierta")
    ) || incidencias.find((i) => i.id === id && !legacyInc);

    if (existingIncidencia) {
      const { error } = await supabase
        .from("incidencias" as any)
        .update({
          respuesta,
          respondido_at: new Date().toISOString(),
          respondido_por: "empresa",
          estado: "respondida",
        })
        .eq("id", id);

      if (error) throw error;
    } else if (legacyInc) {
      const { error: insertErr } = await supabase
        .from("incidencias" as any)
        .insert({
          route: legacyInc.route,
          mensaje: legacyInc.mensaje,
          creado_por: legacyInc.creado_por,
          respuesta,
          respondido_at: new Date().toISOString(),
          respondido_por: "empresa",
          estado: "respondida",
        });

      if (insertErr) throw insertErr;

      const { error: deleteLegacyErr } = await supabase
        .from("route_incidents")
        .delete()
        .eq("id", id);

      if (deleteLegacyErr) throw deleteLegacyErr;
    } else {
      throw new Error("No se encontró la incidencia a responder");
    }

    try {
      const inc = incidencias.find((i) => i.id === id);
      await supabase.from("activity_log" as any).insert({
        user_code: "empresa",
        action_type: "INCIDENCIA_RESPONDIDA",
        page_name: inc?.route || "",
        details: { respuesta },
      });
    } catch {}

    fetchAll();
  }, [fetchAll, incidencias]);

  useEffect(() => {
    fetchAll();

    const ch1 = supabase
      .channel(`incidencias_all_${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "incidencias" }, () => fetchAll())
      .subscribe();

    const ch2 = supabase
      .channel(`route_incidents_all_${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "route_incidents" }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [fetchAll]);

  const deleteIncidencia = useCallback(async (id: string) => {
    setIncidencias(prev => prev.filter(i => i.id !== id));

    // Try deleting from incidencias first
    const { error: err1 } = await supabase
      .from("incidencias" as any)
      .delete()
      .eq("id", id);

    // Also try deleting from legacy table
    const { error: err2 } = await supabase
      .from("route_incidents")
      .delete()
      .eq("id", id);

    if (err1 && err2) {
      console.error("Error deleting:", err1, err2);
      fetchAll();
      throw err1;
    }
  }, [fetchAll]);

  const openCount = incidencias.filter(i => i.estado === "abierta").length;

  return { incidencias, loading, openCount, responderIncidencia, deleteIncidencia, refetch: fetchAll };
};
