import React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar as CalendarIcon, X, Check, Clock, Users, Sun, Moon, Clock3, FileText, ChevronDown, Copy, Share2, Timer } from "lucide-react";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import { DailyDelayRanking } from "./calendar/DailyDelayRanking";
import { MonthlyAbsenceRanking } from "./calendar/MonthlyAbsenceRanking";
import { DailyExcelExport } from "./calendar/DailyExcelExport";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getRouteDisplayName } from "@/lib/routes";
import { useRoute } from "@/context/RouteContext";
import { format, getDaysInMonth } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { MATIA_ALLOWED_ROUTES } from "@/lib/matiaRoutes";

interface AttendanceRecord {
  user_name: string;
  scheduled_time: string;
  actual_time: string | null;
  status: string;
  route: string | null;
}

interface DaySummary {
  total: number;
  present: number;
  absent: number;
  pending: number;
  late: number;
  waiting: number;
  morningRecords: AttendanceRecord[];
  afternoonRecords: AttendanceRecord[];
}

const AVAILABLE_ROUTES = [
  { value: "ALL", label: "Guztiak / Todas" },
  { value: "ASPACE", label: "1. ASPACE INTXAURRONDO" },
  { value: "AMARAEN", label: "GUREAK, Amaraene" },
  { value: "AMARAEN FINDE", label: "2. GUREAK, Amaraene FINDE" },
  { value: "BERMINGHAM", label: "3. MATIA BERMINGHAM" },
  { value: "EGILUZE", label: "MATIA EGILUZE" },
  { value: "FRAISORO", label: "4. MATIA FRAISORO" },
  { value: "FRAISORO_2", label: "5. MATIA FRAISORO 2" },
  { value: "IGELDO", label: "6. MATIA IGELDO" },
  { value: "LAMOROUSE", label: "7. MATIA LAMOROUSE" },
  { value: "LASARTE", label: "8. MATIA LASARTE" },
  { value: "MATIA", label: "9. MATIA REZOLA" },
  { value: "EGURTZEGI", label: "10. MATIA USURBIL" },
  { value: "ARGIXAO_1", label: "11. MATIA ARGIXAO BUS 1" },
  { value: "ARGIXAO_2", label: "12. MATIA ARGIXAO BUS 2" },
];

const isMorningTime = (time: string): boolean => {
  const [hours] = time.split(":").map(Number);
  return hours < 13;
};

const calculateMinutesLate = (scheduledTime: string, actualTime: string): number => {
  const [schedHours, schedMins] = scheduledTime.split(":").map(Number);
  const [actHours, actMins] = actualTime.split(":").map(Number);

  const scheduledMinutes = schedHours * 60 + schedMins;
  const actualMinutes = actHours * 60 + actMins;

  return actualMinutes - scheduledMinutes;
};

interface RouteAccordionItemProps {
  routeName: string;
  records: AttendanceRecord[];
  presentCount: number;
  absentCount: number;
  pendingCount: number;
  calculateMinutesLate: (scheduled: string, actual: string) => number;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusClass: (status: string) => string;
  defaultOpen?: boolean;
}

