import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

const DEBUG_LOCATION = import.meta.env.DEV;

export interface UserLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

// Helper function to open device location settings
const openDeviceSettings = async (): Promise<boolean> => {
  const platform = Capacitor.getPlatform();
  
  if (platform === 'ios') {
    try {
      // On iOS, we can try to open app settings
      window.location.href = 'app-settings:';
      return true;
    } catch (error) {
      if (DEBUG_LOCATION) console.error('[useLocation] Failed to open iOS settings:', error);
      return false;
    }
  } else if (platform === 'android') {
    try {
      // On Android, try to open app settings
      window.location.href = 'app-settings:';
      return true;
    } catch (error) {
      if (DEBUG_LOCATION) console.error('[useLocation] Failed to open Android settings:', error);
      return false;
    }
  }
  
  // On web, we can't open system settings
  return false;
};

export function useLocation() {
  const STORAGE_KEYS = {
    LOCATION: 'shofz_user_location',
    PERMISSION_GRANTED: 'shofz_location_permission_granted',
  };

  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const getLocationInternal = async (isManualTrigger: boolean = false): Promise<void> => {
    if (DEBUG_LOCATION) console.log('[useLocation] Starting location request, manual:', isManualTrigger);

    // Check if offline
    if (!navigator.onLine) {
      const offlineError = 'You appear to be offline. Please check your internet connection, or continue without location.';
      setError(offlineError);
      setLoading(false);
      throw new Error(offlineError);
    }

    // Check retry limit (unless manually triggered)
    if (!isManualTrigger && retryCount >= 3) {
      const retryError = 'Location request failed multiple times. You can continue without location.';
      setError(retryError);
      setLoading(false);
      throw new Error(retryError);
    }

    setLoading(true);
    setError(null);

    try {
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        // Use Capacitor Geolocation on native platforms
        if (DEBUG_LOCATION) console.log('[useLocation] Using Capacitor Geolocation (Native)');

        const permissionStatus = await Geolocation.checkPermissions();
        if (DEBUG_LOCATION) console.log('[useLocation] Permission status:', permissionStatus.location);

        if (permissionStatus.location === 'denied') {
          throw new Error('PERMISSION_DENIED');
        }

        if (permissionStatus.location === 'prompt' || permissionStatus.location === 'prompt-with-rationale') {
          if (DEBUG_LOCATION) console.log('[useLocation] Requesting permissions...');
          const requested = await Geolocation.requestPermissions();
          if (DEBUG_LOCATION) console.log('[useLocation] Permission request result:', requested.location);

          if (requested.location === 'denied') {
            throw new Error('PERMISSION_DENIED');
          }
        }

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        });

        const newLocation: UserLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now(),
        };

        setLocation(newLocation);
        setError(null);
        setRetryCount(0);

        try {
          localStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(newLocation));
          localStorage.setItem(STORAGE_KEYS.PERMISSION_GRANTED, 'true');
        } catch (storageError) {
          if (DEBUG_LOCATION) console.error('[useLocation] Failed to save location to localStorage:', storageError);
          // Location still works, just won't persist
        }

        setLoading(false);
      } else {
        // Use browser Geolocation API on web
        if (DEBUG_LOCATION) console.log('[useLocation] Using browser Geolocation API');
        if (!navigator.geolocation) {
          throw new Error('UNSUPPORTED');
        }

        // Check permission state on web (if supported)
        if ('permissions' in navigator) {
          try {
            const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
            if (DEBUG_LOCATION) console.log('[useLocation] Web permission state:', permissionStatus.state);
            
            if (permissionStatus.state === 'denied') {
              throw new Error('PERMISSION_DENIED');
            }
          } catch (e) {
            if (DEBUG_LOCATION) console.log('[useLocation] Permissions API not supported or failed:', e);
          }
        }

        // Wrap getCurrentPosition in Promise to properly await
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const newLocation: UserLocation = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                timestamp: Date.now(),
              };

              setLocation(newLocation);
              setError(null);
              setRetryCount(0);

              try {
                localStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(newLocation));
                localStorage.setItem(STORAGE_KEYS.PERMISSION_GRANTED, 'true');
              } catch (storageError) {
                if (DEBUG_LOCATION) console.error('[useLocation] Failed to save location to localStorage:', storageError);
                // Location still works, just won't persist
              }
              
              resolve();
            },
            (error) => {
              let errorMsg = 'Failed to get your location. You can continue without location.';
              switch (error.code) {
                case error.PERMISSION_DENIED:
                  errorMsg = 'Location permission denied. Please enable location access in your browser settings, or continue without location.';
                  reject(new Error('PERMISSION_DENIED'));
                  return;
                case error.POSITION_UNAVAILABLE:
                  errorMsg = 'Location information unavailable. Please check your device settings, or continue without location.';
                  reject(new Error('POSITION_UNAVAILABLE'));
                  return;
                case error.TIMEOUT:
                  errorMsg = 'Location request timed out. You can continue without location.';
                  reject(new Error('LOCATION_TIMEOUT'));
                  return;
              }
              reject(new Error(errorMsg));
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000, // Allow 1-minute-old cached position for faster load
            }
          );
        });

        setLoading(false);
      }

      if (DEBUG_LOCATION) console.log('[useLocation] Location retrieved successfully');
    } catch (error: any) {
      if (DEBUG_LOCATION) console.error('[useLocation] Error getting location:', error);

      let errorMessage = 'Failed to get your location. You can continue without location.';

      if (error.message === 'PERMISSION_DENIED' || error.code === 'PERMISSION_DENIED') {
        errorMessage = 'Location permission denied. Please enable location access in your device settings, or continue without location.';
      } else if (error.message === 'POSITION_UNAVAILABLE') {
        errorMessage = 'Location information unavailable. Please check your device settings, or continue without location.';
      } else if (error.message === 'LOCATION_TIMEOUT') {
        errorMessage = 'Location request timed out. You can continue without location.';
      } else if (error.message === 'UNSUPPORTED') {
        errorMessage = 'Location services are not supported on this device. You can continue without location.';
      } else if (error.message?.includes('continue without location')) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      setRetryCount(prev => prev + 1);
      setLoading(false);
      throw error;
    }
  };

  const requestLocation = async (isManualTrigger: boolean = false): Promise<void> => {
    if (DEBUG_LOCATION) console.log('[useLocation] Request location called, manual:', isManualTrigger);

    // Reset retry counter on manual trigger
    if (isManualTrigger) {
      setRetryCount(0);
    }

    // Check if offline
    if (!navigator.onLine) {
      const offlineError = 'You appear to be offline. Please check your internet connection, or continue without location.';
      setError(offlineError);
      setLoading(false);
      return;
    }

    try {
      await getLocationInternal(isManualTrigger);
    } catch (error) {
      if (DEBUG_LOCATION) console.error('[useLocation] Request location failed:', error);
      // Error already set by getLocationInternal
    }
  };

  // Load cached location on mount (no auto-request)
  useEffect(() => {
    const loadCachedLocation = () => {
      if (DEBUG_LOCATION) console.log('[useLocation] Checking for cached location...');

      try {
        const cachedLocation = localStorage.getItem(STORAGE_KEYS.LOCATION);
        if (cachedLocation) {
          const parsed = JSON.parse(cachedLocation);
          const age = Date.now() - parsed.timestamp;

          // Use cached location if less than 5 minutes old
          if (age < 5 * 60 * 1000) { // 5 minutes for hyperlocal accuracy
            if (DEBUG_LOCATION) console.log('[useLocation] Using cached location (age:', age, 'ms)');
            setLocation(parsed);
            setLoading(false);
            return;
          } else {
            if (DEBUG_LOCATION) console.log('[useLocation] Cached location too old (age:', age, 'ms)');
          }
        }
      } catch (error) {
        if (DEBUG_LOCATION) console.error('[useLocation] Failed to load cached location:', error);
      }

      // No valid cache, just set loading to false
      // Don't auto-request - wait for user gesture
      setLoading(false);
    };

    loadCachedLocation();
  }, []);

  // Monitor permission state changes (web only)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (!('permissions' in navigator)) return;

    let permissionStatus: PermissionStatus;

    const setupListener = async () => {
      try {
        permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        
        const handlePermissionChange = () => {
          if (DEBUG_LOCATION) console.log('[useLocation] Permission state changed:', permissionStatus.state);
          
          if (permissionStatus.state === 'denied') {
            setLocation(null);
            setError('Location permission was revoked. Please enable location access in your browser settings, or continue without location.');
            localStorage.removeItem(STORAGE_KEYS.LOCATION);
            localStorage.removeItem(STORAGE_KEYS.PERMISSION_GRANTED);
          }
        };

        permissionStatus.addEventListener('change', handlePermissionChange);
        
        return () => {
          permissionStatus.removeEventListener('change', handlePermissionChange);
        };
      } catch (error) {
        if (DEBUG_LOCATION) console.error('[useLocation] Failed to setup permission listener:', error);
      }
    };

    setupListener();
  }, []);

  // Refresh location when app returns to foreground
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && location) {
        const age = Date.now() - location.timestamp;
        // Refresh if location is older than 5 minutes
        if (age > 5 * 60 * 1000) {
          if (DEBUG_LOCATION) console.log('[useLocation] App returned to foreground, refreshing stale location');
          requestLocation(false); // Background refresh, don't reset retry counter
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [location]);

  // Set up continuous location watching
  useEffect(() => {
    // Only start watching if we have an initial location
    if (!location) {
      if (DEBUG_LOCATION) console.log('[useLocation] Skipping watch - no initial location yet');
      return;
    }

    const isNative = Capacitor.isNativePlatform();
    let watchId: string | number | undefined;

    const startWatching = async () => {
      try {
        if (isNative) {
          // Use Capacitor's watch position on native
          if (DEBUG_LOCATION) console.log('[useLocation] Starting Capacitor watch position');
          
          watchId = await Geolocation.watchPosition(
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0, // Always get fresh location for watch
            },
            (position, err) => {
              if (err) {
                if (DEBUG_LOCATION) console.error('[useLocation] Watch position error:', err);
                return;
              }

              if (position) {
                const newLocation: UserLocation = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  timestamp: Date.now(),
                };

                // Only update if location changed significantly (>50 meters)
                if (location) {
                  const distance = calculateDistance(
                    location.lat,
                    location.lng,
                    newLocation.lat,
                    newLocation.lng
                  );

                  if (distance > 0.05) {
                    if (DEBUG_LOCATION) console.log('[useLocation] Location changed significantly:', distance, 'km');
                    setLocation(newLocation);
                    try {
                      localStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(newLocation));
                    } catch (storageError) {
                      if (DEBUG_LOCATION) console.error('[useLocation] Failed to save location update:', storageError);
                    }
                  }
                }
              }
            }
          );
        } else {
          // Use browser's watch position on web
          if (DEBUG_LOCATION) console.log('[useLocation] Starting browser watch position');
          
          watchId = navigator.geolocation.watchPosition(
            (position) => {
              const newLocation: UserLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                timestamp: Date.now(),
              };

              // Only update if location changed significantly (>50 meters)
              if (location) {
                const distance = calculateDistance(
                  location.lat,
                  location.lng,
                  newLocation.lat,
                  newLocation.lng
                );

                if (distance > 0.05) {
                  if (DEBUG_LOCATION) console.log('[useLocation] Location changed significantly:', distance, 'km');
                  setLocation(newLocation);
                  try {
                    localStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(newLocation));
                  } catch (storageError) {
                    if (DEBUG_LOCATION) console.error('[useLocation] Failed to save location update:', storageError);
                  }
                }
              }
            },
            (error) => {
              if (DEBUG_LOCATION) console.error('[useLocation] Watch position error:', error);
            },
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0, // Always get fresh location for watch
            }
          );
        }

        if (DEBUG_LOCATION) console.log('[useLocation] Watch started with ID:', watchId);
      } catch (error) {
        if (DEBUG_LOCATION) console.error('[useLocation] Failed to start watching position:', error);
      }
    };

    startWatching();

    return () => {
      if (watchId !== undefined) {
        if (DEBUG_LOCATION) console.log('[useLocation] Clearing watch with ID:', watchId);
        
        if (isNative) {
          Geolocation.clearWatch({ id: watchId as string });
        } else {
          navigator.geolocation.clearWatch(watchId as number);
        }
      }
    };
  }, [location]); // Add location dependency

  return {
    location,
    loading,
    error,
    requestLocation,
    openSettings: openDeviceSettings,
    isNative: Capacitor.isNativePlatform(),
  };
}

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
