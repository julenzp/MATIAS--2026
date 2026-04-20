import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useActivityLog } from "@/hooks/useActivityLog";
import { MATIA_ALLOWED_ROUTES } from "@/lib/matiaRoutes";
import { useDashboardInteligenteData } from "@/hooks/useDashboardInteligenteData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  LayoutDashboard,
  Route,
  AlertTriangle,
  Users,
  CheckCircle2,
  XCircle,
  Bot,
  RefreshCw,
  MessageSquare,
} from "lucide-react";

export default function DashboardInteligente() {
  const { isAdmin, isMatia } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, refetch, isRefetching } = useDashboardInteligenteData();
  const [filtroIncidencias, setFiltroIncidencias] = useState<"todas" | "hoy" | "semana">("todas");
  useActivityLog("Dashboard Inteligente");

  if (!isAdmin && !isMatia) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <p className="text-muted-foreground">Acceso restringido.</p>
      </div>
    );
  }

  // Filter data for MATIA profile
  const filteredData = isMatia && data ? {
    ...data,
    rutasActivas: data.rutasActivas.filter(r => MATIA_ALLOWED_ROUTES.includes(r as any)),
    routeTable: data.routeTable.filter(r => MATIA_ALLOWED_ROUTES.includes(r.route as any)),
    incidenciasRecientes: data.incidenciasRecientes.filter(i => MATIA_ALLOWED_ROUTES.includes(i.ruta as any)),
    totalUsuarios: 0, // Will be recalculated below
    incidenciasAbiertas: data.incidenciasRecientes.filter(i => MATIA_ALLOWED_ROUTES.includes(i.ruta as any) && i.fecha === new Date().toISOString().split("T")[0]).length,
  } : data;

  // Recalculate estado for MATIA
  const displayData = isMatia && filteredData ? {
    ...filteredData,
    estadoGeneral: (filteredData.incidenciasAbiertas === 0 ? "Operativo" : "Con incidencias") as "Operativo" | "Con incidencias",
  } : filteredData;

  const todayStr = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const filteredIncidents = (displayData?.incidenciasRecientes || []).filter((i) => {
    if (filtroIncidencias === "hoy") return i.fecha === today;
    if (filtroIncidencias === "semana") return i.fecha >= weekAgo;
    return true;
  });

  const openErbiWithQuery = (query: string) => {
    // Dispatch event to open AI Erbi with a specific query
    window.dispatchEvent(new CustomEvent("erbi:open-with-query", { detail: { query } }));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-6">
        {/* 1. CABECERA */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground leading-tight">
              {isMatia ? "Dashboard Rutas Matia" : "Dashboard Inteligente ERBI"}
            </h1>
            <p className="text-xs text-muted-foreground capitalize">{todayStr}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              className="gap-2"
              onClick={() => openErbiWithQuery("Hazme un resumen del servicio de hoy")}
            >
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Consultar con AI Erbi</span>
            </Button>
          )}
        </div>

        {/* 2. TARJETAS DE RESUMEN */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Route className="h-6 w-6 text-primary mb-2" />
              <p className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-12 mx-auto" /> : displayData?.rutasActivas.length ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Rutas activas hoy</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center text-center">
              <AlertTriangle className="h-6 w-6 text-destructive mb-2" />
              <p className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-12 mx-auto" /> : displayData?.incidenciasAbiertas ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Incidencias hoy</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Users className="h-6 w-6 text-secondary mb-2" />
              <p className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-12 mx-auto" /> : displayData?.totalUsuarios ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Usuarios registrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center text-center">
              {displayData?.estadoGeneral === "Operativo" ? (
                <CheckCircle2 className="h-6 w-6 text-green-500 mb-2" />
              ) : (
                <XCircle className="h-6 w-6 text-destructive mb-2" />
              )}
              <p className="text-lg font-bold">
                {isLoading ? <Skeleton className="h-8 w-20 mx-auto" /> : displayData?.estadoGeneral ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Estado general</p>
            </CardContent>
          </Card>
        </div>

        {/* 3. TABLA DE RUTAS */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Estado de rutas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !displayData?.routeTable.length ? (
              <p className="p-4 text-sm text-muted-foreground text-center">Sin datos disponibles aún</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ruta</TableHead>
                      <TableHead>Centro</TableHead>
                      <TableHead>Turno</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Incidencias</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayData!.routeTable.map((row) => (
                      <TableRow key={row.route}>
                        <TableCell className="font-medium">{row.route}</TableCell>
                        <TableCell className="text-sm">{row.centro}</TableCell>
                        <TableCell className="text-sm">{row.turno}</TableCell>
                        <TableCell>
                          <Badge
                            variant={row.estado === "Operativo" ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {row.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{row.incidencias}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. PANEL DE INCIDENCIAS RECIENTES */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-semibold">Incidencias recientes</CardTitle>
              <div className="flex gap-1">
                {(["todas", "hoy", "semana"] as const).map((f) => (
                  <Button
                    key={f}
                    variant={filtroIncidencias === f ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setFiltroIncidencias(f)}
                  >
                    {f === "todas" ? "Todas" : f === "hoy" ? "Hoy" : "Semana"}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filteredIncidents.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">Sin incidencias registradas</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Ruta</TableHead>
                      <TableHead>Descripción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIncidents.map((inc) => (
                      <TableRow key={inc.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {new Date(inc.fecha + "T12:00:00").toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{inc.ruta}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{inc.mensaje}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5. BOTONES DE ACCIÓN RÁPIDA IA - solo admin */}
        {isAdmin && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Consultas rápidas con AI Erbi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="h-auto py-3 justify-start gap-3 text-left"
                  onClick={() => openErbiWithQuery("Analiza las incidencias de hoy")}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                  <span className="text-sm">Analiza las incidencias de hoy</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-3 justify-start gap-3 text-left"
                  onClick={() => openErbiWithQuery("Resumen semanal del servicio")}
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm">Resumen semanal del servicio</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-3 justify-start gap-3 text-left"
                  onClick={() => openErbiWithQuery("Genera informe de puntualidad")}
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                  <span className="text-sm">Genera informe de puntualidad</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
