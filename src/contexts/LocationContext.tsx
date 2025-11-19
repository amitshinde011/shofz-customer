import React, { createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { useLocation, UserLocation } from '@/hooks/useLocation';
import { useQueryClient } from '@tanstack/react-query';

interface LocationContextType {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => Promise<void>;
  openSettings: () => Promise<boolean>;
  isNative: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const locationData = useLocation();
  const queryClient = useQueryClient();
  const prevLocationRef = useRef<UserLocation | null>(null);

  console.log('[LocationProvider] Providing location data - location:', !!locationData.location, 'loading:', locationData.loading);

  // ✅ FIX CRITICAL #1: Invalidate queries when location changes
  useEffect(() => {
    const currentLocation = locationData.location;
    const prevLocation = prevLocationRef.current;

    // Check if location actually changed (not just reference)
    if (currentLocation && prevLocation) {
      const latDiff = Math.abs(currentLocation.lat - prevLocation.lat);
      const lngDiff = Math.abs(currentLocation.lng - prevLocation.lng);
      const significantChange = latDiff > 0.001 || lngDiff > 0.001; // ~100m

      if (significantChange) {
        console.log('[LocationProvider] Location changed significantly, invalidating queries');

        // Invalidate all location-dependent queries
        queryClient.invalidateQueries({ queryKey: ['shops'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['offers'] });
        queryClient.invalidateQueries({ queryKey: ['featured-shops'] });
        queryClient.invalidateQueries({ queryKey: ['featured-products'] });
        queryClient.invalidateQueries({ queryKey: ['featured-offers'] });
      }
    }

    // Update ref for next comparison
    prevLocationRef.current = currentLocation;
  }, [locationData.location, queryClient]);

  return (
    <LocationContext.Provider value={locationData}>
      {children}
    </LocationContext.Provider>
  );
}

export function useUserLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useUserLocation must be used within a LocationProvider');
  }
  return context;
}
