import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface Incident {
  id: string;
  ruta: string;
  fecha: string;
  mensaje: string;
}

interface Props {
  data: Incident[];
  isLoading?: boolean;
}

export function DashboardIncidents({ data, isLoading }: Props) {
  const [rutaFilter, setRutaFilter] = useState('todas');

  const filtered = rutaFilter === 'todas' ? data : data.filter(i => i.ruta === rutaFilter);
  const rutas = [...new Set(data.map(i => i.ruta))].sort();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">Histórico de incidencias</CardTitle>
          <Select value={rutaFilter} onValueChange={setRutaFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder="Ruta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {rutas.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sin incidencias para los filtros seleccionados</p>
        ) : (
          filtered.map((inc) => (
            <div key={inc.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-semibold text-foreground">{inc.ruta}</span>
                  <Badge variant="outline" className="text-[11px]">Incidencia</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{inc.mensaje}</p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{inc.fecha}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
