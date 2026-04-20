import { Header } from "@/components/Header";
import { ScheduleView } from "@/components/ScheduleView";
import { RouteProvider, useRoute } from "@/context/RouteContext";
import { useAuth } from "@/hooks/useAuth";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useNavigate, NavigateFunction } from "react-router-dom";
import { useEffect, useMemo } from "react";

import { ExternalLink, Copy, Check, RefreshCw, Calendar, AlertTriangle, Clock, FileText, Users, BarChart3, CalendarDays, FileSpreadsheet, Bell, Phone } from "lucide-react";
import { Share2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getPublicAppBaseUrl } from "@/lib/shareUrl";
import { Input } from "@/components/ui/input";
import { lazy, Suspense } from "react";

const AIAssistantButton = lazy(() => import("@/components/AIAssistantButton").then(m => ({ default: m.AIAssistantButton })));
const NotificationManager = lazy(() => import("@/components/NotificationManager").then(m => ({ default: m.NotificationManager })));
const CompanyPhoneDirectory = lazy(() => import("@/components/CompanyPhoneDirectory").then(m => ({ default: m.CompanyPhoneDirectory })));

/**
 * Pantalla de recuperación para PWAs standalone que no encuentran token.
 * En lugar de un callejón sin salida, permite al usuario:
 * 1. Pegar un enlace de seguimiento recibido por WhatsApp/SMS
 * 2. Reintentar buscando en localStorage
 */
const StandaloneRecovery = ({ navigate }: { navigate: NavigateFunction }) => {
  const [linkInput, setLinkInput] = useState("");
  const [retrying, setRetrying] = useState(false);

  const extractTokenFromInput = (input: string): string | null => {
    const trimmed = input.trim();
    // Formato: /t/TOKEN or full URL
    const tMatch = trimmed.match(/\/t\/([a-zA-Z0-9_-]+)/);
    if (tMatch) return tMatch[1];
    // Formato: /seguimiento-aspace/TOKEN
    const segMatch = trimmed.match(/seguimiento-aspace\/([a-zA-Z0-9_-]+)/);
    if (segMatch) return segMatch[1];
    // Si parece un token suelto (alfanumérico)
    if (/^[a-zA-Z0-9_-]{6,}$/.test(trimmed)) return trimmed;
    return null;
  };

  const handleGo = () => {
    const token = extractTokenFromInput(linkInput);
    if (token) {
      try {
        localStorage.setItem("erbi:tracking_token", token);
        localStorage.setItem("erbi:tracking_last_visit", Date.now().toString());
      } catch {}
      navigate(`/seguimiento-aspace/${token}`, { replace: true });
    } else {
      toast.error("No se ha encontrado un código válido en el enlace");
    }
  };

  const handleRetry = () => {
    setRetrying(true);
    try {
      const saved = localStorage.getItem("erbi:tracking_token");
      if (saved) {
        navigate(`/seguimiento-aspace/${saved}`, { replace: true });
        return;
      }
    } catch {}
    setTimeout(() => setRetrying(false), 1000);
    toast.error("No se encontró ningún enlace guardado");
  };

  return (
    <div className="min-h-screen bg-neutral-200 flex flex-col items-center justify-center text-neutral-500 px-6 text-center">
      <div className="text-6xl mb-4">🚐</div>
      <h1 className="text-2xl font-bold mb-2 text-neutral-700">Sin servicio</h1>
      <p className="text-sm mb-8 max-w-xs">
        No se encontró el enlace de seguimiento. Puedes pegar aquí el enlace que te enviaron por WhatsApp:
      </p>
      <div className="w-full max-w-xs space-y-3">
        <Input
          type="text"
          placeholder="Pega aquí tu enlace…"
          value={linkInput}
          onChange={(e) => setLinkInput(e.target.value)}
          className="text-base h-14 bg-white text-neutral-900 border-neutral-300"
          onKeyDown={(e) => e.key === "Enter" && handleGo()}
        />
        <Button onClick={handleGo} disabled={!linkInput.trim()} className="w-full h-14 text-lg font-bold">
          Abrir seguimiento
        </Button>
        <Button variant="ghost" onClick={handleRetry} disabled={retrying} className="w-full gap-2 text-neutral-500">
          <RefreshCw size={16} className={retrying ? "animate-spin" : ""} />
          Reintentar
        </Button>
      </div>
    </div>
  );
};

