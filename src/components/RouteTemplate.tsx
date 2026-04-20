import { useState, useMemo, useEffect } from "react";
import { useActivityLog } from "@/hooks/useActivityLog";
import { DailyChangesButton } from "@/components/DailyChangesModal";
import { useNavigate, useSearchParams } from "react-router-dom";
import matiaLogo from "@/assets/matia-logo.png";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleTable } from "@/components/ScheduleTable";
import { ContactsList } from "@/components/ContactsList";
import { DigitalClock } from "@/components/DigitalClock";
import { RouteNotifications } from "@/components/RouteNotifications";
import { NotificationBell } from "@/components/NotificationBell";
import { useScheduleData } from "@/hooks/useScheduleData";
import { usePassengerNotes } from "@/hooks/usePassengerNotes";
import { useAuth } from "@/hooks/useAuth";
import { useSchedule } from "@/context/ScheduleContext";
import { useRoutePwaBranding } from "@/hooks/useRoutePwaBranding";
import { useVehicleTracking } from "@/hooks/useVehicleTracking";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { AdminPanel } from "./AdminPanel";
import { RouteIncidentsPanel } from "./RouteIncidentsPanel";
import { DailyRouteRecordCount } from "./DailyRouteRecordCount";
import ShareButton from "./ShareButton";
import { InstallRouteButton } from "./InstallRouteButton";
import { getPublicAppBaseUrl } from "@/lib/shareUrl";
import { Sunrise, Sunset, Home, Building2, ArrowRight, Users, Loader2, RefreshCw, Calendar, Shield, LogOut, Accessibility, Phone, MessageCircle, Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Share, Plus } from "lucide-react";
import erbiLogo from "@/assets/erbi-logo-clean.png";

// Mapa de teléfonos del bus por ruta (BUS 🐇)
const ROUTE_BUS_PHONES: Record<string, string> = {
  "LASARTE": "673 449 422",
  "AMARAEN FINDE": "673 449 444",
};

// Mapa de teléfonos del Centro por ruta
const ROUTE_CENTER_PHONES: Record<string, { name: string; phone: string; phones?: string[] }> = {
  "MATIA": { name: "Matia Rezola", phone: "943 317 120" },
  "ASPACE": { name: "Aspace Intxaurrondo", phone: "943 310 510" },
  "AMARAEN FINDE": { name: "Centro de día Rezola", phone: "943 317 120" },
  "EGURTZEGI": { name: "Matia Usurbil", phone: "943 302 563", phones: ["943 302 563", "638 823 409"] },
  "EGILUZE": { name: "Gautena Egiluze", phone: "943 317 100" },
  "BERMINGHAM": { name: "Matia Bermingham", phone: "943 317 100" },
  "LASARTE": { name: "Matia Lasarte", phone: "943 317 100" },
  "LAMOROUSE": { name: "Centro Lamorouse", phone: "943 327 793" },
  "ARGIXAO_1": { name: "Matia Argixao", phone: "943 317 100" },
  "ARGIXAO_2": { name: "Matia Argixao", phone: "943 317 100" },
};

interface RouteTemplateProps {
  routeCode: string;       // Código de la ruta en la BD (ej: "MATIA", "ASPACE")
  routeName: string;       // Nombre para mostrar (ej: "MATIA ERBI", "ASPACE INTXAURRONDO")
  showLogo?: boolean;      // Mostrar logo ERBI
}

/**
 * Plantilla reutilizable para páginas de rutas independientes.
 * 
 * Uso:
 * <RouteTemplate 
 *   routeCode="MATIA" 
 *   routeName="MATIA ERBI" 
 * />
 * 
 * Para crear una nueva ruta:
 * 1. Añadir los datos de la ruta en la BD (passengers, schedule_trips)
 * 2. Crear una nueva página en src/pages/ usando este componente
 * 3. Añadir la ruta en src/App.tsx
 */
