import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Geolocation } from '@capacitor/geolocation';

export interface UserLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

// Safe localStorage wrapper
const safeLocalStorage = {
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('[useLocation] localStorage.setItem failed:', e);
    }
  },
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('[useLocation] localStorage.getItem failed:', e);
      return null;
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('[useLocation] localStorage.removeItem failed:', e);
    }
  }
};

// Helper to open device settings
const openDeviceSettings = async () => {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      const platform = Capacitor.getPlatform();

      if (platform === 'ios') {
        // iOS: Open Settings app to this app's page
        await (App as any).openUrl({ url: 'app-settings:root=Privacy&path=LOCATION' });
      } else if (platform === 'android') {
        // Android: Open app settings
        await (App as any).openUrl({ url: 'app-settings:' });
      }
      return true;
    } catch (error) {
      console.error('[useLocation] Failed to open device settings:', error);
      return false;
    }
  } else {
    // On web, cannot open system settings
    return false;
  }
};

export function useLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  const watchIdRef = useRef<string | number | undefined>();
  const isMountedRef = useRef(true);
  const isRequestingRef = useRef(false);
  const lastRequestTimeRef = useRef(0); // ✅ FIX CRITICAL #4: Track last request time

  const MAX_ATTEMPTS = 3;
  const LOCATION_TIMEOUT = 15000;
  const CACHE_DURATION = 5 * 60 * 1000; // ✅ FIX #4: Reduced from 30 to 5 minutes to prevent stale location

  // Browser geolocation wrapped in Promise (FIX #2)
  const getBrowserLocation = (): Promise<UserLocation> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('UNSUPPORTED'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation: UserLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: Date.now(),
          };
          resolve(newLocation);
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('PERMISSION_DENIED'));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error('POSITION_UNAVAILABLE'));
              break;
            case error.TIMEOUT:
              reject(new Error('LOCATION_TIMEOUT'));
              break;
            default:
              reject(new Error('UNKNOWN_ERROR'));
          }
        },
        {
          enableHighAccuracy: false, // FIX #12: Reduce battery drain
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    });
  };

  // Capacitor geolocation
  const getCapacitorLocation = async (): Promise<UserLocation> => {
    // Check permissions first
    const permissions = await Geolocation.checkPermissions();
    console.log('[useLocation] Current permissions:', permissions.location);

    // FIX #4: Handle all permission states properly
    if (permissions.location === 'denied') {
      throw new Error('PERMISSION_DENIED');
    }

    // Request permission if not granted
    if (permissions.location !== 'granted') {
      const requestResult = await Geolocation.requestPermissions();
      console.log('[useLocation] Permission request result:', requestResult.location);

      // FIX #4: Check result of permission request
      if (requestResult.location === 'denied') {
        throw new Error('PERMISSION_DENIED');
      }

      if (requestResult.location !== 'granted') {
        throw new Error('PERMISSION_NOT_GRANTED');
      }
    }

    // Get position
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false, // FIX #12: Reduce battery drain
      timeout: 10000,
      maximumAge: 300000,
    });

    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      timestamp: Date.now(),
    };
  };

  // Main location request function
  const getLocationInternal = async (): Promise<UserLocation> => {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      console.log('[useLocation] Using Capacitor Geolocation');
      return await getCapacitorLocation();
    } else {
      console.log('[useLocation] Using browser Geolocation API');
      return await getBrowserLocation();
    }
  };

  // Public request location function
  const requestLocation = async () => {
    console.log('[useLocation] requestLocation called, attempt:', attemptCount);

    // ✅ FIX CRITICAL #4: Debounce - prevent requests within 2 seconds
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    if (timeSinceLastRequest < 2000) {
      console.log('[useLocation] Request debounced, too soon since last request (', timeSinceLastRequest, 'ms)');
      return;
    }

    // Prevent concurrent requests
    if (isRequestingRef.current) {
      console.log('[useLocation] Request already in progress, skipping');
      return;
    }

    lastRequestTimeRef.current = now;

    // FIX #3: Don't count permission denials as attempts
    // Only check attempt limit for non-permission errors
    if (attemptCount >= MAX_ATTEMPTS && error && !error.includes('permission')) {
      console.log('[useLocation] Max attempts reached for non-permission errors');
      setError('Unable to get location after multiple attempts. You can continue without location.');
      setLoading(false);
      return;
    }

    isRequestingRef.current = true;
    setLoading(true);
    setError(null);

    // Add timeout wrapper
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('LOCATION_TIMEOUT')), LOCATION_TIMEOUT);
    });

    try {
      const newLocation = await Promise.race([
        getLocationInternal(),
        timeoutPromise
      ]);

      if (isMountedRef.current) {
        setLocation(newLocation);
        setError(null);
        setAttemptCount(0); // Reset on success

        // FIX #7: Safe localStorage
        safeLocalStorage.setItem('userLocation', JSON.stringify(newLocation));
        safeLocalStorage.setItem('location_permission_granted', 'true');
      }
    } catch (error: any) {
      console.error('[useLocation] Error getting location:', error);

      if (!isMountedRef.current) return;

      const isNative = Capacitor.isNativePlatform();

      // FIX #3: Only increment attempts for non-permission errors
      const isPermissionError = error.message === 'PERMISSION_DENIED' || error.message === 'PERMISSION_NOT_GRANTED';

      if (!isPermissionError) {
        setAttemptCount(prev => prev + 1);
      } else {
        // FIX #10: Clear permission flag on denial
        safeLocalStorage.removeItem('location_permission_granted');
      }

      // Set appropriate error messages
      if (error.message === 'LOCATION_TIMEOUT') {
        setError('Location request timed out. You can continue without location.');
      } else if (error.message === 'PERMISSION_DENIED' || error.message === 'PERMISSION_NOT_GRANTED') {
        setError(
          isNative
            ? 'Location permission denied. Please enable location access in your device settings.'
            : 'Location permission denied. Please enable location access in your browser settings.'
        );
      } else if (error.message === 'POSITION_UNAVAILABLE') {
        setError('Unable to determine your location. Please check your device settings.');
      } else if (error.message === 'UNSUPPORTED') {
        setError('Your browser does not support geolocation.');
      } else {
        setError('Failed to get your location. You can continue without location.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        isRequestingRef.current = false;
      }
    }
  };

  // Load cached location on mount
  useEffect(() => {
    isMountedRef.current = true;
    console.log('[useLocation] Initial mount effect running');

    // Check localStorage for cached location
    const cachedLocation = safeLocalStorage.getItem('userLocation');
    if (cachedLocation) {
      try {
        const parsed = JSON.parse(cachedLocation);
        const age = Date.now() - parsed.timestamp;
        console.log('[useLocation] Found cached location, age:', age, 'ms');

        // ✅ FIX #4: Use cache if recent, but ALWAYS request fresh location
        if (age < CACHE_DURATION) {
          console.log('[useLocation] Using cached location (age:', Math.round(age / 1000), 'seconds)');
          setLocation(parsed);
        } else {
          console.log('[useLocation] Cache expired (age:', Math.round(age / 1000), 'seconds), will request fresh');
        }
      } catch (e) {
        console.error('[useLocation] Error parsing cached location:', e);
        safeLocalStorage.removeItem('userLocation');
      }
    }

    // Always request fresh location in background (non-blocking)
    requestLocation();

    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch for location changes - FIX #1: Use refs to avoid stale closures
  useEffect(() => {
    // FIX #8: Only start watching after we have initial location
    if (!location) {
      console.log('[useLocation] No initial location yet, skipping watch setup');
      return;
    }

    const isNative = Capacitor.isNativePlatform();
    const locationRef = { current: location };

    const startWatching = async () => {
      if (isNative) {
        try {
          watchIdRef.current = await Geolocation.watchPosition(
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 300000,
            },
            (position, err) => {
              if (err) {
                console.error('[useLocation] Watch error:', err);
                return;
              }

              if (position && isMountedRef.current) {
                const newLocation: UserLocation = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  timestamp: Date.now(),
                };

                // FIX #19: Increase threshold to 500m to reduce updates
                const latDiff = Math.abs(locationRef.current.lat - newLocation.lat);
                const lngDiff = Math.abs(locationRef.current.lng - newLocation.lng);
                const significantChange = latDiff > 0.005 || lngDiff > 0.005; // ~500m

                if (significantChange) {
                  console.log('[useLocation] Significant location change detected');
                  locationRef.current = newLocation;
                  setLocation(newLocation);
                  safeLocalStorage.setItem('userLocation', JSON.stringify(newLocation));
                }
              }
            }
          );
          console.log('[useLocation] Started Capacitor location watch');
        } catch (error) {
          console.error('[useLocation] Failed to start location watch:', error);
        }
      } else {
        if (!navigator.geolocation) return;

        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            if (!isMountedRef.current) return;

            const newLocation: UserLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              timestamp: Date.now(),
            };

            // FIX #19: Increase threshold to 500m
            const latDiff = Math.abs(locationRef.current.lat - newLocation.lat);
            const lngDiff = Math.abs(locationRef.current.lng - newLocation.lng);
            const significantChange = latDiff > 0.005 || lngDiff > 0.005;

            if (significantChange) {
              console.log('[useLocation] Significant location change detected');
              locationRef.current = newLocation;
              setLocation(newLocation);
              safeLocalStorage.setItem('userLocation', JSON.stringify(newLocation));
            }
          },
          (error) => {
            console.error('[useLocation] Watch error:', error);
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000,
          }
        );
        console.log('[useLocation] Started browser location watch');
      }
    };

    startWatching();

    return () => {
      // ✅ FIX HIGH #6: Ensure watch is always cleaned up, even if not fully initialized
      if (watchIdRef.current !== undefined) {
        console.log('[useLocation] Cleaning up location watch, id:', watchIdRef.current);
        try {
          if (isNative) {
            Geolocation.clearWatch({ id: watchIdRef.current as string });
          } else {
            navigator.geolocation.clearWatch(watchIdRef.current as number);
          }
        } catch (error) {
          console.error('[useLocation] Error clearing watch:', error);
        }
        watchIdRef.current = undefined;
      } else {
        console.log('[useLocation] No watch to clean up');
      }
    };
  }, [location]); // Depend on location so we can update watch

  return {
    location,
    loading,
    error,
    requestLocation,
    openSettings: openDeviceSettings,
    isNative: Capacitor.isNativePlatform(),
  };
}
