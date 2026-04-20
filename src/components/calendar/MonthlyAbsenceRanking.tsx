import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X, UserX, Filter } from "lucide-react";
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

interface AbsenceData {
  userName: string;
  route: string;
  absentDays: number;
}

interface MonthlyAbsenceRankingProps {
  displayedMonth: Date;
  open: boolean;
}

export const MonthlyAbsenceRanking = ({ displayedMonth, open }: MonthlyAbsenceRankingProps) => {
  const [showRanking, setShowRanking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AbsenceData[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>("ALL");

  const fetchAbsenceRanking = async () => {
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
        .select("user_name, route, record_date")
        .eq("status", "absent")
        .gte("record_date", firstDay)
        .lte("record_date", lastDayStr);

      if (error) throw error;

      const userMap = new Map<string, { userName: string; route: string; dates: Set<string> }>();
      const EXCLUDED = new Set(["ZENTRO", "zentro", "Llegada al centro", "Salida del centro"]);

      (records || []).forEach((r) => {
        if (EXCLUDED.has(r.user_name)) return;
        const route = (r.route || "SIN RUTA").trim().toUpperCase();
        const key = `${r.user_name}|${route}`;
        if (!userMap.has(key)) {
          userMap.set(key, { userName: r.user_name, route, dates: new Set() });
        }
        userMap.get(key)!.dates.add(r.record_date);
      });

      const sorted = Array.from(userMap.values())
        .map((v) => ({ userName: v.userName, route: v.route, absentDays: v.dates.size }))
        .filter((v) => v.absentDays > 0)
        .sort((a, b) => b.absentDays - a.absentDays);

      setData(sorted);
      setSelectedRoute("ALL");
      setShowRanking(true);
    } catch (e) {
      console.error("Error fetching absence ranking:", e);
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

  return (
    <div>
      <Button
        onClick={fetchAbsenceRanking}
        variant="outline"
        size="sm"
        disabled={loading}
        className={cn(
          "gap-2 text-xs border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30",
          showRanking && "ring-2 ring-red-400"
        )}
      >
        <UserX size={14} />
        {loading ? "Cargando..." : "Ausencias del mes"}
      </Button>

      {showRanking && (
        <div className="mt-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
              <UserX size={16} />
              Ausencias — {format(displayedMonth, "MMMM yyyy", { locale: es })}
            </h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-500 hover:text-red-700"
              onClick={() => setShowRanking(false)}
            >
              <X size={14} />
            </Button>
          </div>

          {/* Route filter */}
          {availableRoutes.length > 1 && (
            <div className="flex items-center gap-2">
              <Filter size={12} className="text-red-600 dark:text-red-400 shrink-0" />
              <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                <SelectTrigger className="h-7 text-xs border-red-300 dark:border-red-700">
                  <SelectValue placeholder="Filtrar por ruta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas las rutas ({data.length})</SelectItem>
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
              Sin ausencias registradas{selectedRoute !== "ALL" ? ` en ${selectedRoute}` : " este mes"}
            </p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {/* Header */}
              <div className={cn(
                "grid gap-2 text-[10px] font-bold text-muted-foreground uppercase px-2 pb-1 border-b border-red-200 dark:border-red-800",
                selectedRoute === "ALL" ? "grid-cols-[1fr_auto_auto]" : "grid-cols-[1fr_auto]"
              )}>
                <span>Pasajero</span>
                {selectedRoute === "ALL" && <span>Ruta</span>}
                <span className="text-right">Días</span>
              </div>
              {filteredData.map((item, idx) => (
                <div
                  key={`${item.userName}-${item.route}`}
                  className={cn(
                    "grid gap-2 items-center p-2 rounded-lg text-sm",
                    selectedRoute === "ALL" ? "grid-cols-[1fr_auto_auto]" : "grid-cols-[1fr_auto]",
                    idx < 3 ? "bg-red-100/80 dark:bg-red-900/30" : "bg-red-50/50 dark:bg-red-950/20"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                      idx === 0 ? "bg-red-600 text-white" :
                      idx === 1 ? "bg-red-400 text-white" :
                      idx === 2 ? "bg-red-300 text-red-900" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {idx + 1}
                    </span>
                    <span className="font-medium text-foreground truncate">{item.userName}</span>
                  </div>
                  {selectedRoute === "ALL" && (
                    <span className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded whitespace-nowrap">
                      {getRouteDisplayName(item.route)}
                    </span>
                  )}
                  <span className="font-bold text-red-700 dark:text-red-400 text-right min-w-[32px]">
                    {item.absentDays}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
