import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Smartphone, Copy, Check, Share2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import erbiLogo from "@/assets/erbi-logo-clean.png";
import { getPublicAppBaseUrl } from "@/lib/shareUrl";

const ROUTES = [
  { code: "ASPACE", name: "1. ASPACE INTXAURRONDO", path: "/aspace-individual" },
  { code: "AMARAEN", name: "2. GUREAK, Amaraene", path: "/amaraen" },
  { code: "AMARAEN FINDE", name: "3. GUREAK, Amaraene FINDE", path: "/amaraen-finde" },
  { code: "BERMINGHAM", name: "4. MATIA BERMINGHAM", path: "/bermingham" },
  { code: "FRAISORO", name: "5. MATIA FRAISORO", path: "/fraisoro" },
  { code: "FRAISORO_2", name: "6. MATIA FRAISORO 2", path: "/fraisoro" },
  { code: "IGELDO", name: "7. MATIA IGELDO", path: "/igeldo" },
  { code: "LAMOROUSE", name: "8. MATIA LAMOROUSE", path: "/lamorouse" },
  { code: "LASARTE", name: "9. MATIA LASARTE", path: "/lasarte" },
  { code: "MATIA", name: "10. MATIA REZOLA", path: "/matia" },
  { code: "EGURTZEGI", name: "11. MATIA USURBIL", path: "/egurtzegi" },
  { code: "ARGIXAO_1", name: "12. MATIA ARGIXAO BUS 1", path: "/argixao" },
  { code: "ARGIXAO_2", name: "13. MATIA ARGIXAO BUS 2", path: "/argixao-2" },
];

/**
 * Página para compartir el enlace de instalación de una ruta individual.
 * 
 * Uso: /install-route?route=MATIA
 * 
 * Esta página:
 * 1. Genera el enlace correcto para instalar la app en móvil
 * 2. Permite copiar o compartir por WhatsApp
 * 3. El enlace abre la ruta individual que se puede instalar como PWA
 */
const InstallRoute = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const routeCode = searchParams.get("route");
  const [selectedRoute, setSelectedRoute] = useState(
    ROUTES.find((r) => r.code === routeCode) || null
  );
  const [copied, setCopied] = useState(false);

  // Generar la URL de instalación: SIEMPRE usamos una página de entrada dedicada (pwa-*.html)
  // para que el móvil instale el manifest correcto (y no la web general).
  const getInstallUrl = (route: typeof ROUTES[0]) => {
    const base = getPublicAppBaseUrl();
    const PWA_MAP: Record<string, string> = {
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
    return `${base}${PWA_MAP[route.code] || "/pwa-matia.html"}`;
  };

  const installUrl = selectedRoute ? getInstallUrl(selectedRoute) : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(installUrl);
      setCopied(true);
      toast.success("Enlace copiado — pégalo en WhatsApp");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const handleShareWhatsApp = () => {
    const text = `📱 Instala la app de horarios ${selectedRoute?.name}:\n${installUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: `Instalar ${selectedRoute?.name}`,
        text: `Abre este enlace en tu móvil para instalar la app de ${selectedRoute?.name}`,
        url: installUrl,
      });
    } catch {
      // cancelled
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  // Actualizar título
  useEffect(() => {
    if (selectedRoute) {
      document.title = `Compartir ${selectedRoute.name} · ERBI`;
    } else {
      document.title = "Compartir App · ERBI";
    }
    return () => {
      document.title = "ERBI Transporte";
    };
  }, [selectedRoute]);

  // Si no hay ruta seleccionada, mostrar selector
  if (!selectedRoute) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-card px-4 py-4">
          <div className="container mx-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ChevronLeft size={20} />
            </Button>
            <img src={erbiLogo} alt="ERBI" className="h-10" />
            <h1 className="text-lg font-semibold">Compartir App de Ruta</h1>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto space-y-6">
            <div className="text-center space-y-2">
              <Share2 size={48} className="mx-auto text-primary" />
              <h2 className="text-2xl font-bold">Elige una ruta</h2>
              <p className="text-muted-foreground">
                Selecciona la ruta para obtener el enlace de instalación
              </p>
            </div>

            <div className="grid gap-3">
              {ROUTES.map((route) => (
                <Card
                  key={route.code}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => {
                    setSelectedRoute(route);
                    navigate(`/install-route?route=${route.code}`, { replace: true });
                  }}
                >
                  <CardHeader className="py-4">
                    <CardTitle className="text-lg">{route.name}</CardTitle>
                    <CardDescription>{route.code}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Ruta seleccionada: mostrar enlace para compartir
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card px-4 py-4">
        <div className="container mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedRoute(null);
              navigate("/install-route", { replace: true });
            }}
          >
            <ChevronLeft size={20} />
          </Button>
          <img src={erbiLogo} alt="ERBI" className="h-10" />
          <h1 className="text-lg font-semibold">{selectedRoute.name}</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <div className="max-w-sm w-full space-y-6 text-center">
          <div className="space-y-3">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
              <Smartphone size={40} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold">{selectedRoute.name}</h2>
            <p className="text-muted-foreground text-sm">
              Copia el enlace y compártelo. Al abrirlo en el móvil, podrán instalar la app.
            </p>
          </div>

          {/* Campo con el enlace */}
          <div className="bg-muted rounded-lg p-3">
            <input
              readOnly
              value={installUrl}
              className="w-full bg-transparent text-sm text-center text-foreground outline-none"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
          </div>

          {/* Botones de acción */}
          <div className="space-y-3">
            <Button onClick={handleCopy} className="w-full gap-2" size="lg">
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? "¡Copiado!" : "Copiar enlace"}
            </Button>

            <Button onClick={handleShareWhatsApp} variant="secondary" className="w-full gap-2" size="lg">
              <MessageCircle size={18} />
              Enviar por WhatsApp
            </Button>

            {canNativeShare && (
              <Button onClick={handleNativeShare} variant="outline" className="w-full gap-2">
                <Share2 size={18} />
                Compartir...
              </Button>
            )}
          </div>

          <div className="pt-4 text-xs text-muted-foreground space-y-2">
            <p className="font-medium">📱 Instrucciones para quien reciba el enlace:</p>
            <p>1. Abrir el enlace en el móvil (Chrome o Safari)</p>
            <p>2. Pulsar "Instalar" o "Añadir a pantalla de inicio"</p>
            <p>3. La app se instalará con acceso directo a {selectedRoute.name}</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InstallRoute;
