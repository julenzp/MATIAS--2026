import { useState, useEffect } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

export const InstallPromptBanner = () => {
  const { canInstall, isInstalled, install, isIOS } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the banner before
    const wasDismissed = localStorage.getItem('pwa-banner-dismissed');
    const dismissedAt = wasDismissed ? parseInt(wasDismissed, 10) : 0;
    const daysSinceDismissed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    
    // Show banner again after 7 days
    if (daysSinceDismissed > 7) {
      setDismissed(false);
    } else if (wasDismissed) {
      setDismissed(true);
    }

    // Delay showing the banner
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      handleDismiss();
    }
  };

  // Don't show if already installed or dismissed
  if (isInstalled || dismissed || !showBanner) return null;

  // Show different content based on whether native install is available
  if (canInstall) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-r from-primary to-secondary text-primary-foreground animate-fade-in">
        <div className="container mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">Instalar ERBI App</p>
                <p className="text-sm opacity-90">Acceso rápido y offline</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={handleInstall}
                className="whitespace-nowrap"
              >
                Instalar
              </Button>
              <button 
                onClick={handleDismiss}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show instructions link for iOS or unsupported browsers
  if (isIOS || !canInstall) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-card border-t border-border animate-fade-in">
        <div className="container mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">¿Instalar como app?</p>
                <p className="text-xs text-muted-foreground">Funciona offline</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/install">
                <Button variant="outline" size="sm">
                  Ver cómo
                </Button>
              </Link>
              <button 
                onClick={handleDismiss}
                className="p-2 hover:bg-muted rounded-full transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
