/**
 * Google Analytics 4 Integration
 * Tracks user behavior and app usage
 */

import ReactGA from 'react-ga4';

// Initialize GA4 with your measurement ID
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // Replace with your actual GA4 measurement ID

let isInitialized = false;

export function initializeAnalytics() {
  if (!isInitialized && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
    ReactGA.initialize(GA_MEASUREMENT_ID);
    isInitialized = true;
    console.log('Google Analytics initialized');
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
