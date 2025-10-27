import { useState } from 'react';
import { Download, Globe, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';

export function InstallPWAButton() {
  const {
    isInstallable,
    isInstalled,
    isStandalone,
    isIOSNonSafari,
    isIOSSafari,
    promptInstall,
  } = usePWAInstall();

  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Don't show button if already installed or not installable
  if (isInstalled || isStandalone || !isInstallable) {
    return null;
  }

  // Handle iOS non-Safari browsers (Chrome, Firefox, etc.)
  const handleIOSNonSafariClick = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.info('URL copied!', {
        description: 'Open Safari and paste this URL to install the app',
      });
    } catch (error) {
      // Fallback if clipboard API fails
      toast.info('To install:', {
        description: 'Copy this URL, open Safari, and visit it to install the app',
      });
    }
  };

  // Handle iOS Safari
  const handleIOSSafariClick = () => {
    setShowIOSInstructions(true);
  };

  // iOS non-Safari: Show button with Safari/Globe icon
  if (isIOSNonSafari) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleIOSNonSafariClick}
        className="hover:bg-white/10 px-2"
        title="Install App"
      >
        <Globe className="w-5 h-5 text-blue-400" />
        <span className="hidden md:inline ml-2 text-sm">Install App</span>
      </Button>
    );
  }

  // iOS Safari: Show button with download icon and instructions dialog
  if (isIOSSafari) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleIOSSafariClick}
          className="hover:bg-white/10 px-2"
          title="Install App"
        >
          <Download className="w-5 h-5" />
          <span className="hidden md:inline ml-2 text-sm">Install App</span>
        </Button>

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
      </>
    );
  }

  // Chrome/Edge on Android/Desktop: Show normal install button
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={promptInstall}
      className="hover:bg-white/10 px-2"
      title="Install App"
    >
      <Download className="w-5 h-5" />
      <span className="hidden md:inline ml-2 text-sm">Install App</span>
    </Button>
  );
}
