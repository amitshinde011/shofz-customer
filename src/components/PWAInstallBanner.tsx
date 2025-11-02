import { useState } from 'react';
import { X, Share, Compass, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';

export function PWAInstallBanner() {
  const { isInstallable, isIOSSafari, isIOSNonSafari, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(() => 
    localStorage.getItem('pwa-banner-dismissed') === 'true'
  );
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showIOSChromeInstructions, setShowIOSChromeInstructions] = useState(false);

  if (!isInstallable || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-banner-dismissed', 'true');
  };

  const handleCopyURL = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('URL copied to clipboard!', {
        description: 'Now open Safari and paste the URL',
      });
    } catch (error) {
      toast.error('Could not copy automatically', {
        description: 'Please manually copy the URL from your browser',
      });
    }
  };

  const handleInstallClick = () => {
    if (isIOSNonSafari) {
      setShowIOSChromeInstructions(true);
    } else if (isIOSSafari) {
      setShowIOSInstructions(true);
    } else {
      promptInstall();
    }
  };

  return (
    <>
      <div className="fixed bottom-20 left-0 right-0 mx-4 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg z-50 md:bottom-4 md:max-w-md md:mx-auto">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 hover:opacity-80 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="font-semibold mb-2">Install Shofz App</h3>
        <p className="text-sm mb-3 opacity-90">Get quick access and all the features of Shofz on your home screen</p>
        <Button onClick={handleInstallClick} variant="secondary" size="sm">
          Install Now
        </Button>
      </div>

      {/* iOS Safari Instructions Dialog */}
      <Dialog open={showIOSInstructions} onOpenChange={setShowIOSInstructions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install Shofz App</DialogTitle>
            <DialogDescription>
              Follow these steps to install Shofz on your home screen:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <p className="font-medium">Tap the Share button</p>
                <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                  <Share className="w-4 h-4" />
                  <span className="text-sm">Look for the share icon at the bottom of Safari</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <p className="font-medium">Select "Add to Home Screen"</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Scroll down in the menu and tap "Add to Home Screen"
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <p className="font-medium">Tap "Add"</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Confirm to add the Shofz app to your home screen
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* iOS Non-Safari Instructions Dialog */}
      <Dialog open={showIOSChromeInstructions} onOpenChange={setShowIOSChromeInstructions}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Compass className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <DialogTitle>Open in Safari to Install</DialogTitle>
            </div>
            <DialogDescription>
              PWA installation is only supported in Safari on iOS. Follow these steps to install Shofz:
            </DialogDescription>
          </DialogHeader>
          
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <Compass className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle>Why Safari?</AlertTitle>
            <AlertDescription>
              Apple requires PWA installations to go through Safari for security reasons.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                1
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm mb-2">Copy this page's URL</p>
                <Button 
                  onClick={handleCopyURL}
                  variant="outline" 
                  size="sm"
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy URL for Safari
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                2
              </div>
              <div>
                <p className="font-medium text-sm">Open Safari browser</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Look for the blue compass icon on your home screen
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                3
              </div>
              <div>
                <p className="font-medium text-sm">Paste the URL and visit the page</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tap the address bar, paste, and press Go
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                4
              </div>
              <div>
                <p className="font-medium text-sm">Tap the "Install Now" button</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You'll see the same banner in Safari, and it will show installation instructions!
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button 
              onClick={() => setShowIOSChromeInstructions(false)}
              variant="outline"
              className="flex-1"
            >
              Got it
            </Button>
            <Button 
              onClick={handleCopyURL}
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy URL
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