const ROUTE_LINKS: Record<string, { path: string; label: string; pwaFile?: string }> = {
  ASPACE: { path: "/aspace-individual", label: "ASPACE INTXAURRONDO", pwaFile: "pwa-aspace.html" },
  AMARAEN: { path: "/amaraen", label: "GUREAK, Amaraene", pwaFile: "pwa-amaraen-diario.html" },
  "AMARAEN FINDE": { path: "/amaraen-finde", label: "GUREAK, Amaraene FINDE", pwaFile: "pwa-amaraen.html" },
  BERMINGHAM: { path: "/bermingham", label: "MATIA BERMINGHAM", pwaFile: "pwa-bermingham.html" },
  EGILUZE: { path: "/egiluze", label: "MATIA EGILUZE", pwaFile: "pwa-egiluze.html" },
  EGURTZEGI: { path: "/egurtzegi", label: "MATIA EGURTZEGI", pwaFile: "pwa-egurtzegi.html" },
  FRAISORO: { path: "/fraisoro", label: "MATIA FRAISORO", pwaFile: "pwa-fraisoro.html" },
  FRAISORO2: { path: "/fraisoro-2", label: "MATIA FRAISORO 2", pwaFile: "pwa-fraisoro2.html" },
  IGELDO: { path: "/igeldo", label: "MATIA IGELDO", pwaFile: "pwa-igeldo.html" },
  LAMOROUSE: { path: "/lamorouse", label: "MATIA LAMORUOUSE", pwaFile: "pwa-lamorouse.html" },
  LASARTE: { path: "/lasarte", label: "MATIA LASARTE", pwaFile: "pwa-lasarte.html" },
  MATIA: { path: "/matia", label: "MATIA REZOLA", pwaFile: "pwa-matia.html" },
  ARGIXAO_1: { path: "/argixao", label: "MATIA ARGIXAO BUS 1", pwaFile: "pwa-argixao1.html" },
  ARGIXAO_2: { path: "/argixao-2", label: "MATIA ARGIXAO BUS 2", pwaFile: "pwa-argixao2.html" },
};

/**
 * Genera la URL de instalación para móvil.
 * Usa los archivos PWA dedicados para que el móvil instale el manifest correcto.
 */
const getInstallUrl = (route: (typeof ROUTE_LINKS)[keyof typeof ROUTE_LINKS]): string => {
  const base = getPublicAppBaseUrl();
  if (route.pwaFile) {
    return `${base}/${route.pwaFile}`;
  }
  // Fallback a hash routing si no hay archivo PWA
  return `${base}/#${route.path}?app=true`;
};

