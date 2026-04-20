import { Card, CardContent } from '@/components/ui/card';
import { Bus, AlertTriangle, Clock, Users, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  rutasActivas: number;
  incidenciasAbiertas: number;
  retrasoMedio: number | null;
  usuariosTransportados: number;
  rutasConIncidencia: number;
  isLoading?: boolean;
}

export function DashboardSummaryCards({
  rutasActivas, incidenciasAbiertas, retrasoMedio,
  usuariosTransportados, rutasConIncidencia, isLoading,
}: Props) {
  const items = [
    { title: 'Rutas activas', value: rutasActivas, icon: Bus, accent: 'text-primary', bgAccent: 'bg-primary/10' },
    { title: 'Incidencias abiertas', value: incidenciasAbiertas, icon: AlertTriangle, accent: 'text-destructive', bgAccent: 'bg-destructive/10' },
    { title: 'Retraso medio', value: retrasoMedio !== null ? `${retrasoMedio} min` : '—', icon: Clock, accent: 'text-amber-600', bgAccent: 'bg-amber-500/10' },
    { title: 'Usuarios transportados', value: usuariosTransportados, icon: Users, accent: 'text-emerald-600', bgAccent: 'bg-emerald-500/10' },
    { title: 'Rutas con incidencias', value: rutasConIncidencia, icon: MapPin, accent: 'text-orange-600', bgAccent: 'bg-orange-500/10' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((item) => (
        <Card key={item.title} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg ${item.bgAccent} flex items-center justify-center shrink-0`}>
                <item.icon className={`h-5 w-5 ${item.accent}`} />
              </div>
              <div className="min-w-0">
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mb-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground leading-tight">{item.value}</p>
                )}
                <p className="text-[11px] text-muted-foreground leading-tight truncate">{item.title}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
