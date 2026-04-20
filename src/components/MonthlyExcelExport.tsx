import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const ROUTES = [
  { value: 'ASPACE', label: '1. ASPACE INTXAURRONDO' },
  { value: 'AMARAEN FINDE', label: '2. GUREAK, Amaraene FINDE' },
  { value: 'BERMINGHAM', label: '3. MATIA BERMINGHAM' },
  { value: 'FRAISORO', label: '4. MATIA FRAISORO' },
  { value: 'FRAISORO_2', label: '5. MATIA FRAISORO 2' },
  { value: 'IGELDO', label: '6. MATIA IGELDO' },
  { value: 'LAMOROUSE', label: '7. MATIA LAMOROUSE' },
  { value: 'LASARTE', label: '8. MATIA LASARTE' },
  { value: 'MATIA', label: '9. MATIA REZOLA' },
  { value: 'EGURTZEGI', label: '10. MATIA USURBIL' },
];

const MONTHS = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

interface AttendanceRecord {
  id: string;
  user_name: string;
  scheduled_time: string;
  actual_time: string | null;
  status: string;
  route: string | null;
  record_date: string;
}

export function MonthlyExcelExport({ hideTrigger = false }: { hideTrigger?: boolean } = {}) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Listen for external open event from AI Erbi shortcuts
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('erbi:open-excel', handler);
    return () => window.removeEventListener('erbi:open-excel', handler);
  }, []);

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1].map(year => ({
      value: String(year),
      label: String(year),
    }));
  };

  const formatStatus = (status: string): string => {
    switch (status) {
      case 'present': return 'Presente';
      case 'absent': return 'Ausente';
      case 'pending': return 'Falta';
      default: return status;
    }
  };

  const isMorningTime = (time: string): boolean => {
    if (!time) return true;
    const [hours] = time.split(':').map(Number);
    return hours < 13;
  };

  const calculateMinutesLate = (scheduledTime: string, actualTime: string): number => {
    if (!scheduledTime || !actualTime) return 0;
    
    const [schedHours, schedMins] = scheduledTime.split(':').map(Number);
    const [actHours, actMins] = actualTime.split(':').map(Number);
    
    const schedTotal = schedHours * 60 + schedMins;
    const actTotal = actHours * 60 + actMins;
    
    return actTotal - schedTotal;
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    
    try {
      const month = parseInt(selectedMonth);
      const year = parseInt(selectedYear);
      
      // Calculate date range for the selected month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Fetch attendance records
      let query = supabase
        .from('attendance_records')
        .select('*')
        .gte('record_date', startDateStr)
        .lte('record_date', endDateStr)
        .order('record_date')
        .order('scheduled_time');

      if (selectedRoute !== 'all') {
        query = query.eq('route', selectedRoute);
      }

      const { data: records, error } = await query;

      if (error) throw error;

      if (!records || records.length === 0) {
        toast.error('No hay registros para el período seleccionado');
        setIsExporting(false);
        return;
      }

      const workbook = XLSX.utils.book_new();
      const monthName = MONTHS.find(m => m.value === selectedMonth)?.label || '';

      // Group records by route
      const routesToProcess = selectedRoute === 'all' 
        ? ROUTES.map(r => r.value)
        : [selectedRoute];

      // Create summary sheet first
      const summaryData: any[] = [];
      summaryData.push(['INFORME MENSUAL DE ASISTENCIAS']);
      summaryData.push([`Mes: ${monthName} ${year}`]);
      summaryData.push([]);
      summaryData.push(['Ruta', 'Total Registros', 'Presentes', 'Ausentes', 'Faltas', '% Asistencia']);

      for (const routeValue of routesToProcess) {
        const routeRecords = records.filter(r => r.route === routeValue);
        
        if (routeRecords.length === 0) continue;

        const routeLabel = ROUTES.find(r => r.value === routeValue)?.label || routeValue;
        
        // Calculate stats
        const total = routeRecords.length;
        const present = routeRecords.filter(r => r.status === 'present').length;
        const absent = routeRecords.filter(r => r.status === 'absent').length;
        const pending = routeRecords.filter(r => r.status === 'pending').length;
        const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : '0';

        summaryData.push([routeLabel, total, present, absent, pending, `${percentage}%`]);

        // Create sheet for this route
        const sheetData: any[] = [];
        
        // Header
        sheetData.push([`RUTA: ${routeLabel}`]);
        sheetData.push([`Período: ${monthName} ${year}`]);
        sheetData.push([]);
        sheetData.push([
          'Fecha',
          'Pasajero',
          'Turno',
          'Hora Programada',
          'Hora Real',
          'Estado',
          'Diferencia (min)'
        ]);

        // Group by date for better organization
        const recordsByDate = routeRecords.reduce((acc, record) => {
          const date = record.record_date;
          if (!acc[date]) acc[date] = [];
          acc[date].push(record);
          return acc;
        }, {} as Record<string, AttendanceRecord[]>);

        // Sort dates and add records
        const sortedDates = Object.keys(recordsByDate).sort();
        
        for (const date of sortedDates) {
          const dateRecords = recordsByDate[date].sort((a, b) => 
            a.scheduled_time.localeCompare(b.scheduled_time)
          );

          for (const record of dateRecords) {
            const formattedDate = new Date(date).toLocaleDateString('es-ES', {
              weekday: 'short',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
            
            const turno = isMorningTime(record.scheduled_time) ? 'Mañana' : 'Tarde';
            const minutesLate = record.actual_time 
              ? calculateMinutesLate(record.scheduled_time, record.actual_time)
              : '';

            sheetData.push([
              formattedDate,
              record.user_name,
              turno,
              record.scheduled_time,
              record.actual_time || '-',
              formatStatus(record.status),
              minutesLate !== '' ? minutesLate : '-'
            ]);
          }
        }

        // Add route statistics at the bottom
        sheetData.push([]);
        sheetData.push(['RESUMEN']);
        sheetData.push(['Total registros:', total]);
        sheetData.push(['Presentes:', present]);
        sheetData.push(['Ausentes:', absent]);
        sheetData.push(['Faltas:', pending]);
        sheetData.push(['% Asistencia:', `${percentage}%`]);

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        
        // Set column widths
        worksheet['!cols'] = [
          { wch: 18 }, // Fecha
          { wch: 25 }, // Pasajero
          { wch: 10 }, // Turno
          { wch: 15 }, // Hora Programada
          { wch: 12 }, // Hora Real
          { wch: 12 }, // Estado
          { wch: 15 }, // Diferencia
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, routeLabel.substring(0, 31));
      }

      // Add summary sheet at the beginning
      const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWorksheet['!cols'] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Resumen', true);

      // Generate filename
      const routeLabel = selectedRoute === 'all' 
        ? 'Todas-Rutas' 
        : ROUTES.find(r => r.value === selectedRoute)?.label || selectedRoute;
      const filename = `Asistencias_${routeLabel}_${monthName}_${year}.xlsx`;

      // Download file
      XLSX.writeFile(workbook, filename);
      
      toast.success(`Informe descargado: ${filename}`);
      setIsOpen(false);
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error al generar el informe');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Informe Excel
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Descargar Informe Mensual
          </DialogTitle>
          <DialogDescription>
            Selecciona el mes, año y ruta para generar el informe en Excel
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mes</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Año</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getYearOptions().map(year => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ruta</Label>
            <Select value={selectedRoute} onValueChange={setSelectedRoute}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las rutas (hojas separadas)</SelectItem>
                {ROUTES.map(route => (
                  <SelectItem key={route.value} value={route.value}>
                    {route.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p className="font-medium mb-1">El informe incluirá:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Hoja de resumen con estadísticas</li>
              <li>Una hoja por cada ruta seleccionada</li>
              <li>Datos ordenados por fecha y hora</li>
              <li>Cálculo de minutos de diferencia</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={exportToExcel} disabled={isExporting} className="gap-2">
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Descargar Excel
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
