import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RouteIncident = {
  id: string;
  route: string;
  incident_date: string;
  message: string;
  created_at: string;
};

export const useRouteIncidents = (routeCode: string) => {
  const [incidents, setIncidents] = useState<RouteIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchIncidents = useCallback(async () => {
    if (!mountedRef.current) return;

    // Last 2 months
    const since = new Date();
    since.setMonth(since.getMonth() - 2);
    const sinceStr = since.toISOString().split("T")[0];

    try {
      const { data, error } = await supabase
        .from("route_incidents")
        .select("id, route, incident_date, message, created_at")
        .eq("route", routeCode)
        .gte("incident_date", sinceStr)
        .order("incident_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!mountedRef.current) return;
      if (error) {
        console.error("Error fetching incidents:", error);
        setIncidents([]);
      } else {
        setIncidents(data || []);
      }
    } catch (err) {
      console.error("Error in fetchIncidents:", err);
      if (mountedRef.current) setIncidents([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [routeCode]);

  const addIncident = useCallback(async (message: string, date?: string) => {
    const payload = {
      route: routeCode,
      message,
      incident_date: date || new Date().toISOString().split("T")[0],
    };
    console.log("[Incidents] Inserting:", payload);

    const { error, data } = await supabase
      .from("route_incidents")
      .insert(payload)
      .select();

    console.log("[Incidents] Insert result:", { error, data });

    if (error) {
      console.error("[Incidents] Insert error:", error.message, error.code, error.details);
      throw error;
    }
    // Realtime will refresh, but also force fetch
    fetchIncidents();
  }, [routeCode, fetchIncidents]);

  const deleteIncident = useCallback(async (id: string) => {
    // Optimistic: remove from UI immediately
    setIncidents((prev) => prev.filter((i) => i.id !== id));

    const { error } = await supabase
      .from("route_incidents")
      .delete()
      .eq("id", id);
    if (error) {
      // Revert on failure
      await fetchIncidents();
      throw error;
    }
  }, [fetchIncidents]);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    fetchIncidents();

    const channel = supabase
      .channel(`incidents_${routeCode}_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_incidents", filter: `route=eq.${routeCode}` },
        () => fetchIncidents()
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [routeCode, fetchIncidents]);

  return { incidents, loading, addIncident, deleteIncident, refetch: fetchIncidents };
};
