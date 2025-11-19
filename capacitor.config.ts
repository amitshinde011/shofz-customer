import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shofz.app',
  appName: 'Shofz',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Geolocation: {
      // Ensure consistent behavior across platforms
    },
    StatusBar: {
      overlaysWebView: false, // Changed from 'overlay' to 'overlaysWebView'
      style: 'Dark',          // Changed from 'LIGHT' to 'Dark' for consistency
      //backgroundColor: '#ffffff' // Optional: match your app's background
    },
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
