import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

const configureStatusBar = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      // CHANGED: Set overlay to false to prevent content going behind status bar
      await StatusBar.setOverlaysWebView({ overlay: false });

      // Set status bar style - Dark text on light background
      await StatusBar.setStyle({ style: Style.Dark });
      
      // Optional: Set background color to match your app
      //await StatusBar.setBackgroundColor({ color: '#ffffff' });
    } catch (err) {
      console.warn('Failed to configure StatusBar:', err);
    }
  }
};

configureStatusBar();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// Register service worker for PWA
if ('serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(registration => {
        console.log('PWA: Service Worker registered', registration);
      })
      .catch(error => {
        console.error('PWA: Service Worker registration failed', error);
      });
  });
}
