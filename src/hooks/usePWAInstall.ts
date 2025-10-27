import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallHook {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  isIOSNonSafari: boolean;
  isIOSSafari: boolean;
  promptInstall: () => void;
}

export function usePWAInstall(): PWAInstallHook {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  
  // Detect Safari on iOS
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  // Detect if running in standalone mode (already installed)
  const isStandalone = 
    ('standalone' in window.navigator && (window.navigator as any).standalone) ||
    window.matchMedia('(display-mode: standalone)').matches;

  // iOS-specific detection
  const isIOSNonSafari = isIOS && !isSafari; // iOS Chrome, Firefox, etc.
  const isIOSSafari = isIOS && isSafari;

  useEffect(() => {
    // Don't show install button if already installed
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // For iOS, always show the button (we'll handle it differently)
    if (isIOS) {
      setIsInstallable(true);
      return;
    }

    // Listen for the beforeinstallprompt event (Chrome/Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
      console.log('PWA: App is installable');
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      console.log('PWA: App was installed');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isStandalone, isIOS]);

  const promptInstall = async () => {
    if (!deferredPrompt) {
      console.log('PWA: No deferred prompt available');
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA: User ${outcome} the install prompt`);

    // Clear the deferred prompt
    setDeferredPrompt(null);

    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
  };

  return {
    isInstallable,
    isInstalled,
    isStandalone,
    isIOS,
    isIOSNonSafari,
    isIOSSafari,
    promptInstall,
  };
}
