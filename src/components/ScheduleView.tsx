import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleTable } from "./ScheduleTable";
import { ContactsList } from "./ContactsList";
import { RouteNotifications } from "./RouteNotifications";
import { HeroBanner } from "./HeroBanner";
import { useScheduleData } from "@/hooks/useScheduleData";
import { usePassengerNotes } from "@/hooks/usePassengerNotes";
import { useRoute } from "@/context/RouteContext";
import { useSchedule } from "@/context/ScheduleContext";
import { Sunrise, Sunset, Home, Building2, ArrowRight, Users, Loader2, RefreshCw, ChevronDown, Accessibility, Calendar, Phone, MessageCircle, X } from "lucide-react";
import { RouteIncidentsPanel } from "./RouteIncidentsPanel";
import { DailyRouteRecordCount } from "./DailyRouteRecordCount";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RouteCombobox } from "./RouteCombobox";
import { toast } from "sonner";
import { getRouteDisplayName } from "@/lib/routes";


// Mapa de teléfonos del Bus por ruta
const ROUTE_BUS_PHONES: Record<string, string> = {
  "LASARTE": "673 449 422",
  "AMARAEN FINDE": "673 449 444",
};

// Mapa de teléfonos del Centro por ruta
const ROUTE_CENTER_PHONES: Record<string, { name: string; phone: string }> = {
  "MATIA": { name: "Matia Rezola", phone: "943 317 120" },
  "ASPACE": { name: "Aspace Intxaurrondo", phone: "943 310 510" },
  "AMARAEN FINDE": { name: "Centro de día Rezola", phone: "943 317 120" },
  "EGURTZEGI": { name: "Matia Usurbil", phone: "943 302 563" },
  
  "BERMINGHAM": { name: "Matia Bermingham", phone: "943 317 100" },
  "LASARTE": { name: "Matia Lasarte", phone: "943 317 100" },
  "LAMOROUSE": { name: "Centro Lamorouse", phone: "943 327 793" },
};

