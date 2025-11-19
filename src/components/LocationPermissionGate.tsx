import React, { ReactNode } from 'react';
import { MapPin, Navigation, Store, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserLocation } from '@/contexts/LocationContext';

interface LocationPermissionGateProps {
  children: ReactNode;
}

export function LocationPermissionGate({ children }: LocationPermissionGateProps) {
  const { location, loading, error, requestLocation, openSettings, isNative } = useUserLocation();
  const [skipLocation, setSkipLocation] = React.useState(false);
  const [failedAttempts, setFailedAttempts] = React.useState(0);

  // Check if user previously chose to skip
  React.useEffect(() => {
    const skipFlag = localStorage.getItem('skip_location_permission');
    if (skipFlag === 'true') {
      setSkipLocation(true);
    }
  }, []);

  // Track failed attempts
  React.useEffect(() => {
    if (error) {
      setFailedAttempts(prev => prev + 1);
    }
  }, [error]);

  // Auto-bypass gate if loading too long
  React.useEffect(() => {
    if (!loading) return;
    
    const timer = setTimeout(() => {
      console.warn('[LocationGate] Loading timeout, bypassing gate');
      setSkipLocation(true);
    }, 20000);
    
    return () => clearTimeout(timer);
  }, [loading]);

  // Allow bypass if:
  // 1. User explicitly skipped
  // 2. Too many failed attempts
  // 3. Error message indicates user can continue
  // 4. Permission was previously granted (cached location)
  const permissionGranted = localStorage.getItem('location_permission_granted') === 'true';
  const canContinue = error?.includes('continue without location');
  
  if (location || skipLocation || failedAttempts >= 3 || canContinue || (permissionGranted && !error)) {
    return <>{children}</>;
  }

  // Show loading state while requesting location
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="relative">
            <MapPin className="w-16 h-16 mx-auto text-primary animate-pulse" />
            <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse rounded-full" />
          </div>
          <p className="text-lg text-foreground font-medium">Getting your location...</p>
        </div>
      </div>
    );
  }

  // Show permission request UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Icon with animation */}
        <div className="relative">
          <MapPin className="w-20 h-20 mx-auto text-primary animate-bounce" />
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            Discover Local Treasures
          </h1>
          <p className="text-muted-foreground text-lg">
            We need your location to show you amazing shops, products, and offers nearby
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-4 text-left bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50">
          <div className="flex items-start gap-3">
            <Store className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground">Find Local Shops</h3>
              <p className="text-sm text-muted-foreground">Browse stores right around you</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Navigation className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground">Discover Nearby Products</h3>
              <p className="text-sm text-muted-foreground">See what's available close to you</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground">Get Exclusive Offers</h3>
              <p className="text-sm text-muted-foreground">Find deals from shops near you</p>
            </div>
          </div>
        </div>

        {/* Error message if permission was denied */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <p className="text-sm text-destructive font-medium">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          <Button 
            onClick={requestLocation}
            size="lg"
            className="w-full text-base font-semibold h-12 shadow-lg hover:shadow-xl transition-shadow"
            disabled={loading}
          >
            <MapPin className="w-5 h-5 mr-2" />
            {loading ? 'Getting Location...' : 'Enable Location Access'}
          </Button>

          {error && isNative && (
            <Button 
              onClick={openSettings}
              variant="outline"
              size="lg"
              className="w-full text-base font-semibold h-12"
            >
              <Settings className="w-5 h-5 mr-2" />
              Open Settings
            </Button>
          )}

          <Button 
            onClick={() => {
              localStorage.setItem('skip_location_permission', 'true');
              setSkipLocation(true);
            }}
            variant="ghost"
            size="lg"
            className="w-full text-base font-semibold h-12"
          >
            Continue without location
          </Button>
        </div>

        {/* Help text */}
        <p className="text-xs text-muted-foreground">
          {isNative 
            ? "Your location is only used to show nearby content and is never shared with anyone."
            : "Enable location in your browser settings to continue. Your location is only used to show nearby content."
          }
        </p>
      </div>
    </div>
  );
}
