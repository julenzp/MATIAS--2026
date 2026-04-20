import { useEffect } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Download, 
  Smartphone, 
  CheckCircle2, 
  Share, 
  Plus,
  MoreVertical,
  Wifi,
  WifiOff,
  Zap,
  Shield,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import erbiLogo from "@/assets/erbi-logo-clean.png";

const Install = () => {
  const { install, canInstall, isIOS, isInstalled, isInstalling } = usePWAInstall();

  useEffect(() => {
    console.log("Install page loaded - PWA installation page");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={20} />
              <span>Volver</span>
            </Link>
            <img src={erbiLogo} alt="ERBI" className="h-10" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Instalar ERBI App</h1>
          <p className="text-muted-foreground">
            Instala la aplicación en tu dispositivo para acceso rápido y offline
          </p>
        </div>

        {/* Status Card */}
        {isInstalled ? (
          <Card className="mb-8 border-green-500/50 bg-green-500/10">
            <CardContent className="flex items-center gap-4 py-6">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <div>
                <h3 className="font-semibold text-lg">¡App instalada!</h3>
                <p className="text-muted-foreground">
                  Ya tienes ERBI instalada. Búscala en tu pantalla de inicio.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : canInstall ? (
          <Card className="mb-8 border-primary/50 bg-primary/5">
            <CardContent className="py-6">
              <div className="text-center">
                <h3 className="font-semibold text-lg mb-4">Instalación disponible</h3>
                <Button 
                  size="lg" 
                  onClick={install}
                  disabled={isInstalling}
                  className="gap-2 text-lg px-8 py-6"
                >
                  {isInstalling ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Instalando...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Instalar Ahora
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  Pulsa el botón para añadir ERBI a tu pantalla de inicio
                </p>
              </div>
            </CardContent>
          </Card>
        ) : isIOS ? (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share className="w-5 h-5" />
                Instrucciones para iPhone/iPad
              </CardTitle>
              <CardDescription>
                Sigue estos pasos para instalar la app en tu dispositivo Apple
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  1
                </div>
                <div>
                  <p className="font-medium">Pulsa el botón Compartir</p>
                  <p className="text-sm text-muted-foreground">
                    En Safari, pulsa el icono <Share className="inline w-4 h-4" /> en la barra inferior
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  2
                </div>
                <div>
                  <p className="font-medium">Selecciona "Añadir a pantalla de inicio"</p>
                  <p className="text-sm text-muted-foreground">
                    Busca la opción con el icono <Plus className="inline w-4 h-4" /> y púlsala
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  3
                </div>
                <div>
                  <p className="font-medium">Confirma la instalación</p>
                  <p className="text-sm text-muted-foreground">
                    Pulsa "Añadir" en la esquina superior derecha
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MoreVertical className="w-5 h-5" />
                Instrucciones para Android
              </CardTitle>
              <CardDescription>
                Sigue estos pasos para instalar la app en tu dispositivo Android
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  1
                </div>
                <div>
                  <p className="font-medium">Abre el menú del navegador</p>
                  <p className="text-sm text-muted-foreground">
                    Pulsa los tres puntos <MoreVertical className="inline w-4 h-4" /> en la esquina superior derecha
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  2
                </div>
                <div>
                  <p className="font-medium">Selecciona "Instalar aplicación" o "Añadir a pantalla de inicio"</p>
                  <p className="text-sm text-muted-foreground">
                    El nombre exacto puede variar según el navegador
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  3
                </div>
                <div>
                  <p className="font-medium">Confirma la instalación</p>
                  <p className="text-sm text-muted-foreground">
                    Pulsa "Instalar" en el diálogo que aparece
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <h2 className="text-xl font-semibold mb-4">Ventajas de instalar la app</h2>
        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <Card>
            <CardContent className="flex items-start gap-3 py-4">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Zap className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-medium">Acceso rápido</h3>
                <p className="text-sm text-muted-foreground">
                  Abre la app directamente desde tu pantalla de inicio
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-start gap-3 py-4">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <WifiOff className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-medium">Funciona offline</h3>
                <p className="text-sm text-muted-foreground">
                  Accede a los horarios incluso sin conexión a internet
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-start gap-3 py-4">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Smartphone className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h3 className="font-medium">Experiencia nativa</h3>
                <p className="text-sm text-muted-foreground">
                  Se ve y funciona como una app nativa
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-start gap-3 py-4">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Shield className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="font-medium">Siempre actualizada</h3>
                <p className="text-sm text-muted-foreground">
                  Se actualiza automáticamente con las últimas mejoras
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Offline indicator */}
        <Card className="bg-muted/50">
          <CardContent className="flex items-center justify-center gap-3 py-4">
            <Wifi className="w-5 h-5 text-green-500" />
            <span className="text-sm">
              La app cachea los datos para funcionar sin conexión
            </span>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Install;
