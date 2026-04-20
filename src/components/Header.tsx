import { Calendar, Shield, LogOut, Download, LayoutDashboard, Building2 } from "lucide-react";
import erbiLogo from "@/assets/erbi-logo-clean.png";
import matiaLogo from "@/assets/matia-logo.png";
import { lazy, Suspense } from "react";
const CalendarSummary = lazy(() => import("./CalendarSummary").then(m => ({ default: m.CalendarSummary })));
const AdminPanel = lazy(() => import("./AdminPanel").then(m => ({ default: m.AdminPanel })));
const AttendanceStats = lazy(() => import("./AttendanceStats").then(m => ({ default: m.AttendanceStats })));
const MonthlyExcelExport = lazy(() => import("./MonthlyExcelExport").then(m => ({ default: m.MonthlyExcelExport })));
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const Header = () => {
  const { isAdmin, isMatia, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { canInstall, install, isInstalling, isInstalled } = usePWAInstall();
  
  // Fecha en euskera (formato manual para compatibilidad)
  const todayEu = (() => {
    const date = new Date();
    const days = ['Igandea', 'Astelehena', 'Asteartea', 'Asteazkena', 'Osteguna', 'Ostirala', 'Larunbata'];
    const months = ['urtarrilak', 'otsailak', 'martxoak', 'apirilak', 'maiatzak', 'ekainak', 'uztailak', 'abuztuak', 'irailak', 'urriak', 'azaroak', 'abenduak'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]}ren ${date.getDate()}a`;
  })();
  
  const todayEs = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const handleLogout = async () => {
    await signOut();
    toast.success('Sesión cerrada');
  };

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      toast.success('¡App instalada correctamente!');
    }
  };

  return (
    <header className={`border-b border-border ${isMatia ? 'bg-[#E8007D] text-white shadow-lg' : 'bg-gradient-to-r from-destructive/20 via-accent/20 to-secondary/20 shadow-sm'}`}>
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
        {/* Fecha bilingüe - parte superior */}
        <div className={`flex items-center justify-center gap-2 mb-1.5 sm:mb-2 pb-1.5 sm:pb-2 border-b ${isMatia ? 'border-white/20' : 'border-border/50'}`}>
          <Calendar size={16} className={isMatia ? 'text-white/80' : 'text-primary'} />
          <span className={`capitalize text-sm sm:text-base font-bold ${isMatia ? 'text-white/90' : 'text-foreground'}`}>
            {isMobile ? todayEs : `${todayEu} / ${todayEs}`}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo y título */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {isMatia ? (
              <div className="bg-white rounded-xl sm:rounded-2xl p-1.5 sm:p-2 shadow-md shrink-0">
                <img src={matiaLogo} alt="Matia Fundazioa Logo" className="h-10 sm:h-24 object-contain" />
              </div>
            ) : (
              <img src={erbiLogo} alt="Erbi Logo" className="h-10 sm:h-20 object-contain flex-shrink-0" />
            )}
            <div className={`flex flex-col min-w-0 ${isMatia ? 'gap-0.5 sm:gap-1' : 'sm:flex-row sm:items-baseline sm:gap-3'}`}>
              <h1 className={`font-extrabold tracking-tight truncate ${isMatia ? 'text-xl sm:text-4xl text-white' : 'text-lg sm:text-3xl text-foreground'}`}>
                {isMatia ? "MATIA" : "ERBI"}
                <span className="hidden sm:inline">{isMatia ? " FUNDAZIOA" : " RUTAS"}</span>
              </h1>
              <span className={`font-bold truncate ${isMatia ? 'text-xs sm:text-xl text-white/90' : 'text-xs sm:text-lg text-primary'}`}>
                {isMatia ? "Ibilbideak" : "Ibilbideak"}
              </span>
            </div>
          </div>
          
          {/* Controles de la derecha */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            
            {/* Botón de instalar PWA - visible cuando se puede instalar */}
            {canInstall && !isInstalled && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size={isMobile ? "icon" : "sm"}
                      onClick={handleInstall}
                      disabled={isInstalling}
                      className={`font-semibold bg-primary/10 border-primary/30 hover:bg-primary/20 text-primary ${isMobile ? 'h-8 w-8' : 'gap-2'}`}
                    >
                      <Download size={isMobile ? 14 : 16} className={isInstalling ? "animate-bounce" : ""} />
                      {!isMobile && (
                        <span>
                          {isInstalling ? "Instalando..." : "Instalar"}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Instalar ERBI como aplicación de escritorio</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Auth buttons */}
            {isAdmin ? (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`flex items-center gap-1.5 text-sm font-bold bg-primary/10 text-primary ${isMobile ? 'p-1.5' : 'px-3 py-1.5'} rounded-full cursor-pointer`}>
                        <Shield size={isMobile ? 14 : 16} strokeWidth={2.5} />
                        {!isMobile && <span>Admin</span>}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>Sesión de administrador activa</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                
                <Suspense fallback={null}><AdminPanel /></Suspense>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size={isMobile ? "icon" : "default"} onClick={handleLogout} className={`font-bold text-sm ${isMobile ? 'h-8 w-8' : 'gap-2'}`}>
                        <LogOut size={isMobile ? 14 : 18} strokeWidth={2.5} />
                        {!isMobile && <span>Salir</span>}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Cerrar sesión de administrador</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            ) : isMatia ? (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`flex items-center gap-1.5 text-sm font-bold bg-white/20 text-white ${isMobile ? 'p-1.5' : 'px-3 py-1.5'} rounded-full cursor-pointer`}>
                        <Building2 size={isMobile ? 14 : 16} strokeWidth={2.5} />
                        {!isMobile && <span>MATIA</span>}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>Sesión de consulta MATIA Fundazioa</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size={isMobile ? "icon" : "default"} onClick={handleLogout} className={`font-bold text-sm border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white ${isMobile ? 'h-8 w-8' : 'gap-2'}`}>
                        <LogOut size={isMobile ? 14 : 18} strokeWidth={2.5} />
                        {!isMobile && <span>Salir</span>}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Cerrar sesión MATIA</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size={isMobile ? "icon" : "default"} onClick={() => navigate('/admin-pin')} className={`font-bold text-muted-foreground hover:text-foreground ${isMobile ? 'h-8 w-8' : 'gap-2'}`}>
                      <Shield size={isMobile ? 14 : 18} strokeWidth={2.5} />
                      {!isMobile && <span>Admin</span>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Acceder como administrador</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Botón calendario histórico - solo admin */}
            {isAdmin && <Suspense fallback={null}><CalendarSummary /></Suspense>}
            
            {/* Hidden instances for AI Erbi shortcuts (event listeners must be mounted) */}
            {(isAdmin || isMatia) && (
              <Suspense fallback={null}>
                <AttendanceStats hideTrigger />
                <MonthlyExcelExport hideTrigger />
                {!isAdmin && <CalendarSummary />}
                {!isAdmin && <AdminPanel hideTrigger />}
              </Suspense>
            )}
            
          </div>
        </div>
      </div>
    </header>
  );
};
