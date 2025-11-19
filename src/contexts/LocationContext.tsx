import React, { createContext, useContext, ReactNode } from 'react';
import { useLocation, UserLocation } from '@/hooks/useLocation';

const DEBUG_LOCATION = import.meta.env.DEV;

interface LocationContextType {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
  requestLocation: (isManualTrigger?: boolean) => Promise<void>;
  clearLocation: () => void;
  openSettings: () => Promise<boolean>;
  isNative: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const locationData = useLocation();

  if (DEBUG_LOCATION) console.log('[LocationProvider] Providing location data - location:', !!locationData.location, 'loading:', locationData.loading);

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
