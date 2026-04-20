import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export type InstallState = 'prompt' | 'installed' | 'unsupported' | 'ios';

export const usePWAInstall = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<InstallState>('unsupported');
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    // Detectar si ya está instalada
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;

    if (isStandalone) {
      setInstallState('installed');
      return;
    }

    if (isIOS) {
      setInstallState('ios');
      return;
    }

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('[PWA] beforeinstallprompt fired ✅', e);
      e.preventDefault();
      setInstallPrompt(e);
      setInstallState('prompt');
    };

    // Log current install state for debugging
    console.log('[PWA] Install hook init — isStandalone:', isStandalone, '| isIOS:', isIOS);

    const handleAppInstalled = () => {
      setInstallState('installed');
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if browser supports installation
    if ('BeforeInstallPromptEvent' in window || 'onbeforeinstallprompt' in window) {
      // Browser might support it, wait for the event
    } else if (!isIOS) {
      setInstallState('unsupported');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return false;

    setIsInstalling(true);
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setInstallState('installed');
        setInstallPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    } finally {
      setIsInstalling(false);
    }
  }, [installPrompt]);

  const canInstall = installState === 'prompt' && installPrompt !== null;
  const isIOS = installState === 'ios';
  const isInstalled = installState === 'installed';

  return {
    install,
    canInstall,
    isIOS,
    isInstalled,
    isInstalling,
    installState,
  };
};
