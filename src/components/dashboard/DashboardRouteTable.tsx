import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface RouteRow {
  ruta: string;
  estado: string;
  retrasoMedio: string;
  incidencias: number;
  registros: number;
}

interface Props {
  data: RouteRow[];
  isLoading?: boolean;
}

const estadoBadge = (estado: string) => {
  switch (estado) {
    case 'En ruta': return <Badge className="bg-emerald-500/15 text-emerald-700 border-0 text-[11px]">En ruta</Badge>;
    case 'Finalizada': return <Badge variant="secondary" className="text-[11px]">Finalizada</Badge>;
    case 'Pendiente': return <Badge className="bg-amber-500/15 text-amber-700 border-0 text-[11px]">Pendiente</Badge>;
    default: return <Badge variant="outline" className="text-[11px]">{estado}</Badge>;
  }
};

export function DashboardRouteTable({ data, isLoading }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Estado de rutas</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-3">
        {isLoading ? (
          <div className="space-y-3 px-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sin datos de rutas para hoy</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs pl-4">Ruta</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead className="text-xs text-right">Retraso</TableHead>
                <TableHead className="text-xs text-right pr-4">Inc.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r.ruta}>
                  <TableCell className="font-medium text-xs pl-4">{r.ruta}</TableCell>
                  <TableCell>{estadoBadge(r.estado)}</TableCell>
                  <TableCell className="text-xs text-right">{r.retrasoMedio}</TableCell>
                  <TableCell className="text-xs text-right pr-4">
                    {r.incidencias > 0 ? (
                      <span className="text-destructive font-semibold">{r.incidencias}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
