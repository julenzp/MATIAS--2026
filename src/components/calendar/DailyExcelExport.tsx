import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";

interface AttendanceRecord {
  user_name: string;
  scheduled_time: string;
  actual_time: string | null;
  status: string;
  route: string | null;
}

interface DailyExcelExportProps {
  selectedDate: Date;
  selectedRoute: string;
  morningRecords: AttendanceRecord[];
  afternoonRecords: AttendanceRecord[];
}

const isMorningTime = (time: string): boolean => {
  const [hours] = time.split(":").map(Number);
  return hours < 13;
};

const calculateMinutesLate = (scheduledTime: string, actualTime: string): number => {
  const [schedH, schedM] = scheduledTime.split(":").map(Number);
  const [actH, actM] = actualTime.split(":").map(Number);
  return (actH * 60 + actM) - (schedH * 60 + schedM);
};

export const DailyExcelExport = ({ selectedDate, selectedRoute, morningRecords, afternoonRecords }: DailyExcelExportProps) => {
  const [exporting, setExporting] = useState(false);

  const exportToExcel = () => {
    setExporting(true);
    try {
      const allRecords = [...morningRecords, ...afternoonRecords];
      const dateStr = format(selectedDate, "d MMMM yyyy", { locale: es });
      const routeLabel = selectedRoute === "ALL" ? "Todas las rutas" : selectedRoute;

      const sheetData: any[][] = [];
      sheetData.push([`Informe diario - ${dateStr}`]);
      sheetData.push([`Ruta: ${routeLabel}`]);
      sheetData.push([]);
      sheetData.push(["Pasajero", "Ruta", "Turno", "Hora Programada", "Hora Real", "Estado", "Retraso (min)"]);

      allRecords.forEach((r) => {
        const turno = isMorningTime(r.scheduled_time) ? "Mañana" : "Tarde";
        const statusLabel =
          r.status === "present"
            ? r.actual_time?.includes("T+") ? "Tarde" : "Presente"
            : r.status === "absent" ? "Ausente" : "Pendiente";

        let delayMin: number | string = "-";
        if (r.status === "present" && r.actual_time) {
          const cleanTime = r.actual_time.split("(")[0].trim();
          const mins = calculateMinutesLate(r.scheduled_time, cleanTime);
          if (mins > 0) delayMin = mins;
        }

        sheetData.push([
          r.user_name,
          (r.route || "Sin ruta").trim().toUpperCase(),
          turno,
          r.scheduled_time,
          r.actual_time || "-",
          statusLabel,
          delayMin,
        ]);
      });

      // Summary
      const present = allRecords.filter((r) => r.status === "present" && !r.actual_time?.includes("T+")).length;
      const late = allRecords.filter((r) => r.actual_time?.includes("T+")).length;
      const absent = allRecords.filter((r) => r.status === "absent").length;
      const pending = allRecords.filter((r) => r.status === "pending").length;

      sheetData.push([]);
      sheetData.push(["RESUMEN"]);
      sheetData.push(["Total registros:", allRecords.length]);
      sheetData.push(["Presentes:", present]);
      sheetData.push(["Tarde:", late]);
      sheetData.push(["Ausentes:", absent]);
      sheetData.push(["Pendientes:", pending]);

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = [
        { wch: 25 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 14 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Informe diario");

      const fileName = `Informe_${format(selectedDate, "yyyy-MM-dd")}_${selectedRoute === "ALL" ? "TODAS" : selectedRoute}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (e) {
      console.error("Error exporting daily Excel:", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      onClick={exportToExcel}
      variant="outline"
      disabled={exporting}
      className="w-full gap-2 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/30"
    >
      {exporting ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <FileSpreadsheet size={16} />
      )}
      Exportar informe del día (Excel)
    </Button>
  );
};
