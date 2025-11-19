/**
 * Location Hook - Production-Ready Location Service
 * 
 * Provides comprehensive location services with:
 * - Web and native platform support
 * - Battery-efficient continuous tracking
 * - Offline GPS support for native apps
 * - Memory leak prevention
 * - User preference management
 * - Analytics tracking
 * 
 * @example
 * ```tsx
 * const { location, loading, error, requestLocation, clearLocation } = useLocation();
 * 
 * // Request location (requires user gesture on web)
 * await requestLocation(true);
 * 
 * // Clear and reset location
 * clearLocation();
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { toast } from 'sonner';
import { calculateDistance } from '@/lib/distanceCalculation';
import { trackEvent } from '@/lib/analytics';

const DEBUG_LOCATION = import.meta.env.DEV;

/**
 * Safe localStorage wrapper that handles unavailability (private browsing, etc.)
 * Can be used across components for consistent error handling
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof localStorage === 'undefined' || !localStorage) return null;
      return localStorage.getItem(key);
    } catch (e) {
      if (DEBUG_LOCATION) console.warn('[Location:Storage] getItem unavailable:', e);
      return null;
    }
  },
  setItem: (key: string, value: string): boolean => {
    try {
      if (typeof localStorage === 'undefined' || !localStorage) return false;
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      if (DEBUG_LOCATION) console.warn('[Location:Storage] setItem failed:', e);
      return false;
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof localStorage === 'undefined' || !localStorage) return;
      localStorage.removeItem(key);
    } catch (e) {
      if (DEBUG_LOCATION) console.warn('[Location:Storage] removeItem failed:', e);
    }
  },
};

/**
 * User location with timestamp for cache validation
 */
export interface UserLocation {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number; // Accuracy in meters (if available)
}

// ============= Configuration Constants =============
const SIGNIFICANT_MOVE_THRESHOLD_KM = 0.05; // 50 meters - update threshold
const PERMISSION_QUERY_TIMEOUT = 5000; // 5 seconds - permission check timeout
const LOCATION_CACHE_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes - cache validity
const MAX_WATCH_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours - auto-stop watch
const MAX_RETRY_COUNT = 3; // Maximum automatic retry attempts
const RETRY_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes cooldown after max retries
const BATTERY_WARNING_SHOWN_KEY = 'shofz_battery_warning_shown'; // One-time battery warning

/**
 * Get human-readable location age string
 * @param location - User location with timestamp
 * @returns Formatted age string like "Just now" or "5 minutes ago"
 */
export function getLocationAge(location: UserLocation | null): string {
  if (!location) return 'Unknown';
  const ageMs = Date.now() - location.timestamp;
  const ageMinutes = Math.floor(ageMs / 60000);
  
  if (ageMinutes < 1) return 'Just now';
  if (ageMinutes === 1) return '1 minute ago';
  if (ageMinutes < 60) return `${ageMinutes} minutes ago`;
  
  const ageHours = Math.floor(ageMinutes / 60);
  if (ageHours === 1) return '1 hour ago';
  return `${ageHours} hours ago`;
}

/**
 * Get location staleness indicator
 * @param location - User location with timestamp
 * @returns Color indicator: 'green' (<2min), 'yellow' (2-5min), 'red' (>5min)
 */
export function getLocationFreshness(location: UserLocation | null): 'green' | 'yellow' | 'red' | 'unknown' {
  if (!location) return 'unknown';
  const ageMinutes = Math.floor((Date.now() - location.timestamp) / 60000);
  
  if (ageMinutes < 2) return 'green';
  if (ageMinutes < 5) return 'yellow';
  return 'red';
}

/**
 * Open device location settings (native platforms only)
 * @returns true if settings opened successfully, false otherwise
 */