export const RouteTemplate = ({ 
  routeCode, 
  routeName, 
  showLogo = true 
}: RouteTemplateProps) => {
  const [activeTab, setActiveTab] = useState("morning");
  const [showIOSInstallDialog, setShowIOSInstallDialog] = useState(false);
  const [installBannerDismissed, setInstallBannerDismissed] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin, signOut } = useAuth();
  const { setCurrentRoute: setScheduleRoute } = useSchedule();
  const { install, canInstall, isIOS, isInstalled, isInstalling } = usePWAInstall();

  // Asegura que los registros de asistencia se guarden bajo la ruta correcta
  useEffect(() => {
    setScheduleRoute(routeCode);
  }, [routeCode, setScheduleRoute]);

  // Modo app móvil: oculta botones de gestión y logo Erbi
  const isAppMode = useMemo(() => searchParams.get("app") === "true", [searchParams]);

  // En app individual (instalable) cargamos un manifest específico por ruta
  useRoutePwaBranding({ routeCode, routeName, enabled: isAppMode });

  // Registrar actividad de consulta de ruta
  useActivityLog(`Ruta ${routeCode}`, { ruta: routeCode });

  // GPS tracking (ASPACE): debe funcionar también fuera de "app mode".
  // Si el conductor está logueado como admin y concede GPS, publicamos puntos para calcular ETA.
  useVehicleTracking(routeCode, routeCode === "ASPACE" && isAdmin);

  const handleLogout = async () => {
    await signOut();
    toast.success("Sesión cerrada");
  };

  const {
    morningFirst,
    morningSecond,
    morningThird,
    afternoonFirst,
    afternoonSecond,
    afternoonThird,
    loading,
    error,
    refetch
  } = useScheduleData(routeCode, {
    // En modo app desactivamos realtime para máxima estabilidad
    enableRealtime: !isAppMode,
  });

  // Fetch passenger notes for this route
  const { notes: passengerNotes } = usePassengerNotes(routeCode);

  // Fecha en euskera (formato manual para compatibilidad) - memoizada
  const todayEu = useMemo(() => {
    const date = new Date();
    const days = ['Igandea', 'Astelehena', 'Asteartea', 'Asteazkena', 'Osteguna', 'Ostirala', 'Larunbata'];
    const months = ['urtarrilak', 'otsailak', 'martxoak', 'apirilak', 'maiatzak', 'ekainak', 'uztailak', 'abuztuak', 'irailak', 'urriak', 'azaroak', 'abenduak'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]}ren ${date.getDate()}a`;
  }, []);
  
  const todayEs = useMemo(() => new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }), []);

  // En modo app, mostrar loading más amigable con opción de recuperación
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando horarios...</p>
          {isAppMode && (
            <p className="text-xs text-muted-foreground/60 mt-2">
              Si tarda demasiado, cierra y abre la app
            </p>
          )}
        </div>
      </div>
    );
  }

  // Solo mostrar pantalla de error si no hay datos cargados previamente
  const showErrorScreen = error && !morningFirst && !morningSecond && !afternoonFirst && !afternoonSecond;

  if (showErrorScreen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={refetch} variant="outline" className="gap-2">
            <RefreshCw size={16} />
            Recargar
          </Button>
        </div>
      </div>
    );
  }

  const hasNoData = !morningFirst?.trips.length && !morningSecond?.trips.length && !morningThird?.trips.length &&
                    !afternoonFirst?.trips.length && !afternoonSecond?.trips.length && !afternoonThird?.trips.length;

  return (
    <>
      {/* Modal de notificaciones para modo app - FUERA del layout principal */}
      {isAppMode && (
        <RouteNotifications
          routeCode={routeCode}
          isModalMode
          enableRealtime={false}
        />
      )}
      
      <div className="min-h-screen bg-background">
      {/* Header - diseño específico por perfil */}
      {routeCode === "MATIA" ? (
        /* ── Header MATIA: identidad rosa profesional ── */
        <header className="sticky top-0 z-50 shadow-md" style={{ background: 'linear-gradient(135deg, #E8007D 0%, #c4006a 100%)' }}>
          {/* Barra superior: fecha bilingüe */}
          <div className="flex items-center justify-center gap-2 px-4 py-2 bg-black/10 border-b border-white/15">
            <Calendar size={14} className="text-white/70" />
            <span className="capitalize text-xs sm:text-sm font-medium text-white/85 tracking-wide">
              {todayEu} / {todayEs}
            </span>
          </div>
          
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              {/* Logo + título MATIA */}
              <div className="flex items-center gap-3 min-w-0">
                <NotificationBell routeCode={routeCode} enableRealtime={!isAppMode} />
                <div className="bg-white rounded-xl p-1.5 shadow-sm shrink-0">
                  <img src={matiaLogo} alt="Matia Fundazioa" className="h-10 sm:h-12 object-contain" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight truncate">{routeName}</h1>
                  <p className="text-white/70 text-xs sm:text-sm font-medium">Ibilbideen jarraipena</p>
                </div>
              </div>
              
              {/* Controles MATIA */}
              {!isAppMode ? (
                <div className="flex items-center gap-2 shrink-0">
                  {isAdmin ? (
                    <>
                      <AdminPanel />
                      <DailyChangesButton />
                      <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-white/90 hover:text-white hover:bg-white/15 text-xs font-semibold">
                        <LogOut size={16} />
                        <span className="hidden sm:inline">Salir</span>
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => navigate('/admin-pin')} className="gap-1.5 text-white/70 hover:text-white hover:bg-white/15 text-xs font-semibold">
                      <Shield size={16} />
                      <span className="hidden sm:inline">Acceso Admin</span>
                    </Button>
                  )}
                  <Button onClick={refetch} variant="ghost" size="sm" className="gap-1.5 text-white/90 hover:text-white hover:bg-white/15 text-xs font-semibold">
                    <RefreshCw size={16} />
                    <span className="hidden sm:inline">Recargar</span>
                  </Button>
                  {routeCode === "MATIA" && <ShareButton routeCode={routeCode} className="text-white/90 border-white/30 hover:bg-white/15 hover:text-white" />}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <InstallRouteButton routeName={routeName} />
                  <Button onClick={refetch} variant="ghost" size="sm" className="text-white/90 hover:bg-white/15">
                    <RefreshCw size={16} />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>
      ) : (
        /* ── Header genérico ERBI ── */
        <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
          <div className="container mx-auto px-4 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <NotificationBell routeCode={routeCode} enableRealtime={!isAppMode} />
                {!isAppMode && showLogo && (
                  <img src={erbiLogo} alt="Erbi Logo" className="h-16 sm:h-20 object-contain" />
                )}
                <div>
                  <h1 className="text-2xl sm:text-4xl font-bold text-foreground">{routeName}</h1>
                  <p className="text-muted-foreground text-base sm:text-lg">Horario de Transporte</p>
                </div>
              </div>
              
              {ROUTE_BUS_PHONES[routeCode] && (
                <a 
                  href={`tel:${ROUTE_BUS_PHONES[routeCode].replace(/\s/g, '')}`}
                  className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3 py-2 rounded-lg transition-colors shrink-0"
                >
                  <Phone size={18} className="shrink-0" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs font-medium">Tel. Bus</span>
                    <span className="font-bold text-sm">{ROUTE_BUS_PHONES[routeCode]}</span>
                  </div>
                </a>
              )}
              
              {!isAppMode && (
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  {isAdmin ? (
                    <>
                      <div className="flex items-center gap-1.5 text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-full font-semibold">
                        <Shield size={16} />
                        <span>Admin</span>
                      </div>
                      <AdminPanel />
                      <DailyChangesButton />
                      <Button variant="outline" size="default" onClick={handleLogout} className="gap-2 text-sm font-semibold">
                        <LogOut size={18} />
                        <span className="hidden sm:inline">Cerrar sesión</span>
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="default" onClick={() => navigate('/admin-pin')} className="gap-2 text-muted-foreground hover:text-foreground text-sm font-semibold">
                      <Shield size={20} />
                      <span className="hidden sm:inline">Acceso Admin</span>
                    </Button>
                  )}
                  <Button onClick={refetch} variant="outline" size="default" className="gap-2 text-sm font-semibold">
                    <RefreshCw size={18} />
                    <span className="hidden sm:inline">Recargar</span>
                  </Button>
                  {routeCode === "MATIA" && <ShareButton routeCode={routeCode} />}
                  <div className="hidden sm:flex items-center text-muted-foreground bg-muted px-4 py-2.5 rounded-md gap-2">
                    <Calendar size={18} className="text-pink-soft" />
                    <span className="capitalize text-foreground text-sm font-semibold">{todayEu} / {todayEs}</span>
                  </div>
                </div>
              )}
              
              {isAppMode && (
                <div className="flex items-center gap-2">
                  <InstallRouteButton routeName={routeName} />
                  <Button onClick={refetch} variant="outline" size="default" className="gap-2">
                    <RefreshCw size={18} />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Banner de instalación grande - solo en modo WEB, no en app instalada */}
      {!isAppMode && !isInstalled && !installBannerDismissed && (canInstall || isIOS) && (
        <div className="bg-primary/10 border-b-4 border-primary px-4 py-5 shadow-sm">
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 shrink-0">
                <Smartphone size={32} className="text-primary" />
              </div>
              <div>
                <p className="font-extrabold text-xl leading-tight text-foreground">📲 Instala la app de {routeName}</p>
                <p className="text-muted-foreground text-base mt-0.5">Acceso directo desde tu móvil, sin buscar en el navegador</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {canInstall ? (
                <Button
                  onClick={install}
                  disabled={isInstalling}
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-extrabold flex-1 sm:flex-none gap-2 h-14 text-lg px-6 shadow-md"
                >
                  <Download size={22} />
                  {isInstalling ? "Instalando..." : "Instalar ahora"}
                </Button>
              ) : isIOS ? (
                <Button
                  onClick={() => setShowIOSInstallDialog(true)}
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-extrabold flex-1 sm:flex-none gap-2 h-14 text-lg px-6 shadow-md"
                >
                  <Download size={22} />
                  Cómo instalar
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setInstallBannerDismissed(true)}
                className="text-muted-foreground hover:bg-muted shrink-0 h-12 w-12"
                aria-label="Cerrar"
              >
                <X size={24} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo instrucciones iOS */}
      <Dialog open={showIOSInstallDialog} onOpenChange={setShowIOSInstallDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Instalar {routeName} en iPhone/iPad</DialogTitle>
            <DialogDescription>
              Sigue estos pasos para añadir la app a tu pantalla de inicio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">1</div>
              <div>
                <p className="font-medium">Pulsa el botón Compartir</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  El icono <Share size={14} className="inline mx-1" /> en la barra de Safari
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">2</div>
              <div>
                <p className="font-medium">Selecciona "Añadir a pantalla de inicio"</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  El icono <Plus size={14} className="inline mx-1" /> con un cuadrado
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">3</div>
              <div>
                <p className="font-medium">Pulsa "Añadir"</p>
                <p className="text-sm text-muted-foreground">La app se instalará con acceso directo a {routeName}</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowIOSInstallDialog(false)}>Entendido</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contenido */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Pestañas de navegación - diseño accesible para personas mayores */}
          <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 h-14 p-1 bg-muted/60 border border-border rounded-xl gap-1">
            <TabsTrigger
              value="morning"
              className="flex items-center gap-1.5 h-full rounded-lg text-muted-foreground font-semibold transition-all duration-200
                data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow
                data-[state=inactive]:bg-background data-[state=inactive]:hover:bg-primary/10 data-[state=inactive]:border data-[state=inactive]:border-border"
            >
              <Sunrise size={18} />
              <span className="text-sm font-bold">Mañana</span>
            </TabsTrigger>
            <TabsTrigger
              value="afternoon"
              className="flex items-center gap-1.5 h-full rounded-lg text-muted-foreground font-semibold transition-all duration-200
                data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow
                data-[state=inactive]:bg-background data-[state=inactive]:hover:bg-secondary/10 data-[state=inactive]:border data-[state=inactive]:border-border"
            >
              <Sunset size={18} />
              <span className="text-sm font-bold">Tarde</span>
            </TabsTrigger>
            <TabsTrigger
              value="contacts"
              className="flex items-center gap-1.5 h-full rounded-lg text-muted-foreground font-semibold transition-all duration-200
                data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow
                data-[state=inactive]:bg-background data-[state=inactive]:hover:bg-accent/10 data-[state=inactive]:border data-[state=inactive]:border-border"
            >
              <Users size={28} />
              <span className="text-base font-extrabold">Contactos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="morning" className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                {routeName}
              </h2>
              {/* Fecha bilingüe */}
              <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-lg text-muted-foreground">
                <Calendar size={18} className="text-pink-soft flex-shrink-0" />
                <span className="capitalize text-foreground text-sm font-semibold">
                  {todayEu} / {todayEs}
                </span>
              </div>
              <DailyRouteRecordCount routeCode={routeCode} />
            </div>

            {/* Avisos de la ruta - web normal muestra todos, app muestra solo no-bloqueantes */}
            <RouteNotifications 
              routeCode={routeCode} 
              enableRealtime={!isAppMode}
              isAppMode={isAppMode}
            />

            {/* Reloj digital */}
            <div className="flex justify-center">
              <DigitalClock variant="morning" />
            </div>

            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
                <Home size={16} />
                <span className="text-sm">Etxetik</span>
              </div>
              <ArrowRight size={18} className="text-primary" />
              <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
                <Building2 size={16} />
                <span className="text-sm">Zentrora</span>
              </div>
            </div>

            {hasNoData ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No hay horarios configurados.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {morningFirst && morningFirst.trips.length > 0 && <ScheduleTable section={morningFirst} variant="morning" passengerNotes={passengerNotes} routeCode={routeCode} />}
                {morningSecond && morningSecond.trips.length > 0 && <ScheduleTable section={morningSecond} variant="morning" passengerNotes={passengerNotes} routeCode={routeCode} />}
                {morningThird && morningThird.trips.length > 0 && <ScheduleTable section={morningThird} variant="morning" passengerNotes={passengerNotes} routeCode={routeCode} />}
              </div>
            )}
          </TabsContent>

          <TabsContent value="afternoon" className="space-y-6 animate-fade-in">
            {/* Avisos de la ruta - web normal muestra todos, app muestra solo no-bloqueantes */}
            <RouteNotifications 
              routeCode={routeCode} 
              enableRealtime={!isAppMode}
              isAppMode={isAppMode}
            />

            {/* Reloj digital */}
            <div className="flex justify-center">
              <DigitalClock variant="afternoon" />
            </div>

            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
                <Building2 size={16} />
                <span className="text-sm">Zentrotik</span>
              </div>
              <ArrowRight size={18} className="text-secondary" />
              <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
                <Home size={16} />
                <span className="text-sm">Etxera</span>
              </div>
            </div>

            {hasNoData ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No hay horarios configurados.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {afternoonFirst && afternoonFirst.trips.length > 0 && <ScheduleTable section={afternoonFirst} variant="afternoon" passengerNotes={passengerNotes} routeCode={routeCode} />}
                {afternoonSecond && afternoonSecond.trips.length > 0 && <ScheduleTable section={afternoonSecond} variant="afternoon" passengerNotes={passengerNotes} routeCode={routeCode} />}
                {afternoonThird && afternoonThird.trips.length > 0 && <ScheduleTable section={afternoonThird} variant="afternoon" passengerNotes={passengerNotes} routeCode={routeCode} />}
              </div>
            )}
          </TabsContent>

          <TabsContent value="contacts" className="animate-fade-in">
            <ContactsList fixedRoute={routeCode} />
          </TabsContent>
        </Tabs>

        {(activeTab === "morning" || activeTab === "afternoon") && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Accessibility size={28} strokeWidth={2.5} className="text-red-500 drop-shadow-sm" />
              <span>Silla / Aulkia</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge-b">B</span>
              <span>Bidaia arrunta</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer con teléfonos: Centro | Incidencias | ERBI Responsables | Instalar App */}
      <footer className="border-t border-border bg-muted/50 py-5 mt-auto">
        <div className="container mx-auto px-4">
          <div className={`grid gap-3 max-w-2xl mx-auto ${isAppMode ? 'grid-cols-3 max-w-lg' : routeCode === "MATIA" ? 'grid-cols-5' : 'grid-cols-4'}`}>
            {/* Izquierda: Teléfono del Centro */}
            {ROUTE_CENTER_PHONES[routeCode] ? (
              <div className="flex flex-col items-center justify-center gap-1.5 bg-primary/10 text-primary px-2 py-4 rounded-xl">
                <Building2 size={24} className="shrink-0" />
                <div className="flex flex-col leading-tight text-center">
                  <span className="text-[11px] font-medium">{ROUTE_CENTER_PHONES[routeCode].name}</span>
                  {(ROUTE_CENTER_PHONES[routeCode].phones || [ROUTE_CENTER_PHONES[routeCode].phone]).map((p) => (
                    <a
                      key={p}
                      href={`tel:${p.replace(/\s/g, '')}`}
                      className="font-bold text-sm sm:text-base hover:underline"
                    >
                      {p}
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5 bg-muted px-2 py-4 rounded-xl text-muted-foreground">
                <Building2 size={24} className="shrink-0" />
                <div className="flex flex-col leading-tight text-center">
                  <span className="text-[11px] font-medium">Centro</span>
                  <span className="font-bold text-sm sm:text-base">—</span>
                </div>
              </div>
            )}

            {/* Centro: Botón de Incidencias */}
            <RouteIncidentsPanel routeCode={routeCode} />

            {/* ERBI Responsables - Llamada + WhatsApp */}
            <div className="flex flex-col items-center justify-center gap-2 bg-amber-500/10 px-2 py-4 rounded-xl">
              <div className="flex flex-col leading-tight text-center">
                <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">ERBI Responsables</span>
                <span className="font-bold text-sm sm:text-base text-amber-700 dark:text-amber-400">673 449 444</span>
              </div>
              <div className="flex gap-3 mt-1">
                <a
                  href="tel:673449444"
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-400 transition-colors"
                  title="Llamar"
                >
                  <Phone size={24} />
                </a>
                <a
                  href="https://wa.me/34673449444"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 hover:bg-green-500/30 text-green-600 dark:text-green-400 transition-colors"
                  title="WhatsApp"
                >
                  <MessageCircle size={24} />
                </a>
              </div>
            </div>

            {/* Instalar App - solo en web, nunca en modo app instalado */}
            {!isAppMode && (() => {
              const PWA_URLS: Record<string, string> = {
                MATIA: "/pwa-matia.html",
                ASPACE: "/pwa-aspace.html",
                AMARAEN: "/pwa-amaraen-diario.html",
                "AMARAEN FINDE": "/pwa-amaraen.html",
                EGURTZEGI: "/pwa-egurtzegi.html",
                EGILUZE: "/pwa-egiluze.html",
                BERMINGHAM: "/pwa-bermingham.html",
                LASARTE: "/pwa-lasarte.html",
                LAMOROUSE: "/pwa-lamorouse.html",
                IGELDO: "/pwa-igeldo.html",
                FRAISORO: "/pwa-fraisoro.html",
                FRAISORO_2: "/pwa-fraisoro2.html",
                ARGIXAO_1: "/pwa-argixao1.html",
                ARGIXAO_2: "/pwa-argixao2.html",
              };
              const pwaPath = PWA_URLS[routeCode];
              if (!pwaPath) return null;
              const pwaUrl = `${getPublicAppBaseUrl()}${pwaPath}`;
              return (
                <button
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = pwaUrl;
                    a.target = "_blank";
                    a.rel = "noopener noreferrer";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary px-2 py-4 rounded-xl transition-colors cursor-pointer border-0"
                  title={`Instalar app ${routeName}`}
                >
                  <Download size={24} className="shrink-0" />
                  <div className="flex flex-col leading-tight text-center">
                    <span className="text-[11px] font-medium">Instalar App</span>
                    <span className="font-bold text-xs sm:text-sm leading-tight">{routeName}</span>
                  </div>
                </button>
              );
            })()}

            {/* Compartir App - todas las rutas en web, nunca en modo app instalado */}
            {!isAppMode && (
              <button
                onClick={() => {
                  const PWA_SHARE: Record<string, string> = {
                    MATIA: "/pwa-matia.html",
                    ASPACE: "/pwa-aspace.html",
                    AMARAEN: "/pwa-amaraen-diario.html",
                    "AMARAEN FINDE": "/pwa-amaraen.html",
                    EGURTZEGI: "/pwa-egurtzegi.html",
                    EGILUZE: "/pwa-egiluze.html",
                    BERMINGHAM: "/pwa-bermingham.html",
                    LASARTE: "/pwa-lasarte.html",
                    LAMOROUSE: "/pwa-lamorouse.html",
                    IGELDO: "/pwa-igeldo.html",
                    FRAISORO: "/pwa-fraisoro.html",
                    FRAISORO_2: "/pwa-fraisoro2.html",
                    ARGIXAO_1: "/pwa-argixao1.html",
                    ARGIXAO_2: "/pwa-argixao2.html",
                  };
                  const pwaFile = PWA_SHARE[routeCode] || `/pwa-${routeCode.toLowerCase()}.html`;
                  const shareUrl = `${getPublicAppBaseUrl()}${pwaFile}`;
                  if (navigator.share) {
                    navigator.share({
                      title: `App ${routeName}`,
                      text: `Instala la app de horarios ${routeName}`,
                      url: shareUrl,
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(shareUrl).then(() => {
                      toast.success("¡Enlace copiado al portapapeles!");
                    }).catch(() => {
                      toast.error("No se pudo copiar el enlace");
                    });
                  }
                }}
                className="flex flex-col items-center justify-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-4 rounded-xl transition-colors cursor-pointer border-0"
                title={`Compartir app ${routeName}`}
              >
                <Share size={24} className="shrink-0" />
                <div className="flex flex-col leading-tight text-center">
                  <span className="text-[11px] font-medium">Compartir</span>
                  <span className="font-bold text-xs sm:text-sm leading-tight">App</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </footer>
      </div>
    </>
  );
};