/** Contenido principal de la página Index - requiere RouteProvider */
const IndexContent = () => {
  const { user, isLoading, isMatia, isAdmin } = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = !!user || isMatia;
  useActivityLog("Panel principal");
  const routeContext = useRoute();
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPhoneDir, setShowPhoneDir] = useState(false);
  const [shareAppCopied, setShareAppCopied] = useState(false);

  // URL pública limpia de la web (sin Lovable, sin parámetros)
  const publicAppUrl = getPublicAppBaseUrl();

  const handleShareApp = async () => {
    const canNative = typeof navigator !== "undefined" && typeof navigator.share === "function";
    if (canNative) {
      try {
        await navigator.share({
          title: "App de gestión de rutas",
          text: "Accede a la aplicación",
          url: publicAppUrl,
        });
        return;
      } catch {
        // usuario canceló — caer al copiar
      }
    }
    try {
      await navigator.clipboard.writeText(publicAppUrl);
      setShareAppCopied(true);
      toast.success("Enlace copiado al portapapeles");
      setTimeout(() => setShareAppCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const aiSend = (query: string) => {
    window.dispatchEvent(new CustomEvent('erbi:open-with-query', { detail: { query } }));
  };

  type Shortcut = {
    label: string;
    icon: string | React.ReactNode;
    tip: string;
    action: () => void;
  };

  const AI_SHORTCUTS: Shortcut[] = useMemo(() => [
    { label: "Rutas", icon: "🗺️", tip: "Consulta qué rutas están activas hoy", action: () => aiSend("¿Qué rutas están activas hoy?") },
    { label: "Incidencias", icon: "⚠️", tip: "Ver incidencias abiertas o recientes", action: () => aiSend("¿Qué incidencias siguen abiertas?") },
    { label: "Usuarios", icon: "👤", tip: "Abrir panel de gestión de usuarios", action: () => window.dispatchEvent(new CustomEvent('erbi:open-users')) },
    { label: "Resumen", icon: "📋", tip: "Resumen completo del servicio de hoy", action: () => aiSend("Hazme un resumen del servicio de hoy") },
    { label: "Pasajeros", icon: "👥", tip: "Consultar total de pasajeros activos", action: () => aiSend("¿Cuántos pasajeros hay en total?") },
    { label: "Estadísticas", icon: "📊", tip: "Abrir estadísticas de asistencia y puntualidad", action: () => window.dispatchEvent(new CustomEvent('erbi:open-stats')) },
    { label: "Historial", icon: "📅", tip: "Calendario histórico de registros diarios", action: () => window.dispatchEvent(new CustomEvent('erbi:open-calendar')) },
    { label: "Informe", icon: "📄", tip: "Exportar informe mensual en Excel", action: () => window.dispatchEvent(new CustomEvent('erbi:open-excel')) },
    { label: "Avisos", icon: <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 shadow-sm"><Bell size={17} className="text-white" /></span>, tip: "Gestionar avisos y notificaciones de rutas", action: () => window.dispatchEvent(new CustomEvent('erbi:open-avisos')) },
    { label: "Teléfonos", icon: <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 shadow-sm"><Phone size={17} className="text-white" /></span>, tip: "Directorio de teléfonos de conductores y auxiliares", action: () => setShowPhoneDir(true) },
  ], []);

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  CAPA 3: Si estamos en modo standalone SIN auth, comprobar si      ║
  // ║  hay un token de seguimiento guardado en localStorage.             ║
  // ║  Si existe, redirigir allí en vez de a admin-pin.                  ║
  // ║  Esto es el "safety net" para cuando el start_url del manifiesto   ║
  // ║  no funciona correctamente.                                        ║
  // ╚══════════════════════════════════════════════════════════════════════╝
  useEffect(() => {
    // ── CASO PRIORITARIO A: /t/TOKEN en el pathname ──
    // Cuando la PWA abre /t/TOKEN y los scripts pre-React no redirigieron
    // (por ejemplo, si el Service Worker sirvió un index.html cacheado sin
    // el script de redirect), HashRouter ignora el pathname y carga "/".
    // Este check es el SAFETY NET definitivo.
    try {
      const pathMatch = window.location.pathname.match(/^\/t\/(.+)/);
      if (pathMatch && pathMatch[1]) {
        navigate(`/seguimiento-aspace/${pathMatch[1]}`, { replace: true });
        return;
      }
    } catch {
      /* ignore */
    }

    // ── CASO PRIORITARIO B: /seguimiento-aspace/TOKEN en el pathname ──
    try {
      const segMatch = window.location.pathname.match(/^\/seguimiento-aspace\/(.+)/);
      if (segMatch && segMatch[1]) {
        navigate(`/seguimiento-aspace/${segMatch[1]}`, { replace: true });
        return;
      }
    } catch {
      /* ignore */
    }

    // ── CASO PRIORITARIO C: ?t=TOKEN en la URL ──
    try {
      const params = new URLSearchParams(window.location.search);
      const trackingToken = params.get("t");
      if (trackingToken) {
        navigate(`/seguimiento-aspace/${trackingToken}`, { replace: true });
        return;
      }
    } catch {
      /* ignore */
    }

    if (isLoading) return;
    if (isAuthenticated) return; // Autenticado o MATIA → no redirigir

    // ¿Estamos en modo standalone (PWA instalada)?
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;

    if (isStandalone) {
      // Si hay token de seguimiento, redirigir al seguimiento
      try {
        const savedToken = localStorage.getItem("erbi:tracking_token");
        if (savedToken) {
          navigate(`/seguimiento-aspace/${savedToken}`, { replace: true });
          return;
        }
      } catch {
        /* localStorage no disponible */
      }

      // Standalone sin token de seguimiento → ir a admin-pin (admin PWA)
    }

    // Redirigir a admin-pin tanto en navegador como en PWA standalone
    navigate("/admin-pin", { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  // Standalone con token de seguimiento → pantalla de recuperación
  const isStandaloneMode =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <RefreshCw className="animate-spin text-muted-foreground" size={24} />
    </div>
  );

  // Solo mostrar recovery si es standalone Y tiene un token guardado que falló
  // (no bloquear acceso admin)
  if (!isAuthenticated && isStandaloneMode) {
    try {
      const hasTrackingToken = !!localStorage.getItem("erbi:tracking_token");
      if (hasTrackingToken) {
        return <StandaloneRecovery navigate={navigate} />;
      }
    } catch {}
    // Sin token → el useEffect ya redirigió a admin-pin
    return null;
  }

  if (!isAuthenticated) return null;

  // Solo buscar routeLink si hay una ruta seleccionada
  const routeLink = routeContext.currentRoute ? ROUTE_LINKS[routeContext.currentRoute] || null : null;

  // URL para compartir/instalar en móvil (apunta al archivo PWA específico)
  const fullUrl = routeLink ? getInstallUrl(routeLink) : "";

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success("Enlace copiado al portapapeles");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const handleNativeShare = async () => {
    if (!canNativeShare) return;
    try {
      await navigator.share({
        title: `Horarios ${routeLink.label}`,
        text: `Accede a los horarios de ${routeLink.label}`,
        url: fullUrl,
      });
    } catch {
      // User cancelled
    }
  };




  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main>
        <ScheduleView />
      </main>

      {/* NotificationManager montado para que el evento erbi:open-avisos funcione */}
      {(isAdmin || isMatia) && <Suspense fallback={null}><NotificationManager hideTrigger /></Suspense>}

      {/* AI Shortcuts grid — solo admin/matia */}
      {(isAdmin || isMatia) && (
        <section className="w-full px-4 mt-4 mb-20">
          <div className="rounded-2xl border border-border bg-[hsl(270,50%,92%)] p-4">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <span className="text-lg">🐇</span> AI Erbi · Accesos rápidos
            </h3>
            <TooltipProvider delayDuration={300}>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {Array.from({ length: Math.ceil(AI_SHORTCUTS.length / 2) }, (_, pairIdx) => {
                  const pair = AI_SHORTCUTS.slice(pairIdx * 2, pairIdx * 2 + 2);
                  return (
                    <div key={pairIdx} className="flex gap-1.5 bg-white/50 dark:bg-white/5 rounded-2xl p-1.5 shadow-sm border border-white/60 dark:border-white/10">
                      {pair.map((s) => (
                        <Tooltip key={s.label}>
                          <TooltipTrigger asChild>
                            <button
                              className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl hover:bg-white dark:hover:bg-white/20 transition-colors cursor-pointer min-w-0"
                              onClick={s.action}
                            >
                              <span className="text-2xl flex items-center justify-center">
                                {s.icon}
                              </span>
                              <span className="text-[10px] font-medium text-muted-foreground leading-tight text-center truncate w-full px-1">{s.label}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[200px] text-center">
                            <p className="text-xs">{s.tip}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  );
                })}
              </div>
            </TooltipProvider>
            {routeLink && (
              <button
                onClick={() => setShowLinkDialog(true)}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm"
              >
                <ExternalLink size={16} />
                Enviar app de {routeLink.label} al móvil
              </button>
            )}
          </div>
        </section>
      )}

      {/* Footer: enlace de ruta (si hay) + botón minimalista de compartir app general */}
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border mt-8">
        <div className="flex flex-col items-center gap-3">
          {routeLink && (
            <button
              onClick={() => setShowLinkDialog(true)}
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              <ExternalLink size={16} />
              {routeLink.label}
            </button>
          )}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleShareApp}
                  aria-label="Compartir enlace de la aplicación"
                  className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  {shareAppCopied ? <Check size={12} /> : <Share2 size={12} />}
                  <span>Compartir aplicación</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Copiar enlace limpio para enviar a un compañero</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </footer>

      {/* Dialog solo si hay ruta seleccionada */}
      {routeLink && (
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Enlace de {routeLink.label}</DialogTitle>
              <DialogDescription>Copia el enlace para acceder directamente a la app individual</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 mt-4">
              <input readOnly value={fullUrl} className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted" />
              <Button size="icon" onClick={handleCopyLink}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowLinkDialog(false)}>
                Cerrar
              </Button>
              {canNativeShare && (
                <Button className="flex-1" onClick={handleNativeShare}>
                  <ExternalLink size={16} className="mr-2" />
                  Compartir
                </Button>
              )}
              <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button className="w-full">
                  <ExternalLink size={16} className="mr-2" />
                  Abrir App
                </Button>
              </a>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Directorio de teléfonos empresa */}
      <Suspense fallback={null}><CompanyPhoneDirectory open={showPhoneDir} onOpenChange={setShowPhoneDir} /></Suspense>
    </div>
  );
};

const Index = () => {
  return (
    <RouteProvider>
      <IndexContent />
    </RouteProvider>
  );
};

export default Index;
