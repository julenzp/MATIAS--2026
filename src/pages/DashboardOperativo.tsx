import { DashboardSummaryCards } from '@/components/dashboard/DashboardSummaryCards';
import { DashboardRouteTable } from '@/components/dashboard/DashboardRouteTable';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { DashboardIncidents } from '@/components/dashboard/DashboardIncidents';
import { DashboardRefreshButton } from '@/components/dashboard/DashboardRefreshButton';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Bot, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useDashboardData } from '@/hooks/useDashboardData';
import { format } from 'date-fns';

export default function DashboardOperativo() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, refetch, isRefetching } = useDashboardData();
  useActivityLog("Dashboard Operativo");

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <p className="text-muted-foreground">Acceso restringido a administradores.</p>
      </div>
    );
  }

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground leading-tight">Dashboard Inteligente</h1>
            <p className="text-xs text-muted-foreground">Estado del servicio ERBI</p>
          </div>
          <DashboardRefreshButton onRefresh={() => refetch()} isRefetching={isRefetching} />
        </div>

        {/* Resumen operativo */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Resumen del día</h2>
          <DashboardSummaryCards
            rutasActivas={data?.rutasActivasHoy ?? 0}
            incidenciasAbiertas={data?.incidenciasAbiertasHoy ?? 0}
            retrasoMedio={data?.retrasoMedio ?? null}
            usuariosTransportados={data?.usuariosTransportados ?? 0}
            rutasConIncidencia={data?.rutasConIncidencia ?? 0}
            isLoading={isLoading}
          />
        </section>

        {/* Estado de rutas */}
        <section>
          <DashboardRouteTable data={data?.routeTableData ?? []} isLoading={isLoading} />
        </section>

        {/* Gráficos */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Gráficos operativos</h2>
          <DashboardCharts
            retrasosPorRuta={data?.retrasosPorRuta ?? []}
            incidenciasPorDia={data?.incidenciasPorDia ?? []}
            puntualidadSemanal={data?.puntualidadSemanal ?? []}
            isLoading={isLoading}
          />
        </section>

        {/* Incidencias */}
        <section>
          <DashboardIncidents data={data?.incidents ?? []} isLoading={isLoading} />
        </section>
      </div>

      {/* Botones flotantes */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end">
        <Link to="/modificaciones">
          <Button size="lg" className="rounded-full shadow-lg gap-2 h-12 px-5 bg-amber-600 hover:bg-amber-700 text-white">
            <ShieldCheck className="h-5 w-5" />
            <span className="hidden sm:inline text-sm">Modificaciones</span>
          </Button>
        </Link>
        <Link to={`/asistente-operativo?context=dashboard&fecha=${today}`}>
          <Button size="lg" className="rounded-full shadow-lg gap-2 h-12 px-5">
            <Bot className="h-5 w-5" />
            <span className="hidden sm:inline text-sm">Asistente IA</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