const openDeviceSettings = async (): Promise<boolean> => {
  const platform = Capacitor.getPlatform();
  
  if (platform === 'ios' || platform === 'android') {
    try {
      if (DEBUG_LOCATION) console.log('[Location:Settings] Opening device settings');
      const settingsOpened = window.open('app-settings:', '_system');
      const success = settingsOpened !== null;
      
      // Track analytics
      trackEvent('Location', 'Open Settings', platform, success ? 1 : 0);
      
      return success;
    } catch (error) {
      if (DEBUG_LOCATION) console.error('[Location:Settings] Failed to open:', error);
      trackEvent('Location', 'Open Settings Failed', platform);
      return false;
    }
  }
  
  // On web, can't open system settings
  if (DEBUG_LOCATION) console.warn('[Location:Settings] Not available on web');
  return false;
};

export function useLocation() {
  const STORAGE_KEYS = {
    LOCATION: 'shofz_user_location',
    PERMISSION_GRANTED: 'shofz_location_permission_granted',
    TOAST_ENABLED: 'shofz_location_toast_enabled', // User preference for location update toasts
  };

  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);
  
  // Use ref instead of state to avoid dependency issues in watchPosition
  const lastUpdateToastRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<string | null>(null);

  // Helper to show location update toast (throttled to once per minute)
  const showLocationUpdateToast = useCallback(() => {
    // Check if user has disabled location update toasts
    const toastEnabled = safeLocalStorage.getItem(STORAGE_KEYS.TOAST_ENABLED);
    if (toastEnabled === 'false') return;
    
    const now = Date.now();
    if (now - lastUpdateToastRef.current > 60000) { // Only show once per minute
      toast.success('Location updated', {
        description: 'Your location has been refreshed',
        duration: 2000,
      });
      lastUpdateToastRef.current = now;
    }
  }, [STORAGE_KEYS.TOAST_ENABLED]);

  const getLocationInternal = async (isManualTrigger: boolean = false): Promise<void> => {
    // Prevent simultaneous requests
    if (isRequesting) {
      if (DEBUG_LOCATION) console.log('[useLocation] Request already in progress, skipping');
      return;
    }
    
    setIsRequesting(true);
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
      const retryError = 'Location request failed multiple times. Retrying automatically in 2 minutes, or continue without location.';
      setError(retryError);
      setLoading(false);
      setIsRequesting(false);
      
      // Schedule automatic retry after 2 minutes
      setTimeout(() => {
        if (DEBUG_LOCATION) console.log('[useLocation] Auto-retry after failure cooldown');
        setRetryCount(0);
        requestLocation(false);
      }, 2 * 60 * 1000);
      
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

        safeLocalStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(newLocation));
        safeLocalStorage.setItem(STORAGE_KEYS.PERMISSION_GRANTED, 'true');

        setLoading(false);
        setIsRequesting(false);
      } else {
        // Use browser Geolocation API on web
        if (DEBUG_LOCATION) console.log('[useLocation] Using browser Geolocation API');
        if (!navigator.geolocation) {
          throw new Error('UNSUPPORTED');
        }

        // Check permission state on web (if supported)
        if ('permissions' in navigator) {
          try {
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Permission query timeout')), 3000)
            );
            
            const permissionPromise = navigator.permissions.query({ name: 'geolocation' as PermissionName });
            
            const permissionStatus = await Promise.race([permissionPromise, timeoutPromise]) as PermissionStatus;
            
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

              safeLocalStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(newLocation));
              safeLocalStorage.setItem(STORAGE_KEYS.PERMISSION_GRANTED, 'true');
              
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
        setIsRequesting(false);
      }

      if (DEBUG_LOCATION) console.log('[useLocation] Location retrieved successfully');
    } catch (error: any) {
      setIsRequesting(false);
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

  // Function to clear location and allow re-requesting
  const clearLocation = useCallback(() => {
    if (DEBUG_LOCATION) console.log('[useLocation] Clearing location data');
    setLocation(null);
    setError(null);
    setRetryCount(0);
    safeLocalStorage.removeItem(STORAGE_KEYS.LOCATION);
    safeLocalStorage.removeItem(STORAGE_KEYS.PERMISSION_GRANTED);
    
    // Clear any scheduled retries
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    // Stop watching position
    if (watchIdRef.current) {
      if (Capacitor.isNativePlatform()) {
        Geolocation.clearWatch({ id: watchIdRef.current });
      } else {
        navigator.geolocation.clearWatch(parseInt(watchIdRef.current));
      }
      watchIdRef.current = null;
    }
  }, [STORAGE_KEYS.LOCATION, STORAGE_KEYS.PERMISSION_GRANTED]);

  // Load cached location on mount (no auto-request)
  useEffect(() => {
    const loadCachedLocation = () => {
      if (DEBUG_LOCATION) console.log('[useLocation] Checking for cached location...');

      try {
        const cachedLocation = safeLocalStorage.getItem(STORAGE_KEYS.LOCATION);
        if (cachedLocation) {
          const parsed = JSON.parse(cachedLocation);
          
          // Validate structure
          if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number' && typeof parsed.timestamp === 'number') {
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
          } else {
            if (DEBUG_LOCATION) console.warn('[useLocation] Cached location has invalid structure');
            safeLocalStorage.removeItem(STORAGE_KEYS.LOCATION);
          }
        }
      } catch (error) {
        if (DEBUG_LOCATION) console.error('[useLocation] Failed to load cached location:', error);
        // Clear corrupted cache
        safeLocalStorage.removeItem(STORAGE_KEYS.LOCATION);
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

    let cleanup: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        
        const handlePermissionChange = () => {
          if (DEBUG_LOCATION) console.log('[useLocation] Permission state changed:', permissionStatus.state);
          
          if (permissionStatus.state === 'denied') {
            setLocation(null);
            setError('Location permission was revoked. Please enable location access in your browser settings, or continue without location.');
            safeLocalStorage.removeItem(STORAGE_KEYS.LOCATION);
            safeLocalStorage.removeItem(STORAGE_KEYS.PERMISSION_GRANTED);
          }
        };

        permissionStatus.addEventListener('change', handlePermissionChange);
        
        cleanup = () => {
          permissionStatus.removeEventListener('change', handlePermissionChange);
        };
      } catch (error) {
        if (DEBUG_LOCATION) console.error('[useLocation] Failed to setup permission listener:', error);
      }
    };

    setupListener();

    return () => {
      if (cleanup) cleanup();
    };
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
  }, [location, requestLocation]);

  // Set up continuous location watching
  useEffect(() => {
    // Only start watching if we have an initial location
    if (!location) {
      if (DEBUG_LOCATION) console.log('[useLocation] Skipping watch - no initial location yet');
      return;
    }

    const isNative = Capacitor.isNativePlatform();
    let watchId: string | number | undefined;
    let lastKnownLocation = location; // Capture initial location

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
                const distance = calculateDistance(
                  { lat: lastKnownLocation.lat, lng: lastKnownLocation.lng },
                  { lat: newLocation.lat, lng: newLocation.lng }
                );

                if (distance > SIGNIFICANT_MOVE_THRESHOLD_KM) {
                  if (DEBUG_LOCATION) console.log('[Location:Watch] Significant move:', distance, 'km');
                  setLocation(newLocation);
                  lastKnownLocation = newLocation;
                  safeLocalStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(newLocation));
                  showLocationUpdateToast();
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
              const distance = calculateDistance(
                { lat: lastKnownLocation.lat, lng: lastKnownLocation.lng },
                { lat: newLocation.lat, lng: newLocation.lng }
              );

              if (distance > SIGNIFICANT_MOVE_THRESHOLD_KM) {
                if (DEBUG_LOCATION) console.log('[Location:Watch] Significant move:', distance, 'km');
                setLocation(newLocation);
                lastKnownLocation = newLocation;
                safeLocalStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(newLocation));
                showLocationUpdateToast();
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
  }, [showLocationUpdateToast]); // Add showLocationUpdateToast dependency

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    location,
    loading,
    error,
    requestLocation,
    clearLocation,
    openSettings: openDeviceSettings,
    isNative: Capacitor.isNativePlatform(),
  };
}
