import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsService } from '@/services/analyticsService';

/**
 * Hook to automatically track page views
 */
export function usePageTracking() {
  const location = useLocation();
  const previousPath = useRef<string>('');

  useEffect(() => {
    const currentPath = location.pathname;
    
    if (currentPath !== previousPath.current) {
      analyticsService.trackPageView(currentPath, previousPath.current);
      previousPath.current = currentPath;
    }
  }, [location]);
}

/**
 * Hook to track events with convenience methods
 */
export function useAnalytics() {
  const trackEvent = (eventType: string, eventData?: Record<string, any>) => {
    analyticsService.trackEvent(eventType, eventData);
  };

  const trackProductView = (productId: string, productName: string, source?: string) => {
    analyticsService.trackProductView(productId, productName, source);
  };

  const trackShopView = (shopId: string, shopName: string, source?: string) => {
    analyticsService.trackShopView(shopId, shopName, source);
  };

  const trackInquiryCreated = (inquiryId: string, shopId: string, productName: string) => {
    analyticsService.trackInquiryCreated(inquiryId, shopId, productName);
  };

  const trackFavoriteToggle = (itemType: 'product' | 'shop', itemId: string, action: 'add' | 'remove') => {
    analyticsService.trackFavoriteToggle(itemType, itemId, action);
  };

  const trackMessageSent = (inquiryId: string, messageType: string) => {
    analyticsService.trackMessageSent(inquiryId, messageType);
  };

  const trackSearch = (query: string, resultsCount: number, filters?: Record<string, any>) => {
    analyticsService.trackSearch(query, resultsCount, filters);
  };

  const trackFilterApplied = (filterType: string, filterValue: any) => {
    analyticsService.trackFilterApplied(filterType, filterValue);
  };

  const trackError = (errorType: string, errorMessage: string, errorStack?: string) => {
    analyticsService.trackError(errorType, errorMessage, errorStack);
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