const RouteAccordionItem = ({
  routeName,
  records,
  presentCount,
  absentCount,
  pendingCount,
  calculateMinutesLate: calcLate,
  getStatusIcon: statusIcon,
  getStatusClass: statusClass,
  defaultOpen = false,
}: RouteAccordionItemProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-purple-200 dark:border-purple-700 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wide truncate">
            📍 {getRouteDisplayName(routeName)}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 text-[10px]">
            <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 font-bold px-1.5 py-0.5 rounded">{presentCount}</span>
            {absentCount > 0 && (
              <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 font-bold px-1.5 py-0.5 rounded">{absentCount}</span>
            )}
            {pendingCount > 0 && (
              <span className="bg-muted text-muted-foreground font-bold px-1.5 py-0.5 rounded">{pendingCount}</span>
            )}
          </div>
          <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">{records.length}</span>
          <ChevronDown
            size={16}
            className={cn(
              "text-purple-500 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>
      {isOpen && (
        <div className="px-2 py-1.5 space-y-1 bg-background animate-fade-in">
          {records.map((record, idx) => {
            const minutesLate = record.status === "present" && record.actual_time
              ? calcLate(record.scheduled_time, record.actual_time)
              : 0;
            const isLate = minutesLate > 0;
            const hasLateMarker = record.status === "present" && record.actual_time?.includes('T+');

            return (
              <div
                key={idx}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg text-sm",
                  hasLateMarker
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : statusClass(record.status)
                )}
              >
                <div className="flex items-center gap-2">
                  {hasLateMarker
                    ? <Clock size={14} className="text-amber-600 dark:text-amber-400" />
                    : statusIcon(record.status)}
                  <span className="font-medium truncate max-w-[140px]">{record.user_name}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {record.status === "absent" ? (
                    <span className="font-bold text-foreground line-through">
                      {record.scheduled_time}
                    </span>
                  ) : (
                    <span>
                      {record.scheduled_time}
                      {isLate && (
                        <span className="font-bold text-red-600 dark:text-red-400 ml-1">
                          (+{minutesLate}')
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const CalendarSummary = () => {
  const { currentRoute } = useRoute();
  const [open, setOpen] = useState(false);
  const activeRoute = (currentRoute || "").trim().toUpperCase();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('erbi:open-calendar', handler);
    return () => window.removeEventListener('erbi:open-calendar', handler);
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedRoute, setSelectedRoute] = useState<string>(activeRoute || "ALL");
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAbsentDetail, setShowAbsentDetail] = useState(false);
  const [showLateDetail, setShowLateDetail] = useState(false);
  const [showPendingDetail, setShowPendingDetail] = useState(false);
  const [showWaitingDetail, setShowWaitingDetail] = useState(false);
  const [monthDayCounts, setMonthDayCounts] = useState<Record<string, number>>({});

  const displayedMonth = selectedDate || new Date();

  useEffect(() => {
    if (!open) return;
    const year = displayedMonth.getFullYear();
    const month = displayedMonth.getMonth();
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0);
    const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

    (async () => {
      try {
        let allRecords: { record_date: string }[] = [];
        const pageSize = 1000;
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          const from = page * pageSize;
          const to = from + pageSize - 1;
          let query = supabase
            .from("attendance_records")
            .select("record_date")
            .gte("record_date", firstDay)
            .lte("record_date", lastDayStr);

          if (selectedRoute !== "ALL") {
            query = query.eq("route", selectedRoute);
          }

          const { data, error: err } = await query.range(from, to);
          if (err) break;
          if (!data || data.length === 0) {
            hasMore = false;
          } else {
            allRecords = [...allRecords, ...data];
            hasMore = data.length === pageSize;
            page++;
          }
        }

        const counts: Record<string, number> = {};
        allRecords.forEach((r) => {
          counts[r.record_date] = (counts[r.record_date] || 0) + 1;
        });
        setMonthDayCounts(counts);
      } catch {
        setMonthDayCounts({});
      }
    })();
  }, [open, displayedMonth.getFullYear(), displayedMonth.getMonth(), selectedRoute]);


  useEffect(() => {
    if (selectedDate && open) {
      setShowAbsentDetail(false);
      setShowLateDetail(false);
      setShowPendingDetail(false);
      setShowWaitingDetail(false);
      fetchDaySummary(selectedDate, selectedRoute);
    }
  }, [selectedDate, open, selectedRoute]);

  const fetchDaySummary = async (date: Date, route: string) => {
    setLoading(true);
    const dateStr = format(date, "yyyy-MM-dd");

    try {
      const { data: records, error: recordsError } = await supabase
        .from("attendance_records")
        .select("user_name, scheduled_time, actual_time, status, route")
        .eq("record_date", dateStr)
        .order("scheduled_time", { ascending: true });

      if (recordsError) throw recordsError;

      let allRecords: AttendanceRecord[] = records || [];
      if (route !== "ALL") {
        const wanted = route.trim().toUpperCase();
        allRecords = allRecords.filter((r) => (r.route || "").trim().toUpperCase() === wanted);
      }

      const parseTimeToMinutes = (time: string): number => {
        const [hours, mins] = time.split(":").map(Number);
        return (hours || 0) * 60 + (mins || 0);
      };

      allRecords = [...allRecords].sort((a, b) => {
        const timeA = parseTimeToMinutes(a.scheduled_time);
        const timeB = parseTimeToMinutes(b.scheduled_time);
        if (timeA !== timeB) return timeA - timeB;
        return a.user_name.localeCompare(b.user_name);
      });

      const morningRecords = allRecords.filter((r) => isMorningTime(r.scheduled_time));
      const afternoonRecords = allRecords.filter((r) => !isMorningTime(r.scheduled_time));

      const daySummary: DaySummary = {
        total: allRecords.length,
        present: allRecords.filter((r) => r.status === "present").length,
        absent: allRecords.filter((r) => r.status === "absent").length,
        pending: allRecords.filter((r) => r.status === "pending").length,
        late: allRecords.filter((r) => r.status === "present" && r.actual_time?.includes('T+')).length,
        waiting: allRecords.filter((r) => r.status === "absent" && r.actual_time?.includes('E+')).length,
        morningRecords,
        afternoonRecords,
      };

      setSummary(daySummary);
    } catch (error) {
      console.error("Error fetching day summary:", error);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const exportDayToWord = async () => {
    if (!summary || !selectedDate) return;

    const dateStr = format(selectedDate, "d MMMM yyyy", { locale: es });
    const routeLabel = selectedRoute === "ALL" ? "Todas las rutas" : selectedRoute;
    const allRecords = [...summary.morningRecords, ...summary.afternoonRecords];

    // Group by route
    const byRoute = allRecords.reduce((acc, r) => {
      const name = (r.route || "Sin ruta").trim().toUpperCase();
      if (!acc[name]) acc[name] = [];
      acc[name].push(r);
      return acc;
    }, {} as Record<string, AttendanceRecord[]>);

    const sortedRoutes = Object.keys(byRoute).sort();

    const sections: Paragraph[] = [];

    // Title
    sections.push(new Paragraph({
      children: [new TextRun({ text: `Informe diario - ${dateStr}`, bold: true, size: 32 })],
      spacing: { after: 100 },
    }));
    sections.push(new Paragraph({
      children: [new TextRun({ text: `Ruta: ${routeLabel}`, bold: true, size: 24, color: '6b21a8' })],
      spacing: { after: 200 },
    }));

    // Summary stats
    sections.push(new Paragraph({
      children: [
        new TextRun({ text: `Total: ${summary.total}  |  `, bold: true }),
        new TextRun({ text: `Presentes: ${summary.present}  |  `, color: '16a34a', bold: true }),
        new TextRun({ text: `Ausentes: ${summary.absent}  |  `, color: 'dc2626', bold: true }),
        new TextRun({ text: `Faltas: ${summary.late}  |  `, color: 'b45309', bold: true }),
        new TextRun({ text: `Pendientes: ${summary.pending}`, color: '6b7280', bold: true }),
      ],
      spacing: { after: 300 },
    }));

    const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

    for (const routeName of sortedRoutes) {
      const records = byRoute[routeName];
      
      // Route header
      sections.push(new Paragraph({
        children: [new TextRun({ text: routeName, bold: true, size: 26, color: '6b21a8' })],
        spacing: { before: 300, after: 100 },
      }));

      // Table header
      const headerRow = new TableRow({
        children: [
          new TableCell({ shading: { fill: '7c3aed' }, children: [new Paragraph({ children: [new TextRun({ text: 'Usuario', bold: true, color: 'FFFFFF', size: 20 })], alignment: AlignmentType.CENTER })], width: { size: 35, type: WidthType.PERCENTAGE } }),
          new TableCell({ shading: { fill: '7c3aed' }, children: [new Paragraph({ children: [new TextRun({ text: 'H.Prog', bold: true, color: 'FFFFFF', size: 20 })], alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE } }),
          new TableCell({ shading: { fill: '7c3aed' }, children: [new Paragraph({ children: [new TextRun({ text: 'H.Real', bold: true, color: 'FFFFFF', size: 20 })], alignment: AlignmentType.CENTER })], width: { size: 20, type: WidthType.PERCENTAGE } }),
          new TableCell({ shading: { fill: '7c3aed' }, children: [new Paragraph({ children: [new TextRun({ text: 'Estado', bold: true, color: 'FFFFFF', size: 20 })], alignment: AlignmentType.CENTER })], width: { size: 30, type: WidthType.PERCENTAGE } }),
        ],
      });

      const dataRows = records.map(record => {
        const statusText = record.status === 'present' 
          ? (record.actual_time?.includes('T+') ? 'Tarde' : 'Presente') 
          : record.status === 'absent' ? 'Ausente' : 'Pendiente';
        const statusColor = record.status === 'present' 
          ? (record.actual_time?.includes('T+') ? 'b45309' : '16a34a') 
          : record.status === 'absent' ? 'dc2626' : '6b7280';
        const rowFill = record.status === 'absent' ? 'fee2e2' : record.actual_time?.includes('T+') ? 'fef3c7' : 'f0fdf4';

        return new TableRow({
          children: [
            new TableCell({ shading: { fill: rowFill }, children: [new Paragraph({ children: [new TextRun({ text: record.user_name, size: 20 })], alignment: AlignmentType.LEFT })]}),
            new TableCell({ shading: { fill: rowFill }, children: [new Paragraph({ children: [new TextRun({ text: record.scheduled_time, size: 20 })], alignment: AlignmentType.CENTER })]}),
            new TableCell({ shading: { fill: rowFill }, children: [new Paragraph({ children: [new TextRun({ text: record.actual_time || '-', size: 20 })], alignment: AlignmentType.CENTER })]}),
            new TableCell({ shading: { fill: rowFill }, children: [new Paragraph({ children: [new TextRun({ text: statusText, bold: true, color: statusColor, size: 20 })], alignment: AlignmentType.CENTER })]}),
          ],
        });
      });

      const table = new Table({
        rows: [headerRow, ...dataRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
      });

      sections.push(new Paragraph({ children: [] }));
      sections.push(...[table as any]);

      // Route subtotals
      const rPresent = records.filter(r => r.status === 'present' && !r.actual_time?.includes('T+')).length;
      const rLate = records.filter(r => r.actual_time?.includes('T+')).length;
      const rAbsent = records.filter(r => r.status === 'absent').length;
      const rPending = records.filter(r => r.status === 'pending').length;

      sections.push(new Paragraph({
        children: [
          new TextRun({ text: `  Presentes: ${rPresent}`, color: '16a34a', size: 18 }),
          new TextRun({ text: `  |  Ausentes: ${rAbsent}`, color: 'dc2626', size: 18 }),
          new TextRun({ text: `  |  Faltas: ${rLate}`, color: 'b45309', size: 18 }),
          new TextRun({ text: `  |  Pendientes: ${rPending}`, color: '6b7280', size: 18 }),
        ],
        spacing: { before: 100, after: 200 },
      }));
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: sections,
      }],
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `Informe_${format(selectedDate, 'yyyy-MM-dd')}_${selectedRoute === 'ALL' ? 'TODAS' : selectedRoute}.docx`;
    saveAs(blob, fileName);
  };

  const generateMonthlySummaryText = useCallback(async (onlyMatia: boolean): Promise<string | null> => {
    if (!selectedDate) return null;
    
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const monthName = format(selectedDate, "MMMM yyyy", { locale: es });

    try {
      // Fetch ALL records for the month using pagination (Supabase default limit is 1000)
      let allRecords: any[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        const { data: records, error } = await supabase
          .from("attendance_records")
          .select("user_name, scheduled_time, actual_time, status, route, record_date")
          .gte("record_date", startDate)
          .lte("record_date", endDate)
          .order("record_date")
          .order("scheduled_time")
          .range(from, to);

        if (error) throw error;
        if (!records || records.length === 0) {
          hasMore = false;
        } else {
          allRecords = [...allRecords, ...records];
          hasMore = records.length === pageSize;
          page++;
        }
      }

      if (allRecords.length === 0) return null;

      // Filter by MATIA routes if needed
      const matiaSet = new Set(MATIA_ALLOWED_ROUTES.map(r => r.trim().toUpperCase()));
      const filtered = onlyMatia
        ? allRecords.filter(r => matiaSet.has((r.route || "").trim().toUpperCase()))
        : allRecords;

      if (filtered.length === 0) return null;

      // Group by route
      const byRoute: Record<string, typeof filtered> = {};
      filtered.forEach(r => {
        const route = (r.route || "SIN RUTA").trim().toUpperCase();
        if (!byRoute[route]) byRoute[route] = [];
        byRoute[route].push(r);
      });

      const sortedRoutes = Object.keys(byRoute).sort();

      let text = onlyMatia
        ? `📊 RESUMEN MENSUAL MATIA — ${monthName.toUpperCase()}\n`
        : `📊 RESUMEN MENSUAL — ${monthName.toUpperCase()}\n`;
      text += `${'─'.repeat(40)}\n\n`;

      let totalPresent = 0, totalAbsent = 0, totalPending = 0, totalLate = 0, grandTotal = 0;

      for (const routeName of sortedRoutes) {
        const recs = byRoute[routeName];
        const present = recs.filter(r => r.status === "present").length;
        const absent = recs.filter(r => r.status === "absent").length;
        const pending = recs.filter(r => r.status === "pending").length;
        const late = recs.filter(r => r.status === "present" && r.actual_time?.includes("T+")).length;
        const pct = recs.length > 0 ? ((present / recs.length) * 100).toFixed(1) : "0";

        totalPresent += present;
        totalAbsent += absent;
        totalPending += pending;
        totalLate += late;
        grandTotal += recs.length;

        text += `📍 ${routeName}\n`;
        text += `   ✅ ${present}  ❌ ${absent}  ⏳ ${pending}  ⏰ ${late}  |  ${pct}% asistencia\n\n`;
      }

      const grandPct = grandTotal > 0 ? ((totalPresent / grandTotal) * 100).toFixed(1) : "0";
      text += `${'─'.repeat(40)}\n`;
      text += `📋 TOTAL: ${grandTotal} registros\n`;
      text += `   ✅ Presentes: ${totalPresent}\n`;
      text += `   ❌ Ausentes: ${totalAbsent}\n`;
      text += `   ⏰ Tarde: ${totalLate}\n`;
      text += `   ⏳ Pendientes: ${totalPending}\n`;
      text += `   📈 Asistencia global: ${grandPct}%\n`;

      return text;
    } catch (err) {
      console.error("Error generating monthly summary:", err);
      return null;
    }
  }, [selectedDate]);

  const handleMonthlyCopyOrShare = useCallback(async (onlyMatia: boolean) => {
    const text = await generateMonthlySummaryText(onlyMatia);
    if (!text) {
      toast.error("No hay datos para el mes seleccionado");
      return;
    }

    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ text });
        toast.success("Compartido correctamente");
        return;
      } catch (e) {
        // User cancelled or not supported, fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Resumen mensual copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar al portapapeles");
    }
  }, [generateMonthlySummaryText]);

  const getStatusIcon = (status: string) => {
    if (status === "present") return <Check size={14} className="text-green-500" />;
    if (status === "absent") return <X size={14} className="text-red-500" />;
    return <Clock size={14} className="text-muted-foreground" />;
  };

  const getStatusClass = (status: string) => {
    if (status === "present") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (status === "absent") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    return "bg-muted text-muted-foreground";
  };

  const renderRecordsList = (records: AttendanceRecord[], title: string, icon: React.ReactNode) => {
    if (records.length === 0) return null;

    // Group by route
    const groupedByRoute =
      selectedRoute === "ALL"
        ? records.reduce((acc, record) => {
            const routeName = (record.route || "Sin ruta").trim().toUpperCase() || "Sin ruta";
            if (!acc[routeName]) acc[routeName] = [];
            acc[routeName].push(record);
            return acc;
          }, {} as Record<string, AttendanceRecord[]>)
        : { [selectedRoute.trim().toUpperCase()]: records };

    const sortedRouteEntries = Object.entries(groupedByRoute).sort(([a], [b]) => a.localeCompare(b));

    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm flex items-center gap-2 text-primary">
          {icon}
          {title} ({records.length})
        </h4>
        <div className="space-y-1">
          {sortedRouteEntries.map(([routeName, routeRecords]) => {
            const presentCount = routeRecords.filter(r => r.status === "present").length;
            const absentCount = routeRecords.filter(r => r.status === "absent").length;
            const pendingCount = routeRecords.filter(r => r.status === "pending").length;

            return (
              <RouteAccordionItem
                key={routeName}
                routeName={routeName}
                records={routeRecords}
                presentCount={presentCount}
                absentCount={absentCount}
                pendingCount={pendingCount}
                calculateMinutesLate={calculateMinutesLate}
                getStatusIcon={getStatusIcon}
                getStatusClass={getStatusClass}
                defaultOpen={selectedRoute !== "ALL"}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="default"
          className="h-12 px-4 rounded-lg gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md"
          title="Egutegia / Calendario histórico"
        >
          <CalendarIcon size={22} strokeWidth={2.5} />
          <span className="hidden sm:inline text-sm">Historial</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:!max-w-[640px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CalendarIcon size={20} />
            Egutegia / Calendario
          </SheetTitle>
          <SheetDescription>
            Hautatu data bat laburpena ikusteko / Selecciona una fecha para ver el resumen
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">

          {/* Calendar */}
          <div className="flex justify-center overflow-x-auto">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              onMonthChange={(month) => setSelectedDate(month)}
              className="p-3 pointer-events-auto rounded-lg border"
              dayCounts={monthDayCounts}
              locale={es}
            />
          </div>
          {/* Route Selector — prominent, just above day summary */}
          <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 p-3">
            <label className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide mb-1.5 block">
              📍 Ibilbidea / Ruta
            </label>
            <Select value={selectedRoute} onValueChange={setSelectedRoute}>
              <SelectTrigger className="w-full h-11 text-sm font-semibold bg-white dark:bg-background border-purple-300 dark:border-purple-600 focus:ring-purple-400">
                <SelectValue placeholder="Hautatu ibilbidea / Seleccionar ruta" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_ROUTES.map((route) => (
                  <SelectItem key={route.value} value={route.value}>
                    {route.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Day Summary */}
          {selectedDate && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3 capitalize">
                {format(selectedDate, "EEEE, d MMMM yyyy", { locale: es })}
              </h3>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Kargatzen... / Cargando...
                </div>
              ) : summary ? (
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-background rounded-lg p-2 text-center">
                      <div className="text-xl font-bold text-primary">{summary.total}</div>
                      <div className="text-[10px] text-muted-foreground">Total</div>
                    </div>
                    <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-2 text-center">
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">{summary.present}</div>
                      <div className="text-[10px] text-green-700 dark:text-green-400">Presente</div>
                    </div>
                    <button 
                      onClick={() => summary.absent > 0 && setShowAbsentDetail(!showAbsentDetail)}
                      className={cn(
                        "bg-red-100 dark:bg-red-900/30 rounded-lg p-2 text-center transition-all",
                        summary.absent > 0 && "cursor-pointer hover:ring-2 hover:ring-red-400 active:scale-95",
                        showAbsentDetail && "ring-2 ring-red-500 shadow-md"
                      )}
                      title={summary.absent > 0 ? "Ver ausentes por ruta" : ""}
                    >
                      <div className="text-xl font-bold text-red-600 dark:text-red-400">{summary.absent}</div>
                      <div className="text-[10px] text-red-700 dark:text-red-400">Ausente</div>
                    </button>
                    <button 
                      onClick={() => summary.late > 0 && setShowLateDetail(!showLateDetail)}
                      className={cn(
                        "bg-amber-100 dark:bg-amber-900/30 rounded-lg p-2 text-center transition-all",
                        summary.late > 0 && "cursor-pointer hover:ring-2 hover:ring-amber-400 active:scale-95",
                        showLateDetail && "ring-2 ring-amber-500 shadow-md"
                      )}
                      title={summary.late > 0 ? "Ver llegadas tarde por ruta" : ""}
                    >
                      <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{summary.late}</div>
                      <div className="text-[10px] text-amber-700 dark:text-amber-400">Tarde</div>
                    </button>
                    <button 
                      onClick={() => summary.waiting > 0 && setShowWaitingDetail(!showWaitingDetail)}
                      className={cn(
                        "bg-orange-100 dark:bg-orange-900/30 rounded-lg p-2 text-center transition-all",
                        summary.waiting > 0 && "cursor-pointer hover:ring-2 hover:ring-orange-400 active:scale-95",
                        showWaitingDetail && "ring-2 ring-orange-500 shadow-md"
                      )}
                      title={summary.waiting > 0 ? "Ver esperas activas por ruta" : ""}
                    >
                      <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{summary.waiting}</div>
                      <div className="text-[10px] text-orange-700 dark:text-orange-400">⏱ Espera y marcha bus</div>
                    </button>
                    <button 
                      onClick={() => summary.pending > 0 && setShowPendingDetail(!showPendingDetail)}
                      className={cn(
                        "bg-background rounded-lg p-2 text-center transition-all",
                        summary.pending > 0 && "cursor-pointer hover:ring-2 hover:ring-gray-400 active:scale-95",
                        showPendingDetail && "ring-2 ring-gray-500 shadow-md"
                      )}
                      title={summary.pending > 0 ? "Ver pendientes por ruta" : ""}
                    >
                      <div className="text-xl font-bold text-muted-foreground">{summary.pending}</div>
                      <div className="text-[10px] text-muted-foreground">Pendiente</div>
                    </button>
                    </div>

                    {/* Export buttons - grid 2 columnas */}
                    {summary.total > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={exportDayToWord}
                          variant="outline"
                          className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/30"
                        >
                          <FileText size={16} />
                          Exportar Word
                        </Button>
                        <DailyExcelExport
                          selectedDate={selectedDate!}
                          selectedRoute={selectedRoute}
                          morningRecords={summary.morningRecords}
                          afternoonRecords={summary.afternoonRecords}
                        />
                      </div>
                    )}

                    {/* Monthly ranking buttons */}
                    <div className="flex flex-wrap gap-2">
                      {selectedDate && <DailyDelayRanking selectedDate={selectedDate} open={open} />}
                      <MonthlyAbsenceRanking displayedMonth={displayedMonth} open={open} />
                    </div>

                    {/* Monthly share/copy buttons - grid 2 columnas */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleMonthlyCopyOrShare(false)}
                        variant="outline"
                        className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/30"
                      >
                        <Share2 size={16} />
                        Enviar Todas
                      </Button>
                      <Button
                        onClick={() => handleMonthlyCopyOrShare(true)}
                        variant="outline"
                        className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/30"
                      >
                        <Share2 size={16} />
                        Enviar MATIA
                      </Button>
                    </div>
                  {showAbsentDetail && summary.absent > 0 && (() => {
                    const allRecords = [...summary.morningRecords, ...summary.afternoonRecords];
                    const absentRecords = allRecords.filter(r => r.status === "absent");
                    
                    // Group by route
                    const byRoute = absentRecords.reduce((acc, r) => {
                      const routeName = (r.route || "Sin ruta").trim().toUpperCase() || "Sin ruta";
                      if (!acc[routeName]) acc[routeName] = [];
                      acc[routeName].push(r);
                      return acc;
                    }, {} as Record<string, AttendanceRecord[]>);

                    // Sort routes alphabetically
                    const sortedRoutes = Object.keys(byRoute).sort();

                    return (
                      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                            <X size={16} />
                            Ausentes del día ({absentRecords.length})
                          </h4>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-red-500 hover:text-red-700"
                            onClick={() => setShowAbsentDetail(false)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-3">
                          {sortedRoutes.map(routeName => (
                            <div key={routeName} className="space-y-1">
                              <div className="text-xs font-bold text-purple-800 dark:text-purple-400 uppercase tracking-wide px-1 py-1 border-b border-red-200 dark:border-red-800">
                                {routeName} ({byRoute[routeName].length})
                              </div>
                              {byRoute[routeName].map((record, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-1.5 rounded-lg bg-red-100/60 dark:bg-red-900/20 text-sm"
                                >
                                  <div className="flex items-center gap-2">
                                    <X size={12} className="text-red-500 shrink-0" />
                                    <span className="font-medium text-red-800 dark:text-red-300 truncate max-w-[160px]">
                                      {record.user_name}
                                    </span>
                                  </div>
                                  <span className="text-xs font-bold text-red-600 dark:text-red-400 line-through">
                                    {record.scheduled_time}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Late detail by route - shown when clicking the amber badge */}
                  {showLateDetail && summary.late > 0 && (() => {
                    const allRecords = [...summary.morningRecords, ...summary.afternoonRecords];
                    const lateRecords = allRecords.filter(r => r.status === "present" && r.actual_time?.includes('T+'));
                    
                    // Group by route
                    const byRoute = lateRecords.reduce((acc, r) => {
                      const routeName = (r.route || "Sin ruta").trim().toUpperCase() || "Sin ruta";
                      if (!acc[routeName]) acc[routeName] = [];
                      acc[routeName].push(r);
                      return acc;
                    }, {} as Record<string, AttendanceRecord[]>);

                    const sortedRoutes = Object.keys(byRoute).sort();

                    return (
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                            <Clock3 size={16} />
                            Llegadas tarde del día ({lateRecords.length})
                          </h4>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-amber-500 hover:text-amber-700"
                            onClick={() => setShowLateDetail(false)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-3">
                          {sortedRoutes.map(routeName => (
                            <div key={routeName} className="space-y-1">
                              <div className="text-xs font-bold text-purple-800 dark:text-purple-400 uppercase tracking-wide px-1 py-1 border-b border-amber-200 dark:border-amber-800">
                                {routeName} ({byRoute[routeName].length})
                              </div>
                              {byRoute[routeName].map((record, idx) => {
                                const delayMatch = record.actual_time?.match(/\(T\+(.*?)\)/);
                                const delayText = delayMatch ? delayMatch[1] : "";
                                const arrivalTime = record.actual_time?.split('(')[0].trim() || "";
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between p-1.5 rounded-lg bg-amber-100/60 dark:bg-amber-900/20 text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Clock3 size={12} className="text-amber-600 shrink-0" />
                                      <span className="font-medium text-amber-800 dark:text-amber-300 truncate max-w-[120px]">
                                        {record.user_name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-amber-700 dark:text-amber-400">
                                        {arrivalTime}
                                      </span>
                                      <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded">
                                        +{delayText}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Waiting detail by route - shown when clicking the orange badge */}
                  {showWaitingDetail && summary.waiting > 0 && (() => {
                    const allRecords = [...summary.morningRecords, ...summary.afternoonRecords];
                    const waitingRecords = allRecords.filter(r => r.status === "absent" && r.actual_time?.includes('E+'));
                    
                    const byRoute = waitingRecords.reduce((acc, r) => {
                      const routeName = (r.route || "Sin ruta").trim().toUpperCase() || "Sin ruta";
                      if (!acc[routeName]) acc[routeName] = [];
                      acc[routeName].push(r);
                      return acc;
                    }, {} as Record<string, AttendanceRecord[]>);

                    const sortedRoutes = Object.keys(byRoute).sort();

                    return (
                      <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-3 space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-orange-700 dark:text-orange-400 flex items-center gap-2">
                            <Timer size={16} />
                            Espera y marcha bus ({waitingRecords.length})
                          </h4>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-orange-500 hover:text-orange-700"
                            onClick={() => setShowWaitingDetail(false)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-3">
                          {sortedRoutes.map(routeName => (
                            <div key={routeName} className="space-y-1">
                              <div className="text-xs font-bold text-purple-800 dark:text-purple-400 uppercase tracking-wide px-1 py-1 border-b border-orange-200 dark:border-orange-800">
                                {routeName} ({byRoute[routeName].length})
                              </div>
                              {byRoute[routeName].map((record, idx) => {
                                const waitMatch = record.actual_time?.match(/\(E\+(.*?)\)/);
                                const waitText = waitMatch ? waitMatch[1] : "";
                                const departTime = record.actual_time?.split('(')[0].trim() || "";
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between p-1.5 rounded-lg bg-orange-100/60 dark:bg-orange-900/20 text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Timer size={12} className="text-orange-600 shrink-0" />
                                      <span className="font-medium text-orange-800 dark:text-orange-300 truncate max-w-[120px]">
                                        {record.user_name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-orange-700 dark:text-orange-400">
                                        {departTime}
                                      </span>
                                      <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded">
                                        {waitText}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Pending detail by route - shown when clicking the gray badge */}
                  {showPendingDetail && summary.pending > 0 && (() => {
                    const allRecords = [...summary.morningRecords, ...summary.afternoonRecords];
                    const pendingRecords = allRecords.filter(r => r.status === "pending");
                    
                    const byRoute = pendingRecords.reduce((acc, r) => {
                      const routeName = (r.route || "Sin ruta").trim().toUpperCase() || "Sin ruta";
                      if (!acc[routeName]) acc[routeName] = [];
                      acc[routeName].push(r);
                      return acc;
                    }, {} as Record<string, AttendanceRecord[]>);

                    const sortedRoutes = Object.keys(byRoute).sort();

                    return (
                      <div className="bg-muted/50 border border-border rounded-xl p-3 space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                            <Clock size={16} />
                            Pendientes del día ({pendingRecords.length})
                          </h4>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPendingDetail(false)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-3">
                          {sortedRoutes.map(routeName => (
                            <div key={routeName} className="space-y-1">
                              <div className="text-xs font-bold text-purple-800 dark:text-purple-400 uppercase tracking-wide px-1 py-1 border-b border-border">
                                {routeName} ({byRoute[routeName].length})
                              </div>
                              {byRoute[routeName].map((record, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-1.5 rounded-lg bg-muted/60 text-sm"
                                >
                                  <div className="flex items-center gap-2">
                                    <Clock size={12} className="text-muted-foreground shrink-0" />
                                    <span className="font-medium text-foreground truncate max-w-[140px]">
                                      {record.user_name}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {record.scheduled_time}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {renderRecordsList(
                    summary.morningRecords, 
                    "Goiza / Mañana", 
                    <Sun size={16} className="text-amber-500" />
                  )}

                  {/* Afternoon Records */}
                  {renderRecordsList(
                    summary.afternoonRecords, 
                    "Arratsaldea / Tarde", 
                    <Moon size={16} className="text-indigo-500" />
                  )}

                  {/* No records message */}
                  {summary.morningRecords.length === 0 && summary.afternoonRecords.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      Ez dago erregistrorik egun honetan
                      <br />
                      No hay registros para este día
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Ez dago daturik / No hay datos
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
