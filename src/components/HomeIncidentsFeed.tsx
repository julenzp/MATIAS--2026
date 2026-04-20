import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

export const HomeIncidentsFeed = () => {
  const [openCount, setOpenCount] = useState(0);

  const fetchOpenCount = useCallback(async () => {
    // Count from new 'incidencias' table (estado = abierta)
    const { count: c1 } = await supabase
      .from("incidencias" as any)
      .select("id", { count: "exact", head: true })
      .eq("estado", "abierta");

    // Count from legacy 'route_incidents' table (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { count: c2 } = await supabase
      .from("route_incidents")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString());

    setOpenCount((c1 || 0) + (c2 || 0));
  }, []);

  useEffect(() => {
    fetchOpenCount();

    const ch1 = supabase
      .channel("home_incidencias_open")
      .on("postgres_changes", { event: "*", schema: "public", table: "incidencias" }, () => fetchOpenCount())
      .subscribe();

    const ch2 = supabase
      .channel("home_route_incidents")
      .on("postgres_changes", { event: "*", schema: "public", table: "route_incidents" }, () => fetchOpenCount())
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [fetchOpenCount]);

  if (openCount === 0) return null;

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("erbi:open-incidencias"));
  };

  return (
    <button
      onClick={handleClick}
      className="absolute right-3 top-3 flex items-center gap-2.5 bg-destructive/90 backdrop-blur-md rounded-2xl px-4 py-3 border-2 border-destructive/50 z-10 hover:bg-destructive transition-colors cursor-pointer shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-pulse"
    >
      <AlertTriangle size={28} className="text-destructive-foreground drop-shadow-lg" strokeWidth={2.5} />
      <span className="min-w-[36px] h-9 flex items-center justify-center rounded-full bg-white text-destructive text-lg font-black px-2.5 shadow-lg">
        {openCount}
      </span>
    </button>
  );
};
