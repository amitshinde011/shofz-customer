import React, { ReactNode } from 'react';
import { useUserLocation } from '@/contexts/LocationContext';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DEBUG_LOCATION = import.meta.env.DEV;

const STORAGE_KEYS = {
  SKIP: 'shofz_skip_location_permission',
  PERMISSION_GRANTED: 'shofz_location_permission_granted',
};

interface LocationPermissionGateProps {
  children: ReactNode;
}

export function LocationPermissionGate({ children }: LocationPermissionGateProps) {
  const { location, loading, error, requestLocation, openSettings, isNative } = useUserLocation();
  const [skipLocation, setSkipLocation] = React.useState(false);
  const [gateTimeout, setGateTimeout] = React.useState(false);

  // Check if user previously skipped location permission
  React.useEffect(() => {
    const skipFlag = localStorage.getItem(STORAGE_KEYS.SKIP);
    if (skipFlag === 'true') {
      setSkipLocation(true);
    }
  }, []);

  // Auto-bypass after 15 seconds if still loading (network issue, slow GPS, etc.)
  React.useEffect(() => {
    if (!loading) return;
    
    const timer = setTimeout(() => {
      if (DEBUG_LOCATION) console.warn('[LocationGate] Loading timeout reached, allowing bypass');
      setGateTimeout(true);
    }, 15000);
    
    return () => clearTimeout(timer);
  }, [loading]);

  // Check if we have permission cached
  const permissionGranted = localStorage.getItem(STORAGE_KEYS.PERMISSION_GRANTED) === 'true';

  // Determine if user can continue without location
  const canContinue = error?.toLowerCase().includes('continue without location');

  if (DEBUG_LOCATION) console.log('[LocationGate] State - location:', !!location, 'loading:', loading, 'skipLocation:', skipLocation, 'canContinue:', canContinue, 'gateTimeout:', gateTimeout);

  // Allow bypass if:
  // 1. Location is already retrieved
  // 2. User previously skipped
  // 3. Error message allows bypass
  // 4. Permission was previously granted (even if current request failed)
  // 5. Gate timeout reached (15s)
  if (location || skipLocation || canContinue || (permissionGranted && !error) || gateTimeout) {
    return <>{children}</>;
  }

  // Show loading state while checking location
  if (loading && !gateTimeout) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <MapPin className="h-16 w-16 text-primary animate-pulse" />
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
          </div>
          <p className="text-lg font-medium text-foreground">Getting your location...</p>
          <p className="text-sm text-muted-foreground max-w-xs text-center">
            This helps us show you nearby shops and deals
          </p>
          {gateTimeout && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.setItem(STORAGE_KEYS.SKIP, 'true');
                setSkipLocation(true);
              }}
              className="mt-4"
            >
              Continue without location
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Show permission request UI
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 overflow-y-auto">
      <div className="w-full max-w-md space-y-6 py-8">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse" />
            <div className="relative rounded-full bg-primary/10 p-8 backdrop-blur-sm">
              <Navigation className="h-16 w-16 text-primary animate-bounce" />
            </div>
          </div>
        </div>

        <div className="space-y-3 text-center">
          <h2 className="text-3xl font-bold text-foreground">
            Enable Location Access
          </h2>
          <p className="text-muted-foreground text-lg">
            Discover local shops and exclusive deals near you
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-3 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 p-6">
          <h3 className="font-semibold text-foreground">With location, you get:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>Shops sorted by distance from you</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>Exclusive offers in your neighborhood</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>Filter shops by delivery availability</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>Accurate delivery charge calculations</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => requestLocation(true)}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            <MapPin className="mr-2 h-5 w-5" />
            Enable Location Access
          </Button>

          {isNative && error && (
            <Button
              onClick={openSettings}
              variant="outline"
              className="w-full h-12 text-base"
              size="lg"
            >
              Open Settings
            </Button>
          )}

          <Button
            onClick={() => {
              setSkipLocation(true);
              localStorage.setItem(STORAGE_KEYS.SKIP, 'true');
            }}
            variant="ghost"
            className="w-full h-12 text-base"
            size="lg"
          >
            Continue without location
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          We only use your location to show you nearby shops. Your location is never stored on our servers or shared with third parties.
        </p>
      </div>
    </div>
  );
}
