import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getRouteDisplayName } from "@/lib/routes";

interface RouteDelayData {
  route: string;
  totalMinutes: number;
  lateCount: number;
}

interface MonthlyDelayRankingProps {
  displayedMonth: Date;
  open: boolean;
}

function timeToMinutes(t: string): number | null {
  if (!t) return null;
  const timePart = t.split(" ")[0];
  const parts = timePart.split(":");
  if (parts.length < 2) return null;

  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;

  return h * 60 + m;
}

function calcDelay(scheduled: string, actual: string | null): number | null {
  if (!actual) return null;

  const scheduledMinutes = timeToMinutes(scheduled);
  const actualMinutes = timeToMinutes(actual);

  if (scheduledMinutes === null || actualMinutes === null) return null;
  return actualMinutes - scheduledMinutes;
}

function isMilestoneRecord(userName?: string): boolean {
  const name = (userName || "").toLowerCase();
  return name.includes("llegada al centro") || name.includes("salida del centro");
}

export const MonthlyDelayRanking = ({ displayedMonth, open }: MonthlyDelayRankingProps) => {
  const [showRanking, setShowRanking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RouteDelayData[]>([]);

  const fetchDelayRanking = async () => {
    if (showRanking) {
      setShowRanking(false);
      return;
    }
    setLoading(true);
    try {
      const year = displayedMonth.getFullYear();
      const month = displayedMonth.getMonth();
      const firstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0);
      const lastDayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;

      const { data: records, error } = await supabase
        .from("attendance_records")
        .select("route, user_name, scheduled_time, actual_time, status")
        .eq("status", "present")
        .gte("record_date", firstDay)
        .lte("record_date", lastDayStr)
        .not("actual_time", "is", null);

      if (error) throw error;

      const routeMap = new Map<string, { totalMinutes: number; lateCount: number }>();

      (records || []).forEach((record) => {
        if (isMilestoneRecord(record.user_name)) return;

        const delay = calcDelay(record.scheduled_time, record.actual_time);
        if (delay === null || delay <= 0) return;

        const route = (record.route || "SIN RUTA").trim().toUpperCase();

        if (!routeMap.has(route)) routeMap.set(route, { totalMinutes: 0, lateCount: 0 });
        const entry = routeMap.get(route)!;
        entry.totalMinutes += delay;
        entry.lateCount++;
      });

      const sorted = Array.from(routeMap.entries())
        .map(([route, stats]) => ({ route, ...stats }))
        .sort((a, b) => b.totalMinutes - a.totalMinutes);

      setData(sorted);
      setShowRanking(true);
    } catch (e) {
      console.error("Error fetching delay ranking:", e);
    } finally {
      setLoading(false);
    }
  };

  const maxMinutes = data.length > 0 ? data[0].totalMinutes : 1;

  return (
    <div>
      <Button
        onClick={fetchDelayRanking}
        variant="outline"
        size="sm"
        disabled={loading}
        className={cn(
          "gap-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30",
          showRanking && "ring-2 ring-amber-400"
        )}
      >
        <TrendingUp size={14} />
        {loading ? "Cargando..." : "Ranking retrasos del mes"}
      </Button>

      {showRanking && (
        <div className="mt-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <TrendingUp size={16} />
              Ranking retrasos — {format(displayedMonth, "MMMM yyyy", { locale: es })}
            </h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-amber-500 hover:text-amber-700"
              onClick={() => setShowRanking(false)}
            >
              <X size={14} />
            </Button>
          </div>

          {data.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-4">
              Sin retrasos registrados este mes
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {data.map((item, idx) => (
                <div key={item.route} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        idx === 0 ? "bg-red-500 text-white" :
                        idx === 1 ? "bg-amber-500 text-white" :
                        idx === 2 ? "bg-yellow-400 text-yellow-900" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-foreground">{getRouteDisplayName(item.route)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">{item.lateCount} retrasos</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        {item.totalMinutes} min
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-amber-100 dark:bg-amber-900/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${(item.totalMinutes / maxMinutes) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
