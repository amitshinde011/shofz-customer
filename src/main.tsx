import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { checkStorageHealth, repairStorage } from '@/lib/storageHealth';

const configureStatusBar = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setStyle({ style: Style.Dark });
    } catch (err) {
      console.warn('Failed to configure StatusBar:', err);
    }
  }
};

const initializeServiceWorker = async () => {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  
  console.log(`[Platform] Running on: ${platform}${isNative ? ' (native)' : ' (web)'}`);

  // Native platforms: Disable and cleanup SW
  if (isNative) {
    console.log('[SW] Native platform detected - cleaning up service workers');
    
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log('[SW] Unregistered service worker on native platform');
        }
        
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          console.log(`[SW] Deleted ${cacheNames.length} caches on native platform`);
        }
      } catch (error) {
        console.error('[SW] Failed to cleanup on native:', error);
      }
    }
    
    return;
  }

  // Web/PWA platforms: Enhanced SW registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        console.log('[SW] Web platform - initializing service worker');

        // Clear problematic old caches BEFORE registration
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          
          const apiCaches = cacheNames.filter(name => 
            name.includes('supabase-api') || 
            name.includes('api-cache')
          );
          
          if (apiCaches.length > 0) {
            await Promise.all(apiCaches.map(name => caches.delete(name)));
            console.log(`[SW] Deleted ${apiCaches.length} old API caches`);
          }
        }

        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });

        console.log('[SW] Service Worker registered successfully');

        // Check for updates every 30 minutes
        setInterval(() => {
          registration.update();
          console.log('[SW] Checking for updates...');
        }, 30 * 60 * 1000);

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          console.log('[SW] New version detected');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New version available, prompting user...');
              
              if (window.confirm('📦 New version available! Update now to get the latest fixes?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        });

        // Auto-reload when new SW takes control
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            console.log('[SW] New service worker activated, reloading...');
            refreshing = true;
            window.location.reload();
          }
        });

      } catch (error) {
        console.error('[SW] Registration failed:', error);
        
        try {
          if ('caches' in window) {
            const names = await caches.keys();
            await Promise.all(names.map(n => caches.delete(n)));
            console.log('[SW] Cleared all caches after registration failure');
          }
        } catch (cleanupError) {
          console.error('[SW] Cleanup also failed:', cleanupError);
        }
        
        console.log('[SW] App will continue without service worker');
      }
    });
  } else {
    console.log('[SW] Service workers not supported in this browser');
  }
};

const initializeApp = async () => {
  await configureStatusBar();
  
  // Check storage health on ALL platforms
  const healthInfo = await checkStorageHealth();
  console.log('[StorageHealth] Platform:', healthInfo.platform);
  console.log('[StorageHealth] Health check:', healthInfo);
  
  if (!healthInfo.isHealthy) {
    console.warn('[StorageHealth] Storage issues detected, attempting repair...');
    
    const repaired = await repairStorage();
    
    if (repaired) {
      console.log('[StorageHealth] Repair successful, app will continue');
    } else {
      console.error('[StorageHealth] Repair failed');
      
      if (confirm('App storage needs to be reset. Continue?')) {
        window.location.reload();
      }
    }
  }
  
  await initializeServiceWorker();
  
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
};

initializeApp().catch(error => {
  console.error('[App] Initialization failed:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center;">
      <h1>⚠️ App Failed to Start</h1>
      <p>Please try clearing your browser data and reload.</p>
      <button onclick="location.reload()">Reload</button>
    </div>
  `;
});
