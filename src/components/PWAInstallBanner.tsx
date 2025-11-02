import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useState } from 'react';

export function PWAInstallBanner() {
  const { isInstallable, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(() => 
    localStorage.getItem('pwa-banner-dismissed') === 'true'
  );

  if (!isInstallable || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-banner-dismissed', 'true');
  };

  return (
    <div className="fixed bottom-20 left-0 right-0 mx-4 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg z-50 md:bottom-4 md:max-w-md md:mx-auto">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 hover:opacity-80 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
      <h3 className="font-semibold mb-2">Install Shofz App</h3>
      <p className="text-sm mb-3 opacity-90">Get quick access and offline features</p>
      <Button onClick={promptInstall} variant="secondary" size="sm">
        Install Now
      </Button>
    </div>
  );
}
