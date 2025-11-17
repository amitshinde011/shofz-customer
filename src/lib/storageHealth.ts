import { Capacitor } from '@capacitor/core';

export interface StorageInfo {
  platform: string;
  isNative: boolean;
  isHealthy: boolean;
  itemCount: number;
  estimatedSizeKB: string;
  hasServiceWorker: boolean;
  hasCaches: boolean;
  cacheCount: number;
}

export const checkStorageHealth = async (): Promise<StorageInfo> => {
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();
  
  let isHealthy = true;
  let itemCount = 0;
  let totalSize = 0;
  
  // Test localStorage
  try {
    const testKey = '_shofz_health_check_';
    const testValue = Date.now().toString();
    
    localStorage.setItem(testKey, testValue);
    const readValue = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    
    if (readValue !== testValue) {
      console.error('[StorageHealth] Read/write test failed');
      isHealthy = false;
    }
    
    // Calculate storage size
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage[key];
        totalSize += key.length + value.length;
        itemCount++;
      }
    }
  } catch (error) {
    console.error('[StorageHealth] Storage test exception:', error);
    isHealthy = false;
  }
  
  // Check for service workers (shouldn't exist on native)
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasCaches = 'caches' in window;
  let cacheCount = 0;
  
  if (hasCaches) {
    try {
      const cacheNames = await caches.keys();
      cacheCount = cacheNames.length;
      
      // Service workers shouldn't be active on native
      if (isNative && cacheCount > 0) {
        console.warn(`[StorageHealth] Native platform has ${cacheCount} caches (should be 0)`);
        isHealthy = false;
      }
    } catch (error) {
      console.error('[StorageHealth] Cache check failed:', error);
    }
  }
  
  return {
    platform,
    isNative,
    isHealthy,
    itemCount,
    estimatedSizeKB: (totalSize / 1024).toFixed(2),
    hasServiceWorker,
    hasCaches,
    cacheCount,
  };
};

export const repairStorage = async (): Promise<boolean> => {
  console.warn('[StorageHealth] Attempting emergency repair...');
  const platform = Capacitor.getPlatform();
  
  try {
    // Step 1: Backup critical flags before clearing
    const criticalFlags = {
      locationPermissionGranted: localStorage.getItem('location_permission_granted'),
      skipLocationPermission: localStorage.getItem('skip_location_permission'),
      userLocation: localStorage.getItem('userLocation'),
    };
    
    // Step 2: Clear localStorage
    localStorage.clear();
    sessionStorage.clear();
    console.log('[StorageHealth] Cleared storage');
    
    // Step 3: Restore critical flags if they were valid
    if (criticalFlags.locationPermissionGranted === 'true') {
      localStorage.setItem('location_permission_granted', 'true');
      console.log('[StorageHealth] Restored location permission flag');
    }
    
    if (criticalFlags.skipLocationPermission === 'true') {
      localStorage.setItem('skip_location_permission', 'true');
      console.log('[StorageHealth] Restored skip location flag');
    }
    
    // Try to restore location if it's valid JSON
    if (criticalFlags.userLocation) {
      try {
        const parsed = JSON.parse(criticalFlags.userLocation);
        if (parsed.lat && parsed.lng) {
          localStorage.setItem('userLocation', criticalFlags.userLocation);
          console.log('[StorageHealth] Restored user location');
        }
      } catch (e) {
        console.log('[StorageHealth] Could not restore location (corrupted)');
      }
    }
    
    // Step 4: Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log(`[StorageHealth] Deleted ${cacheNames.length} caches`);
    }
    
    // Step 5: Unregister service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
      console.log(`[StorageHealth] Unregistered ${registrations.length} service workers`);
    }
    
    // Step 6: Verify repair worked
    const testKey = '_repair_test_';
    localStorage.setItem(testKey, 'success');
    const testValue = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    
    const success = testValue === 'success';
    console.log(`[StorageHealth] Repair ${success ? 'succeeded' : 'failed'} on ${platform}`);
    
    return success;
  } catch (error) {
    console.error('[StorageHealth] Repair failed:', error);
    return false;
  }
};

export const getStorageInfo = async (): Promise<StorageInfo> => {
  return await checkStorageHealth();
};
