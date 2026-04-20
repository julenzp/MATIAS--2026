import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, AreaChart, Area } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  retrasosPorRuta: { ruta: string; minutos: number }[];
  incidenciasPorDia: { fecha: string; incidencias: number }[];
  puntualidadSemanal: { semana: string; porcentaje: number }[];
  isLoading?: boolean;
}

const chartConfig = {
  minutos: { label: 'Minutos', color: 'hsl(var(--primary))' },
  incidencias: { label: 'Incidencias', color: 'hsl(var(--destructive))' },
  porcentaje: { label: 'Puntualidad %', color: 'hsl(142 71% 45%)' },
};

export function DashboardCharts({ retrasosPorRuta, incidenciasPorDia, puntualidadSemanal, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1,2,3].map(i => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-[200px] w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Retrasos por ruta (min)</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          {retrasosPorRuta.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-12">Sin datos de retrasos</p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={retrasosPorRuta}>
                <XAxis dataKey="ruta" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="minutos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Incidencias por día</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          {incidenciasPorDia.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-12">Sin incidencias recientes</p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <LineChart data={incidenciasPorDia}>
                <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="incidencias" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Puntualidad semanal (%)</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          {puntualidadSemanal.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-12">Sin datos de puntualidad</p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <AreaChart data={puntualidadSemanal}>
                <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="porcentaje" fill="hsl(142 71% 45% / 0.2)" stroke="hsl(142 71% 45%)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
