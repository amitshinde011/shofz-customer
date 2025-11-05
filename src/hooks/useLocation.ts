import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Geolocation } from '@capacitor/geolocation';

export interface UserLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

// Helper to open device settings
const openDeviceSettings = async () => {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      // Use the App plugin to open settings
      await (App as any).openUrl({ url: 'app-settings:' });
      return true;
    } catch (error) {
      console.error('Failed to open device settings:', error);
      // Fallback to legacy methods
      try {
        const platform = Capacitor.getPlatform();
        if (platform === 'ios') {
          window.location.href = 'app-settings:';
        }
        return true;
      } catch (e) {
        return false;
      }
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
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();

  console.log('[useLocation] Hook state - location:', !!location, 'loading:', loading, 'error:', error);

  const requestLocation = async () => {
    console.log('[useLocation] requestLocation called');
    const isNative = Capacitor.isNativePlatform();
    let mounted = true;

    console.log('[useLocation] Setting loading to true, requesting position');
    setLoading(true);
    setError(null); // Clear previous errors

    try {
      let position;

      if (isNative) {
        // Use Capacitor Geolocation on native platforms
        console.log('[useLocation] Using Capacitor Geolocation');

        // Check permissions first
        const permissions = await Geolocation.checkPermissions();
        console.log('[useLocation] Current permissions:', permissions.location);

        if (permissions.location === 'denied') {
          throw new Error('PERMISSION_DENIED');
        }

        if (permissions.location !== 'granted') {
          const requestResult = await Geolocation.requestPermissions();
          console.log('[useLocation] Permission request result:', requestResult.location);

          if (requestResult.location === 'denied') {
            throw new Error('PERMISSION_DENIED');
          }
        }

        position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });

        const newLocation: UserLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now(),
        };

        console.log('[useLocation] Position received:', newLocation);
        if (mounted) {
          setLocation(newLocation);
          setError(null);
          setLoading(false);
          localStorage.setItem('userLocation', JSON.stringify(newLocation));
        }
      } else {
        // Use browser Geolocation API on web
        console.log('[useLocation] Using browser Geolocation API');
        if (!navigator.geolocation) {
          throw new Error('UNSUPPORTED');
        }

        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const newLocation: UserLocation = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              timestamp: Date.now(),
            };

            if (mounted) {
              setLocation(newLocation);
              setError(null);
              setLoading(false);
              localStorage.setItem('userLocation', JSON.stringify(newLocation));
            }
          },
          (error) => {
            let errorMsg = 'Failed to get your location';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMsg = 'Location permission denied. Please enable location access in your browser settings.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMsg = 'Location information unavailable. Please check your device settings.';
                break;
              case error.TIMEOUT:
                errorMsg = 'Location request timed out. Please try again.';
                break;
            }
            setError(errorMsg);
            setLoading(false);
            // Toast removed - LocationPermissionGate will show the error
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000,
          }
        );
      }
    } catch (error: any) {
      let errorMsg = 'Failed to get your location';
      let toastTitle = "Location Access";

      const errorMessage = error.message || error.toString();

      if (errorMessage.includes('PERMISSION_DENIED') || error.code === 'PERMISSION_DENIED') {
        errorMsg = 'Location permission denied. Please enable location access in your device settings.';
        toastTitle = "Location Permission Required";
      } else if (errorMessage.includes('POSITION_UNAVAILABLE')) {
        errorMsg = 'Location services may be disabled. Please turn on location services in your device settings.';
        toastTitle = "Location Services Disabled";
      } else if (errorMessage.includes('TIMEOUT')) {
        errorMsg = 'Location request timed out. Please try again.';
        toastTitle = "Location Request Timeout";
      } else if (errorMessage.includes('UNSUPPORTED')) {
        errorMsg = 'Geolocation is not supported on this device.';
        toastTitle = "Feature Not Supported";
      }

      console.error('[useLocation] Geolocation error:', error);
      setError(errorMsg);
      setLoading(false);
      // Toast removed - LocationPermissionGate will show the error
    }
  };

  // Load cached location on mount only (no automatic request)
  useEffect(() => {
    console.log('[useLocation] Initial mount effect running');
    // Check localStorage for cached location
    const cachedLocation = localStorage.getItem('userLocation');
    if (cachedLocation) {
      try {
        const parsed = JSON.parse(cachedLocation);
        const age = Date.now() - parsed.timestamp;
        console.log('[useLocation] Found cached location, age:', age, 'ms');
        // Use cached location if less than 30 minutes old
        if (age < 30 * 60 * 1000) {
          console.log('[useLocation] Using cached location');
          setLocation(parsed);
          return;
        } else {
          console.log('[useLocation] Cached location expired');
        }
      } catch (e) {
        console.error('[useLocation] Error parsing cached location:', e);
      }
    } else {
      console.log('[useLocation] No cached location found');
    }
    
    // Don't automatically request location - wait for user gesture
    // This fixes the "violation" warning
  }, []);

  // Watch for location changes - only when user has granted permission
  useEffect(() => {
    // Only start watching if we already have a location (permission granted)
    if (!location) return;

    const isNative = Capacitor.isNativePlatform();
    let watchId: string | number | undefined;

    const startWatching = async () => {
      if (isNative) {
        try {
          watchId = await Geolocation.watchPosition(
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 300000,
            },
            (position, err) => {
              if (err) {
                console.error('Location watch error:', err);
                return;
              }

              if (position) {
                const newLocation: UserLocation = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  timestamp: Date.now(),
                };

                setLocation(prev => {
                  if (!prev) return newLocation;

                  const latDiff = Math.abs(prev.lat - newLocation.lat);
                  const lngDiff = Math.abs(prev.lng - newLocation.lng);
                  const significantChange = latDiff > 0.001 || lngDiff > 0.001;

                  if (significantChange) {
                    // Always update timestamp to keep cache fresh
                    const updatedLocation = { ...newLocation, timestamp: Date.now() };
                    localStorage.setItem('userLocation', JSON.stringify(updatedLocation));
                    return updatedLocation;
                  }
                  
                  // Update timestamp even if location didn't change significantly
                  const updatedLocation = { ...prev, timestamp: Date.now() };
                  localStorage.setItem('userLocation', JSON.stringify(updatedLocation));
                  return updatedLocation;
                });
              }
            }
          );
        } catch (error) {
          console.error('Failed to start location watch:', error);
        }
      } else {
        if (!navigator.geolocation) return;

        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const newLocation: UserLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              timestamp: Date.now(),
            };

            setLocation(prev => {
              if (!prev) return newLocation;

              const latDiff = Math.abs(prev.lat - newLocation.lat);
              const lngDiff = Math.abs(prev.lng - newLocation.lng);
              const significantChange = latDiff > 0.001 || lngDiff > 0.001;

              if (significantChange) {
                const updatedLocation = { ...newLocation, timestamp: Date.now() };
                localStorage.setItem('userLocation', JSON.stringify(updatedLocation));
                return updatedLocation;
              }
              
              // Update timestamp even if location didn't change significantly
              const updatedLocation = { ...prev, timestamp: Date.now() };
              localStorage.setItem('userLocation', JSON.stringify(updatedLocation));
              return updatedLocation;
            });
          },
          (error) => {
            console.error('Location watch error:', error);
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000,
          }
        );
      }
    };

    startWatching();

    return () => {
      if (watchId !== undefined) {
        if (isNative) {
          Geolocation.clearWatch({ id: watchId as string });
        } else {
          navigator.geolocation.clearWatch(watchId as number);
        }
      }
    };
  }, [location]); // Only watch when we have initial location

  return {
    location,
    loading,
    error,
    requestLocation,
    openSettings: openDeviceSettings,
    isNative: Capacitor.isNativePlatform(),
  };
}
