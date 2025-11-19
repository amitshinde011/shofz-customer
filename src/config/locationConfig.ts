/**
 * Location Service Configuration
 * Environment-specific settings for location tracking
 */

const isDevelopment = import.meta.env.DEV;

export const LOCATION_CONFIG = {
  // Timeout settings
  TIMEOUT_MS: isDevelopment ? 15000 : 10000,
  PERMISSION_QUERY_TIMEOUT: 3000,
  
  // Accuracy and thresholds
  SIGNIFICANT_MOVE_THRESHOLD_KM: 0.05, // 50 meters
  HIGH_ACCURACY_THRESHOLD_M: 100, // Warn if accuracy worse than 100m
  
  // Watch settings
  MAX_WATCH_DURATION_MS: 4 * 60 * 60 * 1000, // 4 hours
  WATCH_OPTIONS: {
    enableHighAccuracy: true,
    maximumAge: 5 * 60 * 1000, // 5 minutes
    timeout: isDevelopment ? 15000 : 10000,
  },
  
  // Retry settings
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAYS: [1000, 2000, 4000], // Exponential backoff
  
  // Storage keys (centralized)
  STORAGE_KEYS: {
    LOCATION: 'user_location_v2',
    TOAST_ENABLED: 'location_toast_enabled',
    BATTERY_WARNING_SHOWN: 'location_battery_warning_shown',
    SKIP_PERMISSION: 'shofz_skip_location_permission',
    PERMISSION_GRANTED: 'shofz_location_permission_granted',
  },
  
  // Feature flags
  DEBUG_LOGGING: isDevelopment,
  ANALYTICS_ENABLED: true,
  TOAST_NOTIFICATIONS: true,
} as const;
