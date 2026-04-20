import { useMemo, useState } from "react";
import { Share2, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { buildAppShareUrl, getPublicAppBaseUrl } from "@/lib/shareUrl";

interface ShareButtonProps {
  className?: string;
  routeCode?: string; // Opcional: si no se pasa, usa la URL actual
}

// Mapa de archivos PWA por código de ruta.
// SIEMPRE enlazar al archivo PWA para que el móvil instale el manifest correcto.
// NUNCA generar enlaces de web normal.
const PWA_FILES: Record<string, string> = {
  MATIA: "/pwa-matia.html",
  ASPACE: "/pwa-aspace.html",
  AMARAEN: "/pwa-amaraen-diario.html",
  "AMARAEN FINDE": "/pwa-amaraen.html",
  EGILUZE: "/pwa-egiluze.html",
  EGURTZEGI: "/pwa-egurtzegi.html",
  BERMINGHAM: "/pwa-bermingham.html",
  LASARTE: "/pwa-lasarte.html",
  LAMOROUSE: "/pwa-lamorouse.html",
  IGELDO: "/pwa-igeldo.html",
  FRAISORO: "/pwa-fraisoro.html",
  FRAISORO_2: "/pwa-fraisoro2.html",
};

const ShareButton = ({ className, routeCode }: ShareButtonProps) => {
  const [copied, setCopied] = useState(false);

  // Genera SIEMPRE el enlace al archivo PWA dedicado para que el móvil instale
  // el manifest correcto. NUNCA enlazar a la web normal.
  const shareUrl = useMemo(() => {
    if (routeCode && PWA_FILES[routeCode]) {
      const base = getPublicAppBaseUrl();
      return `${base}${PWA_FILES[routeCode]}`;
    }
    // Fallback: URL actual normalizada con app=true
    return buildAppShareUrl({ url: window.location.href });
  }, [routeCode]);

  const displayRoute = routeCode || "Ruta";

  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "¡Enlace copiado!",
        description: `Enlace de app copiado al portapapeles`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace",
        variant: "destructive",
      });
    }
  };

  const shareNative = async () => {
    if (!canNativeShare) return;

    try {
      await navigator.share({
        title: `App ${displayRoute}`,
        text: `Instala la app de horarios ${displayRoute}`,
        url: shareUrl,
      });
    } catch {
      // User cancelled or error
    }
  };

  const handleShareClick = () => {
    if (canNativeShare) {
      shareNative();
    } else {
      copyToClipboard();
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Share2 className="h-4 w-4 mr-2" />
          Compartir App
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Enlace de instalación (App Móvil)</h4>
          <p className="text-xs text-muted-foreground">
            📱 Abre este enlace en el móvil para instalar la app de {displayRoute}
          </p>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted truncate"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={copyToClipboard}
              className="shrink-0"
              aria-label="Copiar enlace"
            >
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Share button - native on mobile, copy on desktop */}
          <Button
            onClick={handleShareClick}
            className="w-full"
            size="sm"
          >
            <Share2 className="h-4 w-4 mr-2" />
            {canNativeShare ? "Compartir vía..." : "Copiar enlace"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ShareButton;