export const ScheduleView = () => {
  const [activeTab, setActiveTab] = useState("morning");
  const [searchParams] = useSearchParams();
  const { currentRoute, setCurrentRoute, availableRoutes, setLastUpdated, isReadOnly } = useRoute();
  const { setCurrentRoute: setScheduleRoute } = useSchedule();
  
  // Estado para controlar si se ha seleccionado una ruta (mostrar datos)
  // Si hay una ruta inicial (páginas individuales), marcamos como seleccionada
  const [routeSelected, setRouteSelected] = useState(!!currentRoute);
  
  const {
    morningFirst,
    morningSecond,
    morningThird,
    afternoonFirst,
    afternoonSecond,
    afternoonThird,
    loading,
    error,
    lastUpdated,
    refetch
  } = useScheduleData(currentRoute);

  // Fetch passenger notes for this route
  const { notes: passengerNotes } = usePassengerNotes(currentRoute);
  // Modo app móvil: oculta el asistente AI
  const isAppMode = useMemo(() => searchParams.get('app') === 'true', [searchParams]);

  // Fecha actual formateada en bilingüe
  const todayEu = useMemo(() => {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    };
    // Intentar euskera, si no está soportado usar formato manual
    try {
      const formatted = date.toLocaleDateString('eu', options);
      // Verificar que no sea igual al español (fallback)
      const esFormatted = date.toLocaleDateString('es', options);
      if (formatted !== esFormatted) {
        return formatted;
      }
    } catch {}
    // Formato manual en euskera si el locale no está soportado
    const days = ['Igandea', 'Astelehena', 'Asteartea', 'Asteazkena', 'Osteguna', 'Ostirala', 'Larunbata'];
    const months = ['urtarrilak', 'otsailak', 'martxoak', 'apirilak', 'maiatzak', 'ekainak', 'uztailak', 'abuztuak', 'irailak', 'urriak', 'azaroak', 'abenduak'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]}ren ${date.getDate()}a`;
  }, []);

  const todayEs = useMemo(() => {
    return new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  // Sync currentRoute to ScheduleContext for attendance records
  useEffect(() => {
    setScheduleRoute(currentRoute);
  }, [currentRoute, setScheduleRoute]);

  // Sync lastUpdated to context
  useEffect(() => {
    setLastUpdated(lastUpdated);
  }, [lastUpdated, setLastUpdated]);
  
  if (loading && routeSelected && currentRoute) {
    return <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando horarios...</p>
        </div>
      </div>;
  }
  const hardResetApp = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } finally {
      window.location.reload();
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Datos actualizados");
  };

  const handleHardReset = async () => {
    toast.info("Reiniciando app...");
    await hardResetApp();
  };

  // Solo mostrar pantalla de error si no hay datos cargados previamente
  // Si tenemos datos, mostramos los datos aunque haya error de refetch
  const showErrorScreen = error && !morningFirst && !morningSecond && !morningThird && !afternoonFirst && !afternoonSecond && !afternoonThird;

  if (showErrorScreen) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <p className="text-destructive">{error}</p>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <RefreshCw size={16} />
                Recargar
                <ChevronDown size={14} className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  handleRefresh();
                }}
              >
                Recargar datos
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  void handleHardReset();
                }}
              >
                Reiniciar app (limpia caché)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  const hasNoData =
    !morningFirst?.trips.length &&
    !morningSecond?.trips.length &&
    !morningThird?.trips.length &&
    !afternoonFirst?.trips.length &&
    !afternoonSecond?.trips.length &&
    !afternoonThird?.trips.length;

  // Handler para selección de ruta que activa la visualización
  const handleRouteSelect = (route: string) => {
    setCurrentRoute(route);
    setRouteSelected(true);
  };

  return <div className="container mx-auto px-4 py-8">
      {/* Hero Banner con foto y controles separados */}
      <HeroBanner
        currentRoute={currentRoute}
        setCurrentRoute={handleRouteSelect}
        availableRoutes={availableRoutes}
        isAppMode={isAppMode}
        isReadOnly={isReadOnly}
        onRefresh={handleRefresh}
        onHardReset={() => void handleHardReset()}
      />

      {/* Solo mostrar contenido de ruta si se ha seleccionado */}
      {!routeSelected ? (
        <></>
      ) : (
        <>
          {/* Botón para cerrar/deseleccionar la ruta */}
          {!isReadOnly && availableRoutes.length > 1 && (
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="default"
                onClick={() => { setRouteSelected(false); setCurrentRoute(""); }}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 font-bold text-sm"
              >
                <X size={28} strokeWidth={3} />
                <span>Itxi / Cerrar</span>
              </Button>
            </div>
          )}
          {/* Teléfono del bus - si existe para esta ruta */}
          {ROUTE_BUS_PHONES[currentRoute] && (
            <div className="flex justify-center mb-6">
              <a 
                href={`tel:${ROUTE_BUS_PHONES[currentRoute].replace(/\s/g, '')}`}
                className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-lg transition-colors"
              >
                <Phone size={20} className="shrink-0" />
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-medium">Tel. Bus</span>
                  <span className="font-bold text-base">{ROUTE_BUS_PHONES[currentRoute]}</span>
                </div>
              </a>
            </div>
          )}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-xl mx-auto grid-cols-3 h-auto min-h-14 p-1.5 bg-muted gap-1">
          <TabsTrigger value="morning" className="flex flex-col items-center gap-0.5 py-2 px-1 h-auto bg-primary text-primary-foreground data-[state=active]:ring-2 data-[state=active]:ring-primary-foreground/50 rounded-md">
            <Sunrise size={18} className="shrink-0" />
            <span className="text-[10px] sm:text-sm font-medium leading-tight text-center">Goiza / Mañana</span>
          </TabsTrigger>
          <TabsTrigger value="afternoon" className="flex flex-col items-center gap-0.5 py-2 px-1 h-auto bg-secondary text-secondary-foreground data-[state=active]:ring-2 data-[state=active]:ring-secondary-foreground/50 rounded-md">
            <Sunset size={18} className="shrink-0" />
            <span className="text-[10px] sm:text-sm font-medium leading-tight text-center">Arratsaldea / Tarde</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex flex-col items-center gap-0.5 py-2 px-1 h-auto bg-accent text-accent-foreground data-[state=active]:ring-2 data-[state=active]:ring-accent-foreground/50 rounded-md">
            <Users size={18} className="shrink-0" />
            <span className="text-[10px] sm:text-sm font-medium leading-tight text-center">Kontaktuak / Contactos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="morning" className="space-y-8 animate-fade-in">
          {/* Título destacado de la aplicación */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              {getRouteDisplayName(currentRoute)}
            </h1>
            <p className="text-lg text-muted-foreground font-medium">
              Horario de Transporte
            </p>
            {/* Fecha actual bilingüe */}
            <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-lg text-muted-foreground">
              <Calendar size={18} className="text-pink-soft flex-shrink-0" />
              <span className="capitalize text-foreground text-sm font-semibold">
                {todayEu} / {todayEs}
              </span>
            </div>
            <DailyRouteRecordCount routeCode={currentRoute} />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-muted-foreground">
            <div className="flex items-center gap-2 bg-muted px-3 sm:px-4 py-2 rounded-lg">
              <Home size={16} className="shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Etxetik / Domicilio</span>
            </div>
            <ArrowRight size={18} className="text-primary rotate-90 sm:rotate-0" />
            <div className="flex items-center gap-2 bg-muted px-3 sm:px-4 py-2 rounded-lg">
              <Building2 size={16} className="shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Zentrora / Centro</span>
            </div>
          </div>

          {hasNoData ? <div className="text-center py-12 text-muted-foreground">
              <p>No hay horarios configurados.</p>
              <p className="text-sm mt-2">Usa el panel de administración para añadir usuarios y rutas.</p>
            </div> : <div className="grid gap-8">
              {morningFirst && morningFirst.trips.length > 0 && <ScheduleTable section={morningFirst} variant="morning" passengerNotes={passengerNotes} routeCode={currentRoute} />}
              {morningSecond && morningSecond.trips.length > 0 && <ScheduleTable section={morningSecond} variant="morning" passengerNotes={passengerNotes} routeCode={currentRoute} />}
              {morningThird && morningThird.trips.length > 0 && <ScheduleTable section={morningThird} variant="morning" passengerNotes={passengerNotes} routeCode={currentRoute} />}
            </div>}

          {/* Avisos especiales de la ruta */}
          <div className="mt-8">
            <RouteNotifications routeCode={currentRoute} enableRealtime={true} />
          </div>
        </TabsContent>

        <TabsContent value="afternoon" className="space-y-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-muted-foreground">
            <div className="flex items-center gap-2 bg-muted px-3 sm:px-4 py-2 rounded-lg">
              <Building2 size={16} className="shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Zentrotik / Centro</span>
            </div>
            <ArrowRight size={18} className="text-secondary rotate-90 sm:rotate-0" />
            <div className="flex items-center gap-2 bg-muted px-3 sm:px-4 py-2 rounded-lg">
              <Home size={16} className="shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Etxera / Domicilio</span>
            </div>
          </div>

          {hasNoData ? <div className="text-center py-12 text-muted-foreground">
              <p>No hay horarios configurados.</p>
              <p className="text-sm mt-2">Usa el panel de administración para añadir usuarios y rutas.</p>
            </div> : <div className="grid gap-8">
              {afternoonFirst && afternoonFirst.trips.length > 0 && <ScheduleTable section={afternoonFirst} variant="afternoon" passengerNotes={passengerNotes} routeCode={currentRoute} />}
              {afternoonSecond && afternoonSecond.trips.length > 0 && <ScheduleTable section={afternoonSecond} variant="afternoon" passengerNotes={passengerNotes} routeCode={currentRoute} />}
              {afternoonThird && afternoonThird.trips.length > 0 && <ScheduleTable section={afternoonThird} variant="afternoon" passengerNotes={passengerNotes} routeCode={currentRoute} />}
            </div>}
        </TabsContent>

        <TabsContent value="contacts" className="animate-fade-in">
          <ContactsList fixedRoute={currentRoute} />
        </TabsContent>
      </Tabs>

      {(activeTab === "morning" || activeTab === "afternoon") && <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Accessibility size={28} strokeWidth={2.5} className="text-red-500 drop-shadow-sm" />
            <span>Silla / Aulkia</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge-b">B</span>
            <span>Bidaia arrunta / Viaje normal</span>
          </div>
        </div>}

      {/* Teléfonos: Centro | Incidencias | ERBI Responsables */}
      <div className="mt-8 pt-6 border-t border-border">
        <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto">
          {/* Izquierda: Teléfono del Centro */}
          {ROUTE_CENTER_PHONES[currentRoute] ? (
            <a 
              href={`tel:${ROUTE_CENTER_PHONES[currentRoute].phone.replace(/\s/g, '')}`}
              className="flex flex-col items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-4 rounded-xl transition-colors"
            >
              <Building2 size={24} className="shrink-0" />
              <div className="flex flex-col leading-tight text-center">
                <span className="text-[11px] font-semibold">{ROUTE_CENTER_PHONES[currentRoute].name}</span>
                <span className="font-bold text-sm">{ROUTE_CENTER_PHONES[currentRoute].phone}</span>
              </div>
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 bg-muted px-3 py-4 rounded-xl text-muted-foreground">
              <Building2 size={24} className="shrink-0" />
              <div className="flex flex-col leading-tight text-center">
                <span className="text-[11px] font-semibold">Centro</span>
                <span className="font-bold text-sm">—</span>
              </div>
            </div>
          )}

            {/* Centro: Botón de Incidencias */}
            <RouteIncidentsPanel routeCode={currentRoute} />

            {/* Derecha: ERBI Responsables - Llamada + WhatsApp */}
          <div className="flex flex-col items-center justify-center gap-2 bg-amber-500/10 px-3 py-4 rounded-xl">
            <div className="flex flex-col leading-tight text-center">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">ERBI Responsables</span>
              <span className="font-bold text-sm text-amber-700 dark:text-amber-400">673 449 444</span>
            </div>
            <div className="flex gap-3 mt-1">
              <a
                href="tel:673449444"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-400 transition-colors"
                title="Llamar"
              >
                <Phone size={20} />
              </a>
              <a
                href="https://wa.me/34673449444"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20 hover:bg-green-500/30 text-green-600 dark:text-green-400 transition-colors"
                title="WhatsApp"
              >
                <MessageCircle size={20} />
              </a>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>;
};