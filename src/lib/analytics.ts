/**
 * Google Analytics 4 Integration
 * Tracks user behavior and app usage
 */

import ReactGA from 'react-ga4';

/**
 * To activate Google Analytics:
 * 1. Get your GA4 Measurement ID from https://analytics.google.com/
 *    (Format: G-XXXXXXXXXX)
 * 2. Replace 'G-XXXXXXXXXX' below with your actual ID
 * 3. That's it! GA4 will start tracking automatically
 */
const GA_MEASUREMENT_ID = 'G-NLEXH6PLL4'; // TODO: Replace with your GA4 ID

let isInitialized = false;

export function initializeAnalytics() {
  if (!isInitialized && GA_MEASUREMENT_ID && GA_MEASUREMENT_ID.startsWith('G-')) {
    ReactGA.initialize(GA_MEASUREMENT_ID);
    isInitialized = true;
    console.log('✅ Google Analytics initialized successfully');
  }
}

// Track page views
export function trackPageView(path: string) {
  if (isInitialized) {
    ReactGA.send({ hitType: 'pageview', page: path });
  }
}

// Track custom events
export function trackEvent(category: string, action: string, label?: string, value?: number) {
  if (isInitialized) {
    ReactGA.event({
      category,
      action,
      label,
      value,
    });
  }
}

// Shop-specific tracking
export function trackShopView(shopId: string, shopName: string) {
  trackEvent('Shop', 'View Profile', shopName);
}

export function trackShopSearch(query: string, resultsCount: number) {
  trackEvent('Search', 'Shop Search', query, resultsCount);
}

export function trackInquiryCreated(shopId: string, shopName: string) {
  trackEvent('Inquiry', 'Create', shopName);
}

export function trackFavoriteToggle(type: 'shop' | 'product', action: 'add' | 'remove', name: string) {
  trackEvent('Favorite', `${action} ${type}`, name);
}

export function trackDirections(shopName: string) {
  trackEvent('Navigation', 'Get Directions', shopName);
}

export function trackCall(shopName: string) {
  trackEvent('Communication', 'Call Shop', shopName);
}

export function trackMessageSent(shopName: string) {
  trackEvent('Communication', 'Send Message', shopName);
}
