import erbiLogo from "@/assets/erbi-logo-clean.png";
import erbiBusHero from "@/assets/erbi-bus-hero.jpg";
import { RouteCombobox } from "./RouteCombobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRouteLabel } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RefreshCw, ChevronDown, Download, Share, Plus, Loader2, CheckCircle2, Bus } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { lazy, Suspense, useState } from "react";

const AIAssistantButton = lazy(() => import("./AIAssistantButton").then(m => ({ default: m.AIAssistantButton })));
const HomeIncidentsFeed = lazy(() => import("./HomeIncidentsFeed").then(m => ({ default: m.HomeIncidentsFeed })));

interface HeroBannerProps {
  currentRoute: string;
  setCurrentRoute: (route: string) => void;
  availableRoutes: string[];
  isAppMode: boolean;
  isReadOnly?: boolean;
  onRefresh: () => void;
  onHardReset: () => void;
}

export const HeroBanner = ({
  currentRoute,
  setCurrentRoute,
  availableRoutes,
  isAppMode,
  isReadOnly = false,
  onRefresh,
  onHardReset,
}: HeroBannerProps) => {
  const { canInstall, isInstalled, isIOS, install, isInstalling } = usePWAInstall();
  const [showIOSDialog, setShowIOSDialog] = useState(false);

  const handleInstallClick = async () => {
    if (canInstall) {
      await install();
    } else if (isIOS) {
      setShowIOSDialog(true);
    }
  };

  // Mostrar botón si no está instalada y no estamos en modo app
  const showInstallButton = !isInstalled && !isAppMode && (canInstall || isIOS);

  return (
    <div className="mb-6">
      {/* Hero Image Section - solo para ERBI, no para MATIA (ya tiene header propio) */}
      {!isReadOnly && (
        <div
          className="relative h-[280px] sm:h-[350px] flex flex-col items-center justify-center overflow-hidden rounded-t-xl"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.45)), url(${erbiBusHero})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="flex flex-col items-center z-[5]">
            <img
              src={erbiLogo}
              alt="ERBI Logo"
              className="object-contain drop-shadow-2xl mb-4 h-24 sm:h-32"
            />
            <h2 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg tracking-wide">
              Somos el Futuro
            </h2>
          </div>

          {/* Panel de incidencias en vivo - lateral derecho */}
          <Suspense fallback={null}><HomeIncidentsFeed /></Suspense>

          {/* Botón de instalación grande - visible sobre la imagen */}
          {showInstallButton && (
            <button
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="mt-6 flex items-center gap-3 bg-white text-primary font-extrabold text-xl px-8 py-4 rounded-2xl shadow-2xl hover:bg-primary hover:text-white active:scale-95 transition-all duration-150 disabled:opacity-70"
            >
              {isInstalling ? (
                <>
                  <Loader2 className="w-7 h-7 animate-spin" />
                  Instalando...
                </>
              ) : (
                <>
                  <Download className="w-7 h-7" />
                  Instalar App
                </>
              )}
            </button>
          )}

          {isInstalled && !isAppMode && (
            <div className="mt-6 flex items-center gap-2 bg-white/20 text-white px-5 py-3 rounded-xl text-base font-semibold">
              <CheckCircle2 className="w-6 h-6" />
              App instalada ✓
            </div>
          )}
        </div>
      )}

      {/* Controls Bar */}
      {isReadOnly ? (
        <div className="px-4 py-5 rounded-xl bg-white shadow-sm space-y-4">
          {/* AI Erbi CTA — elemento principal */}
          {!isAppMode && (
            <Suspense fallback={null}><AIAssistantButton matiaMode fullWidth /></Suspense>
          )}

          {/* Route selector con refresh integrado */}
          <RouteCombobox
            value={currentRoute}
            onValueChange={setCurrentRoute}
            availableRoutes={availableRoutes}
            matiaMode
            onRefresh={onRefresh}
          />
        </div>
      ) : (
        <div className="px-4 py-4 rounded-b-xl bg-gradient-to-r from-secondary/20 via-accent/20 to-pink-soft/30">
          <div className="flex flex-wrap items-center justify-center gap-4">
            {!isAppMode && <Suspense fallback={null}><AIAssistantButton matiaMode={false} /></Suspense>}

            <div className="flex flex-col items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-black dark:text-white uppercase tracking-widest drop-shadow-sm">
                ✦ Selección de Ruta ✦
              </span>
              <Select value={currentRoute || undefined} onValueChange={setCurrentRoute}>
                <SelectTrigger className="w-[280px] sm:w-[320px] h-12 text-base font-semibold bg-white dark:bg-gray-800 border-2 border-primary/30 shadow-md">
                  <Bus className="w-5 h-5 mr-2 text-primary shrink-0" />
                  <SelectValue placeholder="Seleccionar ruta..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {availableRoutes.map((route) => (
                    <SelectItem key={route} value={route} className="text-sm font-medium py-2.5">
                      {getRouteLabel(route)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg" className="gap-2">
                  <RefreshCw size={18} />
                  <span className="hidden sm:inline">Recargar</span>
                  <ChevronDown size={16} className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onRefresh(); }}>
                  Recargar datos
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onHardReset(); }}>
                  Reiniciar app (limpia caché)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Diálogo instrucciones iOS */}
      <Dialog open={showIOSDialog} onOpenChange={setShowIOSDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl">Instalar en iPhone</DialogTitle>
            <DialogDescription className="text-base">
              Sigue estos 3 pasos sencillos:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-4 p-4 bg-muted rounded-xl">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg shrink-0">1</span>
              <div>
                <p className="font-bold text-base">Pulsa el botón Compartir</p>
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  El icono <Share className="inline w-5 h-5 mx-1" /> en la barra inferior de Safari
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-muted rounded-xl">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg shrink-0">2</span>
              <div>
                <p className="font-bold text-base">Pulsa "Añadir a inicio"</p>
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  Busca el icono <Plus className="inline w-5 h-5 mx-1" /> en el menú
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-muted rounded-xl">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg shrink-0">3</span>
              <div>
                <p className="font-bold text-base">Pulsa "Añadir"</p>
                <p className="text-muted-foreground mt-1">¡Ya tienes la app instalada!</p>
              </div>
            </div>
          </div>
          <Button className="w-full text-base py-5 mt-2" onClick={() => setShowIOSDialog(false)}>
            Entendido
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
