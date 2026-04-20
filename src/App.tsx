import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { AuthProvider } from "@/hooks/useAuth";
import { ScheduleProvider } from "@/context/ScheduleContext";
import { RouteProvider } from "@/context/RouteContext";
import { PwaUpdater } from "@/components/PwaUpdater";
import { InstallPromptBanner } from "@/components/InstallPromptBanner";
import { ClientSideRedirect } from "@/components/ClientSideRedirect";
import { lazy, Suspense, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import Index from "./pages/Index";
import AdminPin from "./pages/AdminPin";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// Lazy load route pages that are not immediately needed
const Aspace = lazy(() => import("./pages/Aspace"));
const AspaceIndividual = lazy(() => import("./pages/AspaceIndividual"));
const Amaraen = lazy(() => import("./pages/Amaraen"));
const AmaraenFinde = lazy(() => import("./pages/AmaraenFinde"));
const Matia = lazy(() => import("./pages/Matia"));
const Egurtzegi = lazy(() => import("./pages/Egurtzegi"));
const Bermingham = lazy(() => import("./pages/Bermingham"));
const Lasarte = lazy(() => import("./pages/Lasarte"));
const Lamorouse = lazy(() => import("./pages/Lamorouse"));
const Igeldo = lazy(() => import("./pages/Igeldo"));
const Fraisoro = lazy(() => import("./pages/Fraisoro"));
const Fraisoro2 = lazy(() => import("./pages/Fraisoro2"));
const Egiluze = lazy(() => import("./pages/Egiluze"));
const Argixao = lazy(() => import("./pages/Argixao"));
const Argixao2 = lazy(() => import("./pages/Argixao2"));
const Install = lazy(() => import("./pages/Install"));
const InstallRoute = lazy(() => import("./pages/InstallRoute"));
const SeguimientoAspace = lazy(() => import("./pages/SeguimientoAspace"));
const DemoSeguimiento = lazy(() => import("./pages/DemoSeguimiento"));
const OperativeAssistantPage = lazy(() => import("./pages/OperativeAssistant"));
const DashboardOperativo = lazy(() => import("./pages/DashboardOperativo"));
const DashboardInteligente = lazy(() => import("./pages/DashboardInteligente"));
const Modificaciones = lazy(() => import("./pages/Modificaciones"));

import { AiAuditDot } from "@/components/AiAuditDot";

// App initialization
const queryClient = new QueryClient();

/**
 * Detecta si estamos en un contexto donde HashRouter es necesario:
 * - Plataformas nativas (Capacitor)
 * - PWA instalada (standalone mode)
 * - URLs compartidas con hash (/#/ruta) abiertas en navegador normal
 *
 * Esto asegura que los deep links funcionen correctamente en todos los casos.
 */
const shouldUseHashRouter = (): boolean => {
  // Siempre usar HashRouter en apps nativas
  if (Capacitor.isNativePlatform()) {
    return true;
  }

  if (typeof window !== "undefined") {
    // Si la URL ya trae un hash tipo #/ruta (por ejemplo enlaces compartidos),
    // necesitamos HashRouter aunque estemos en navegador normal.
    if (window.location.hash.startsWith("#/") || window.location.hash.startsWith("#/")) {
      return true;
    }

    // En PWA instalada (standalone), HashRouter evita problemas de 404
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return true;
    }
  }

  return false;
};

const Router = shouldUseHashRouter() ? HashRouter : BrowserRouter;

const LazyFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <RefreshCw className="animate-spin text-muted-foreground" size={24} />
  </div>
);

/**
 * Recuperación de scroll bloqueado.
 * Radix UI (Dialog/Sheet) pone overflow:hidden en body y a veces no lo limpia.
 * Este hook detecta y corrige la situación cada 3 segundos.
 */
const useScrollLockRecovery = () => {
  useEffect(() => {
    const interval = setInterval(() => {
      const body = document.body;
      const hasOverflowHidden = body.style.overflow === 'hidden' || 
        getComputedStyle(body).overflow === 'hidden';
      
      if (!hasOverflowHidden) return;
      
      // Check if any Radix dialog/sheet is actually open
      const openOverlay = document.querySelector(
        '[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"]'
      );
      
      if (!openOverlay) {
        // No dialog open but body scroll is locked — unlock it
        body.style.overflow = '';
        body.style.paddingRight = '';
        body.style.marginRight = '';
        // Also remove Radix scroll lock attribute
        body.removeAttribute('data-scroll-locked');
        console.warn('[ScrollRecovery] Cleared stuck scroll lock');
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
};

const AppContent = () => {
  useScrollLockRecovery();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ScheduleProvider>
          <RouteProvider>
            <AppContent />
            <Toaster />
            <Sonner />
            <PwaUpdater />
            <Router>
              <ClientSideRedirect />
              <Suspense fallback={<LazyFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/admin-pin" element={<AdminPin />} />
                  <Route path="/aspace" element={<Aspace />} />
                  <Route path="/aspace-individual" element={<AspaceIndividual />} />
                  <Route path="/matia" element={<Matia />} />
                  <Route path="/amaraen" element={<Amaraen />} />
                  <Route path="/amaraen-finde" element={<AmaraenFinde />} />
                  <Route path="/egurtzegi" element={<Egurtzegi />} />
                  <Route path="/bermingham" element={<Bermingham />} />
                  <Route path="/lasarte" element={<Lasarte />} />
                  <Route path="/lamorouse" element={<Lamorouse />} />
                  <Route path="/igeldo" element={<Igeldo />} />
                  <Route path="/fraisoro" element={<Fraisoro />} />
                  <Route path="/fraisoro-2" element={<Fraisoro2 />} />
                  <Route path="/egiluze" element={<Egiluze />} />
                  <Route path="/argixao" element={<Argixao />} />
                  <Route path="/argixao-2" element={<Argixao2 />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/install-route" element={<InstallRoute />} />
                  <Route path="/seguimiento-aspace/:token" element={<SeguimientoAspace />} />
                  <Route path="/t/:token" element={<SeguimientoAspace />} />
                  <Route path="/demo-seguimiento" element={<DemoSeguimiento />} />
                  <Route path="/asistente-operativo" element={<OperativeAssistantPage />} />
                  <Route path="/dashboard-operativo" element={<DashboardOperativo />} />
                  <Route path="/dashboard-inteligente" element={<DashboardInteligente />} />
                  <Route path="/modificaciones" element={<Modificaciones />} />
                  
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <InstallPromptBanner />
              <AiAuditDot />
            </Router>
          </RouteProvider>
        </ScheduleProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

