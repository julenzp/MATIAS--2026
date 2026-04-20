import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

interface DailyRouteRecordCountProps {
  routeCode: string;
}

const getTodayRecordDate = () => {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
};

export const DailyRouteRecordCount = ({ routeCode }: DailyRouteRecordCountProps) => {
  const [counts, setCounts] = useState<{ total: number; present: number; absent: number; pending: number } | null>(null);

  useEffect(() => {
    if (!routeCode) return;
    const today = getTodayRecordDate();

    const fetchCounts = async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("status")
        .eq("record_date", today)
        .eq("route", routeCode);

      if (error || !data) return;

      const present = data.filter((r) => r.status === "present").length;
      const absent = data.filter((r) => r.status === "absent").length;
      const pending = data.filter((r) => r.status === "pending").length;
      setCounts({ total: data.length, present, absent, pending });
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 30_000);
    return () => clearInterval(interval);
  }, [routeCode]);

  if (!counts || counts.total === 0) return null;

  return (
    <div className="inline-flex items-center gap-2 bg-muted/80 px-3 py-1.5 rounded-lg text-xs font-semibold">
      <Users size={14} className="text-primary shrink-0" />
      <span className="text-foreground">{counts.total} reg.</span>
      {counts.present > 0 && <span className="text-emerald-600 dark:text-emerald-400">✓{counts.present}</span>}
      {counts.absent > 0 && <span className="text-destructive">✗{counts.absent}</span>}
      {counts.pending > 0 && <span className="text-muted-foreground">⏳{counts.pending}</span>}
    </div>
  );
};
