import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, Users, UserCheck, UserX, Clock, Loader2, Activity, Target, Award, AlertTriangle, FileText, Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Helper function to get color based on attendance percentage
const getAttendanceColor = (percentage: number) => {
  if (percentage >= 80) return { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-100 dark:bg-emerald-950', border: 'border-emerald-200 dark:border-emerald-800' };
  if (percentage >= 60) return { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-100 dark:bg-amber-950', border: 'border-amber-200 dark:border-amber-800' };
  return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-100 dark:bg-red-950', border: 'border-red-200 dark:border-red-800' };
};

// Circular progress component
const CircularProgress = ({ value, size = 120, strokeWidth = 10 }: { value: number; size?: number; strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  const colors = getAttendanceColor(value);
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={colors.text}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${colors.text}`}>{value}%</span>
        <span className="text-xs text-muted-foreground">Asistencia</span>
      </div>
    </div>
  );
};

const ROUTES = [
  { value: 'ASPACE', label: '1. ASPACE INTXAURRONDO', color: '#10b981' },
  { value: 'AMARAEN FINDE', label: '2. GUREAK, Amaraene FINDE', color: '#f59e0b' },
  { value: 'BERMINGHAM', label: '3. MATIA BERMINGHAM', color: '#06b6d4' },
  { value: 'FRAISORO', label: '4. MATIA FRAISORO', color: '#6366f1' },
  { value: 'FRAISORO_2', label: '5. MATIA FRAISORO 2', color: '#a855f7' },
  { value: 'IGELDO', label: '6. MATIA IGELDO', color: '#f97316' },
  { value: 'LAMOROUSE', label: '7. MATIA LAMOROUSE', color: '#ec4899' },
  { value: 'LASARTE', label: '8. MATIA LASARTE', color: '#14b8a6' },
  { value: 'MATIA', label: '9. MATIA REZOLA', color: '#3b82f6' },
  { value: 'EGURTZEGI', label: '10. MATIA USURBIL', color: '#8b5cf6' },
];

const MONTHS = [
  { value: '1', label: 'Ene' },
  { value: '2', label: 'Feb' },
  { value: '3', label: 'Mar' },
  { value: '4', label: 'Abr' },
  { value: '5', label: 'May' },
  { value: '6', label: 'Jun' },
  { value: '7', label: 'Jul' },
  { value: '8', label: 'Ago' },
  { value: '9', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dic' },
];

const STATUS_COLORS = {
  present: '#22c55e',
  absent: '#ef4444',
  pending: '#f59e0b',
};

interface MonthlyData {
  month: string;
  monthNum: number;
  MATIA: number;
  ASPACE: number;
  'AMARAEN FINDE': number;
  EGURTZEGI: number;
  LAMOROUSE: number;
  total: number;
  present: number;
  absent: number;
  pending: number;
}

interface RouteStats {
  route: string;
  label: string;
  total: number;
  present: number;
  absent: number;
  pending: number;
  late: number;
  percentage: number;
  punctuality: number; // % of present passengers who arrived on time
}

export function AttendanceStats({ hideTrigger = false }: { hideTrigger?: boolean } = {}) {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedRoute, setSelectedRoute] = useState<string>('ALL');
  const [isOpen, setIsOpen] = useState(false);

  // Listen for external open event from AI Erbi shortcuts
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('erbi:open-stats', handler);
    return () => window.removeEventListener('erbi:open-stats', handler);
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [routeStats, setRouteStats] = useState<RouteStats[]>([]);
  const [totals, setTotals] = useState({ total: 0, present: 0, absent: 0, pending: 0, late: 0 });

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1].map(year => ({
      value: String(year),
      label: String(year),
    }));
  };

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen, selectedYear, selectedMonth, selectedRoute]);

  const loadStats = async () => {
    setIsLoading(true);
    
    try {
      const year = parseInt(selectedYear);
      let startDate: string;
      let endDate: string;

      if (selectedMonth !== 'ALL') {
        const month = parseInt(selectedMonth);
        const lastDay = new Date(year, month, 0).getDate();
        startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      } else {
        startDate = `${year}-01-01`;
        endDate = `${year}-12-31`;
      }

      // Paginated fetch to avoid 1000-row limit
      const PAGE_SIZE = 1000;
      let allRecords: any[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('attendance_records')
          .select('*')
          .gte('record_date', startDate)
          .lte('record_date', endDate)
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (selectedRoute !== 'ALL') {
          query = query.eq('route', selectedRoute);
        }

        const { data: pageData, error } = await query;
        if (error) throw error;

        if (pageData && pageData.length > 0) {
          allRecords = allRecords.concat(pageData);
          hasMore = pageData.length === PAGE_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      }

      const records = allRecords;

      if (records.length === 0) {
        setMonthlyData([]);
        setRouteStats([]);
        setTotals({ total: 0, present: 0, absent: 0, pending: 0, late: 0 });
        setIsLoading(false);
        return;
      }

      // Process monthly data
      const monthlyMap: Record<number, MonthlyData> = {};
      
      for (let i = 1; i <= 12; i++) {
        monthlyMap[i] = {
          month: MONTHS[i - 1].label,
          monthNum: i,
          MATIA: 0,
          ASPACE: 0,
          'AMARAEN FINDE': 0,
          EGURTZEGI: 0,
          LAMOROUSE: 0,
          total: 0,
          present: 0,
          absent: 0,
          pending: 0,
        };
      }

      // Route stats accumulator
      const routeAccum: Record<string, { total: number; present: number; absent: number; pending: number; late: number; onTime: number; presentWithTime: number }> = {};
      ROUTES.forEach(r => {
        routeAccum[r.value] = { total: 0, present: 0, absent: 0, pending: 0, late: 0, onTime: 0, presentWithTime: 0 };
      });

      let totalPresent = 0;
      let totalAbsent = 0;
      let totalPending = 0;
      let totalLate = 0;

      // Helper: parse "HH:mm" or "H:mm" to total minutes for reliable comparison
      const parseTimeToMinutes = (time: string): number => {
        const parts = time.split(':');
        if (parts.length < 2) return 0;
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      };

      // Structural markers to exclude from real stats
      const EXCLUDED_NAMES = new Set(['ZENTRO', 'zentro', 'Llegada al centro', 'Salida del centro']);

      for (const record of records) {
        // Skip structural markers - they are NOT real passengers
        if (EXCLUDED_NAMES.has(record.user_name)) continue;

        const date = new Date(record.record_date);
        const month = date.getMonth() + 1;
        const route = record.route || 'MATIA';

        monthlyMap[month].total++;
        monthlyMap[month][route as keyof Pick<MonthlyData, 'MATIA' | 'ASPACE' | 'AMARAEN FINDE' | 'EGURTZEGI' | 'LAMOROUSE'>]++;

        if (record.status === 'present') {
          monthlyMap[month].present++;
          totalPresent++;
          if (routeAccum[route]) {
            routeAccum[route].present++;
            // Check if late (T+ marker)
            if (record.actual_time && record.actual_time.includes('T+')) {
              totalLate++;
              if (routeAccum[route]) routeAccum[route].late++;
            }
            // Punctuality: use numeric time comparison (not string!)
            if (record.actual_time) {
              routeAccum[route].presentWithTime++;
              const cleanTime = record.actual_time.split(' ')[0]; // Remove T+X suffix
              const actualMin = parseTimeToMinutes(cleanTime);
              const scheduledMin = parseTimeToMinutes(record.scheduled_time);
              if (actualMin <= scheduledMin) {
                routeAccum[route].onTime++;
              }
            }
          }
        } else if (record.status === 'absent') {
          monthlyMap[month].absent++;
          totalAbsent++;
          if (routeAccum[route]) routeAccum[route].absent++;
        } else {
          monthlyMap[month].pending++;
          totalPending++;
          if (routeAccum[route]) routeAccum[route].pending++;
        }

        if (routeAccum[route]) routeAccum[route].total++;
      }

      // Convert to arrays
      const monthlyArray = Object.values(monthlyMap).filter(m => m.total > 0);
      setMonthlyData(monthlyArray);

      const routeStatsArray: RouteStats[] = ROUTES.map(r => ({
        route: r.value,
        label: r.label,
        ...routeAccum[r.value],
        percentage: routeAccum[r.value].total > 0 
          ? Math.round((routeAccum[r.value].present / routeAccum[r.value].total) * 100) 
          : 0,
        punctuality: routeAccum[r.value].presentWithTime > 0
          ? Math.round((routeAccum[r.value].onTime / routeAccum[r.value].presentWithTime) * 100)
          : -1, // -1 means no data
      })).filter(r => r.total > 0);

      setRouteStats(routeStatsArray);
      setTotals({
        total: records.length,
        present: totalPresent,
        absent: totalAbsent,
        pending: totalPending,
        late: totalLate,
      });

    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pieData = [
    { name: 'Presentes', value: totals.present, color: STATUS_COLORS.present },
    { name: 'Ausentes', value: totals.absent, color: STATUS_COLORS.absent },
    { name: 'Faltas', value: totals.pending, color: STATUS_COLORS.pending },
  ].filter(d => d.value > 0);

  const attendancePercentage = totals.total > 0 
    ? Math.round((totals.present / totals.total) * 100) 
    : 0;

  const exportRouteStatsToWord = async () => {
    if (routeStats.length === 0) {
      toast.error('No hay datos de rutas para exportar');
      return;
    }

    setIsExportingWord(true);

    try {
      const monthName = selectedMonth === 'ALL' 
        ? 'Todo el año' 
        : MONTHS.find(m => m.value === selectedMonth)?.label || '';
      
      const routeLabel = selectedRoute === 'ALL' 
        ? 'Todas las rutas' 
        : ROUTES.find(r => r.value === selectedRoute)?.label || selectedRoute;

      // Create table rows
      const tableRows = [
        // Header row
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              shading: { fill: '3b82f6' },
              children: [new Paragraph({ 
                children: [new TextRun({ text: 'Ruta', bold: true, color: 'FFFFFF' })],
                alignment: AlignmentType.CENTER 
              })],
            }),
            new TableCell({
              width: { size: 12, type: WidthType.PERCENTAGE },
              shading: { fill: '3b82f6' },
              children: [new Paragraph({ 
                children: [new TextRun({ text: 'Total', bold: true, color: 'FFFFFF' })],
                alignment: AlignmentType.CENTER 
              })],
            }),
            new TableCell({
              width: { size: 12, type: WidthType.PERCENTAGE },
              shading: { fill: '22c55e' },
              children: [new Paragraph({ 
                children: [new TextRun({ text: 'Presentes', bold: true, color: 'FFFFFF' })],
                alignment: AlignmentType.CENTER 
              })],
            }),
            new TableCell({
              width: { size: 12, type: WidthType.PERCENTAGE },
              shading: { fill: 'ef4444' },
              children: [new Paragraph({ 
                children: [new TextRun({ text: 'Ausentes', bold: true, color: 'FFFFFF' })],
                alignment: AlignmentType.CENTER 
              })],
            }),
            new TableCell({
              width: { size: 12, type: WidthType.PERCENTAGE },
              shading: { fill: 'f59e0b' },
              children: [new Paragraph({ 
                children: [new TextRun({ text: 'Faltas', bold: true, color: 'FFFFFF' })],
                alignment: AlignmentType.CENTER 
              })],
            }),
            new TableCell({
              width: { size: 12, type: WidthType.PERCENTAGE },
              shading: { fill: '3b82f6' },
              children: [new Paragraph({ 
                children: [new TextRun({ text: '% Asistencia', bold: true, color: 'FFFFFF' })],
                alignment: AlignmentType.CENTER 
              })],
            }),
          ],
        }),
        // Data rows
        ...routeStats.map(stat => new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: stat.label, bold: true })],
              })],
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: String(stat.total) })],
                alignment: AlignmentType.CENTER 
              })],
            }),
            new TableCell({
              shading: { fill: 'dcfce7' },
              children: [new Paragraph({ 
                children: [new TextRun({ text: String(stat.present), color: '166534' })],
                alignment: AlignmentType.CENTER 
              })],
            }),
            new TableCell({
              shading: { fill: 'fee2e2' },
              children: [new Paragraph({ 
                children: [new TextRun({ text: String(stat.absent), color: 'b91c1c' })],
                alignment: AlignmentType.CENTER 
              })],
            }),
            new TableCell({
              shading: { fill: 'fef3c7' },
              children: [new Paragraph({ 
                children: [new TextRun({ text: String(stat.late), color: 'b45309' })],
                alignment: AlignmentType.CENTER 
              })],
            }),
            new TableCell({
              shading: { fill: stat.percentage >= 80 ? 'dcfce7' : stat.percentage >= 60 ? 'fef3c7' : 'fee2e2' },
              children: [new Paragraph({ 
                children: [new TextRun({ 
                  text: `${stat.percentage}%`, 
                  bold: true,
                  color: stat.percentage >= 80 ? '166534' : stat.percentage >= 60 ? 'b45309' : 'b91c1c'
                })],
                alignment: AlignmentType.CENTER 
              })],
            }),
          ],
        })),
      ];

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun({ text: 'Estadísticas por Ruta', bold: true })],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Período: ', bold: true }),
                new TextRun({ text: `${monthName} ${selectedYear}` }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Filtro de ruta: ', bold: true }),
                new TextRun({ text: routeLabel }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Fecha de generación: ', bold: true }),
                new TextRun({ text: new Date().toLocaleDateString('es-ES', { 
                  day: '2-digit', 
                  month: 'long', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) }),
              ],
              spacing: { after: 400 },
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: tableRows,
            }),
            new Paragraph({ spacing: { before: 400 } }),
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun({ text: 'Resumen General', bold: true })],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Total de registros: ', bold: true }),
                new TextRun({ text: String(totals.total) }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Presentes: ', bold: true, color: '166534' }),
                new TextRun({ text: `${totals.present} (${totals.total > 0 ? Math.round((totals.present / totals.total) * 100) : 0}%)`, color: '166534' }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Ausentes: ', bold: true, color: 'b91c1c' }),
                new TextRun({ text: `${totals.absent} (${totals.total > 0 ? Math.round((totals.absent / totals.total) * 100) : 0}%)`, color: 'b91c1c' }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Faltas (Tarde): ', bold: true, color: 'b45309' }),
                new TextRun({ text: `${totals.late} (${totals.total > 0 ? Math.round((totals.late / totals.total) * 100) : 0}%)`, color: 'b45309' }),
              ],
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const filename = `Estadisticas_Rutas_${monthName.replace(/ /g, '_')}_${selectedYear}.docx`;
      saveAs(blob, filename);
      
      toast.success(`Documento descargado: ${filename}`);
    } catch (error) {
      console.error('Error exporting to Word:', error);
      toast.error('Error al generar el documento Word');
    } finally {
      setIsExportingWord(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Estadísticas
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Estadísticas de Asistencia
          </DialogTitle>
          <DialogDescription>
            Análisis mensual y tendencias por ruta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Año:</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32">
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
            <div className="flex items-center gap-2">
              <Label>Mes:</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todo el año</SelectItem>
                  {MONTHS.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label>Ruta:</Label>
              <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas las rutas</SelectItem>
                  {ROUTES.map(route => (
                    <SelectItem key={route.value} value={route.value}>
                      {route.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : monthlyData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay datos para el año seleccionado</p>
            </div>
          ) : (
            <>
              {/* Main stats with circular progress */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Circular progress card */}
                <Card className={`${getAttendanceColor(attendancePercentage).light} ${getAttendanceColor(attendancePercentage).border} border-2`}>
                  <CardContent className="pt-6 flex flex-col items-center justify-center">
                    <CircularProgress value={attendancePercentage} size={140} strokeWidth={12} />
                    <div className="mt-4 flex items-center gap-2">
                      {attendancePercentage >= 80 ? (
                        <Award className="h-5 w-5 text-emerald-500" />
                      ) : attendancePercentage >= 60 ? (
                        <Target className="h-5 w-5 text-amber-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )}
                      <span className={`text-sm font-medium ${getAttendanceColor(attendancePercentage).text}`}>
                        {attendancePercentage >= 80 ? 'Excelente' : attendancePercentage >= 60 ? 'Mejorable' : 'Atención requerida'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Individual stat cards */}
                <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Total */}
                  <TooltipProvider delayDuration={200}>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700 cursor-pointer">
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700">
                                <Users className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground font-medium">Total</p>
                                <p className="text-2xl font-bold">{totals.total}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[220px] text-center">
                        <p className="font-semibold">Total de registros</p>
                        <p className="text-xs text-muted-foreground">Número total de viajes programados en el período seleccionado, incluyendo todos los estados.</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>

                  {/* Presentes */}
                  <TooltipProvider delayDuration={200}>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800 cursor-pointer">
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-emerald-200 dark:bg-emerald-800">
                                <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                              </div>
                              <div>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Presentes</p>
                                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{totals.present}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[220px] text-center">
                        <p className="font-semibold">Usuarios presentes</p>
                        <p className="text-xs text-muted-foreground">Usuarios que han sido recogidos a la hora prevista sin retraso.</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>

                  {/* Ausentes */}
                  <TooltipProvider delayDuration={200}>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800 cursor-pointer">
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-red-200 dark:bg-red-800">
                                <UserX className="h-5 w-5 text-red-600 dark:text-red-300" />
                              </div>
                              <div>
                                <p className="text-xs text-red-600 dark:text-red-400 font-medium">Ausentes</p>
                                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{totals.absent}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[220px] text-center">
                        <p className="font-semibold">Usuarios ausentes</p>
                        <p className="text-xs text-muted-foreground">Usuarios que no se presentaron en la parada y no realizaron el viaje programado.</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>

                  {/* Tarde */}
                  <TooltipProvider delayDuration={200}>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800 cursor-pointer">
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-orange-200 dark:bg-orange-800">
                                <Timer className="h-5 w-5 text-orange-600 dark:text-orange-300" />
                              </div>
                              <div>
                                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Tarde</p>
                                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{totals.late}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[220px] text-center">
                        <p className="font-semibold">Usuarios con retraso</p>
                        <p className="text-xs text-muted-foreground">Usuarios que fueron recogidos pero con un retraso respecto a la hora programada.</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>

                </div>
              </div>

              {/* Monthly trend chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tendencia Mensual por Ruta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))' 
                          }}
                        />
                        <Legend />
                        {ROUTES.map(route => (
                          <Bar 
                            key={route.value}
                            dataKey={route.value} 
                            name={route.label}
                            fill={route.color}
                            radius={[4, 4, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance trend line chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Evolución de Asistencia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))' 
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="present" 
                          name="Presentes"
                          stroke={STATUS_COLORS.present}
                          strokeWidth={2}
                          dot={{ fill: STATUS_COLORS.present }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="absent" 
                          name="Ausentes"
                          stroke={STATUS_COLORS.absent}
                          strokeWidth={2}
                          dot={{ fill: STATUS_COLORS.absent }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Route breakdown as individual cards */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Estadísticas por Ruta
                  </CardTitle>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={exportRouteStatsToWord}
                          disabled={isExportingWord || routeStats.length === 0}
                          className="h-8 w-8"
                        >
                          {isExportingWord ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Exportar a Word</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {routeStats.map(stat => {
                      const colors = getAttendanceColor(stat.percentage);
                      const routeConfig = ROUTES.find(r => r.value === stat.route);
                      
                      return (
                        <div 
                          key={stat.route} 
                          className={`p-4 rounded-xl border-2 ${colors.light} ${colors.border} transition-all hover:shadow-md`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate" title={stat.label}>
                                {stat.label}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {stat.total} registros
                              </p>
                            </div>
                            <TooltipProvider>
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <div className={`px-2 py-1 rounded-full text-xs font-bold ${colors.bg} text-white cursor-pointer`}>
                                    {stat.percentage}%
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[200px]">
                                  <p className="font-semibold">Tasa de asistencia</p>
                                  <p className="text-xs text-muted-foreground">{stat.present} presentes de {stat.total} registros totales en esta ruta</p>
                                </TooltipContent>
                              </UITooltip>
                            </TooltipProvider>
                          </div>
                          
                          <div className="space-y-2">
                            <TooltipProvider>
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-pointer">
                                    <Progress 
                                      value={stat.percentage} 
                                      className="h-2"
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                  <p className="text-xs">Barra de asistencia: {stat.percentage}% del total</p>
                                </TooltipContent>
                              </UITooltip>
                            </TooltipProvider>
                            
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <TooltipProvider>
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg px-2.5 py-2 border border-emerald-200 dark:border-emerald-800 shadow-sm cursor-pointer">
                                      <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                                      <span className="font-extrabold text-base text-emerald-700 dark:text-emerald-400">{stat.present}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-[200px]">
                                    <p className="font-semibold">Presentes</p>
                                    <p className="text-xs text-muted-foreground">Usuarios recogidos en esta ruta durante el periodo seleccionado</p>
                                  </TooltipContent>
                                </UITooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/50 rounded-lg px-2.5 py-2 border border-red-200 dark:border-red-800 shadow-sm cursor-pointer">
                                      <UserX className="h-5 w-5 text-red-600 dark:text-red-400" strokeWidth={2.5} />
                                      <span className="font-extrabold text-base text-red-700 dark:text-red-400">{stat.absent}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-[200px]">
                                    <p className="font-semibold">Ausentes</p>
                                    <p className="text-xs text-muted-foreground">Usuarios que no acudieron a su parada en esta ruta</p>
                                  </TooltipContent>
                                </UITooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg px-2.5 py-2 border border-amber-200 dark:border-amber-800 shadow-sm cursor-pointer">
                                      <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
                                      <span className="font-extrabold text-base text-amber-700 dark:text-amber-400">{stat.late}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-[200px]">
                                    <p className="font-semibold">Con retraso</p>
                                    <p className="text-xs text-muted-foreground">Usuarios recogidos con retraso respecto al horario previsto</p>
                                  </TooltipContent>
                                </UITooltip>
                              </TooltipProvider>
                            </div>

                            {/* Punctuality indicator */}
                            {stat.punctuality >= 0 && (
                              <TooltipProvider>
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <div className="mt-2 flex items-center gap-1.5 text-xs cursor-pointer">
                                      <Timer className="h-3.5 w-3.5 text-blue-500" />
                                      <span className="text-muted-foreground">Puntualidad:</span>
                                      <span className={`font-bold ${
                                        stat.punctuality >= 80 ? 'text-emerald-600 dark:text-emerald-400' 
                                        : stat.punctuality >= 60 ? 'text-amber-600 dark:text-amber-400' 
                                        : 'text-red-600 dark:text-red-400'
                                      }`}>
                                        {stat.punctuality}%
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-[220px]">
                                    <p className="font-semibold">Índice de puntualidad</p>
                                    <p className="text-xs text-muted-foreground">Porcentaje de recogidas realizadas a la hora prevista o antes. ≥80% excelente, ≥60% aceptable, &lt;60% necesita mejora</p>
                                  </TooltipContent>
                                </UITooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Pie chart distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribución General por Estado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
