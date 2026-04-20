import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Download, Check, Share, Plus, MoreVertical, CheckCircle2 } from "lucide-react";

interface InstallRouteButtonProps {
  routeName: string;
}

/**
 * Botón "Instalar esta ruta" para modo app individual.
 * - En Android, usa el prompt nativo beforeinstallprompt.
 * - En iOS, muestra instrucciones paso a paso (Compartir → Añadir a pantalla).
 * - Si ya está instalado (standalone), muestra un check.
 */
export const InstallRouteButton = ({ routeName }: InstallRouteButtonProps) => {
  const { install, canInstall, isIOS, isInstalled, isInstalling } = usePWAInstall();
  const [showIOSDialog, setShowIOSDialog] = useState(false);

  // Si ya está instalado (modo standalone), no mostrar nada
  if (isInstalled) {
    return null;
  }

  // Android: botón que dispara el prompt nativo
  if (canInstall) {
    return (
      <Button
        onClick={install}
        disabled={isInstalling}
        size="sm"
        variant="secondary"
        className="gap-2"
      >
        <Download size={14} />
        <span className="hidden sm:inline">Instalar</span>
      </Button>
    );
  }

  // iOS: botón que abre diálogo con instrucciones
  if (isIOS) {
    return (
      <>
        <Button
          onClick={() => setShowIOSDialog(true)}
          size="sm"
          variant="secondary"
          className="gap-2"
        >
          <Download size={14} />
          <span className="hidden sm:inline">Instalar</span>
        </Button>

        <Dialog open={showIOSDialog} onOpenChange={setShowIOSDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Instalar {routeName}</DialogTitle>
              <DialogDescription>
                Sigue estos pasos para añadir la app a tu pantalla de inicio
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium">Pulsa el botón Compartir</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    El icono <Share size={14} className="inline" /> en la barra de Safari
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium">Selecciona "Añadir a pantalla de inicio"</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    El icono <Plus size={14} className="inline" /> con un cuadrado
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium">Pulsa "Añadir"</p>
                  <p className="text-sm text-muted-foreground">
                    La app se instalará con acceso directo a {routeName}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setShowIOSDialog(false)}>Entendido</Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Navegador de escritorio u otro que no soporta instalación
  // Mostrar instrucciones genéricas
  return (
    <>
      <Button
        onClick={() => setShowIOSDialog(true)}
        size="sm"
        variant="outline"
        className="gap-2 opacity-80"
      >
        <Download size={14} />
        <span className="hidden sm:inline">Instalar</span>
      </Button>

      <Dialog open={showIOSDialog} onOpenChange={setShowIOSDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Instalar {routeName}</DialogTitle>
            <DialogDescription>
              Añade esta app a tu pantalla de inicio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              <strong>Chrome / Edge (Android):</strong> Pulsa el menú <MoreVertical size={14} className="inline" /> y selecciona "Instalar aplicación" o "Añadir a pantalla de inicio".
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Safari (iPhone/iPad):</strong> Pulsa <Share size={14} className="inline" /> Compartir y selecciona "Añadir a pantalla de inicio".
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Escritorio:</strong> En Chrome/Edge, busca el icono de instalación en la barra de direcciones.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowIOSDialog(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
