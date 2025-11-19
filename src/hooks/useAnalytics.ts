import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsService } from '@/services/analyticsService';
import { 
  trackPageView as trackGA4PageView,
  trackEvent as trackGA4Event,
  trackShopView as trackGA4ShopView,
  trackInquiryCreated as trackGA4Inquiry,
  trackFavoriteToggle as trackGA4Favorite,
  trackMessageSent as trackGA4Message,
  trackShopSearch
} from '@/lib/analytics';

/**
 * Hook to automatically track page views
 * Tracks to both our database AND Google Analytics
 */
export function usePageTracking() {
  const location = useLocation();
  const previousPath = useRef<string>('');

  useEffect(() => {
    const currentPath = location.pathname;
    
    if (currentPath !== previousPath.current) {
      // Track in our database
      analyticsService.trackPageView(currentPath, previousPath.current);
      // Track in Google Analytics
      trackGA4PageView(currentPath);
      previousPath.current = currentPath;
    }
  }, [location]);
}

/**
 * Hook to track events with convenience methods
 * Tracks to both our database AND Google Analytics
 */
export function useAnalytics() {
  const trackEvent = (eventType: string, eventData?: Record<string, any>) => {
    analyticsService.trackEvent(eventType, eventData);
    // GA4 events are tracked via specific methods below
  };

  const trackProductView = (productId: string, productName: string, source?: string) => {
    // Track in our database
    analyticsService.trackProductView(productId, productName, source);
    // Track in Google Analytics
    trackGA4Event('Product', 'View', productName);
  };

  const trackShopView = (shopId: string, shopName: string, source?: string) => {
    // Track in our database
    analyticsService.trackShopView(shopId, shopName, source);
    // Track in Google Analytics
    trackGA4ShopView(shopId, shopName);
  };

  const trackInquiryCreated = (inquiryId: string, shopId: string, productName: string) => {
    analyticsService.trackInquiryCreated(inquiryId, shopId, productName);
    trackGA4Inquiry(shopId, productName);
  };

  const trackFavoriteToggle = (itemType: 'product' | 'shop', itemId: string, action: 'add' | 'remove') => {
    analyticsService.trackFavoriteToggle(itemType, itemId, action);
    trackGA4Favorite(itemType, action, itemId);
  };

  const trackMessageSent = (inquiryId: string, messageType: string) => {
    analyticsService.trackMessageSent(inquiryId, messageType);
    trackGA4Message(inquiryId);
  };

  const trackSearch = (query: string, resultsCount: number, filters?: Record<string, any>) => {
    analyticsService.trackSearch(query, resultsCount, filters);
    trackShopSearch(query, resultsCount);
  };

  const trackFilterApplied = (filterType: string, filterValue: any) => {
    analyticsService.trackFilterApplied(filterType, filterValue);
    trackGA4Event('Filter', 'Apply', filterType, filterValue);
  };

  const trackError = (errorType: string, errorMessage: string, errorStack?: string) => {
    analyticsService.trackError(errorType, errorMessage, errorStack);
    trackGA4Event('Error', errorType, errorMessage);
  };

  return {
    trackEvent,
    trackProductView,
    trackShopView,
    trackInquiryCreated,
    trackFavoriteToggle,
    trackMessageSent,
    trackSearch,
    trackFilterApplied,
    trackError,
  };
}
