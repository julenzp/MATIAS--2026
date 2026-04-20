import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X, TrendingUp, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getRouteDisplayName } from "@/lib/routes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PassengerDelayData {
  userName: string;
  route: string;
  delayMinutes: number;
}

interface DailyDelayRankingProps {
  selectedDate: Date;
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
  const s = timeToMinutes(scheduled);
  const a = timeToMinutes(actual);
  if (s === null || a === null) return null;
  return a - s;
}

function isMilestoneRecord(userName?: string): boolean {
  const name = (userName || "").toLowerCase();
  return name.includes("llegada al centro") || name.includes("salida del centro");
}

export const DailyDelayRanking = ({ selectedDate, open }: DailyDelayRankingProps) => {
  const [showRanking, setShowRanking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PassengerDelayData[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>("ALL");

  const fetchDelayRanking = async () => {
    if (showRanking) {
      setShowRanking(false);
      return;
    }
    setLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      const { data: records, error } = await supabase
        .from("attendance_records")
        .select("route, user_name, scheduled_time, actual_time, status")
        .eq("status", "present")
        .eq("record_date", dateStr)
        .not("actual_time", "is", null);

      if (error) throw error;

      const results: PassengerDelayData[] = [];

      (records || []).forEach((record) => {
        if (isMilestoneRecord(record.user_name)) return;
        const delay = calcDelay(record.scheduled_time, record.actual_time);
        if (delay === null || delay <= 0) return;

        results.push({
          userName: record.user_name,
          route: (record.route || "SIN RUTA").trim().toUpperCase(),
          delayMinutes: delay,
        });
      });

      results.sort((a, b) => b.delayMinutes - a.delayMinutes);
      setData(results);
      setSelectedRoute("ALL");
      setShowRanking(true);
    } catch (e) {
      console.error("Error fetching daily delay ranking:", e);
    } finally {
      setLoading(false);
    }
  };

  const availableRoutes = useMemo(() => {
    const routes = new Set(data.map((d) => d.route));
    return Array.from(routes).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    if (selectedRoute === "ALL") return data;
    return data.filter((d) => d.route === selectedRoute);
  }, [data, selectedRoute]);

  const maxMinutes = filteredData.length > 0 ? filteredData[0].delayMinutes : 1;

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
        {loading ? "Cargando..." : "Retrasos del día"}
      </Button>

      {showRanking && (
        <div className="mt-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <TrendingUp size={16} />
              Retrasos — {format(selectedDate, "d MMMM yyyy", { locale: es })}
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

          {/* Route filter */}
          {availableRoutes.length > 1 && (
            <div className="flex items-center gap-2">
              <Filter size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                <SelectTrigger className="h-7 text-xs border-amber-300 dark:border-amber-700">
                  <SelectValue placeholder="Filtrar por ruta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas las rutas ({availableRoutes.length})</SelectItem>
                  {availableRoutes.map((route) => {
                    const count = data.filter((d) => d.route === route).length;
                    return (
                      <SelectItem key={route} value={route}>
                        {getRouteDisplayName(route)} ({count})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {filteredData.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-4">
              Sin retrasos registrados{selectedRoute !== "ALL" ? ` en ${getRouteDisplayName(selectedRoute)}` : " este día"}
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredData.map((item, idx) => (
                <div key={`${item.userName}-${item.route}-${idx}`} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                        idx === 0 ? "bg-red-500 text-white" :
                        idx === 1 ? "bg-amber-500 text-white" :
                        idx === 2 ? "bg-yellow-400 text-yellow-900" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {idx + 1}
                      </span>
                      <span className="font-medium text-foreground truncate">{item.userName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs shrink-0">
                      {selectedRoute === "ALL" && (
                        <span className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded whitespace-nowrap">
                          {getRouteDisplayName(item.route)}
                        </span>
                      )}
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        +{item.delayMinutes} min
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-amber-100 dark:bg-amber-900/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${(item.delayMinutes / maxMinutes) * 100}%` }}
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
