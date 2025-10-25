import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsEvent {
  event_type: string;
  event_data?: Record<string, any>;
  user_id?: string;
  session_id?: string;
}

class AnalyticsService {
  private sessionId: string;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Track a generic event
   */
  async trackEvent(eventType: string, eventData?: Record<string, any>): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Skip analytics if user is not authenticated
      // This prevents 401 errors from RLS policies
      if (!user) {
        console.debug('Skipping analytics tracking for unauthenticated user');
        return;
      }

      await supabase.from('analytics_events').insert({
        user_id: user.id,
        session_id: this.sessionId,
        event_type: eventType,
        event_data: {
          ...eventData,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          screen_resolution: `${window.screen.width}x${window.screen.height}`,
          viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        },
      });
    } catch (error) {
      // Silently fail to not disrupt user experience
      console.debug('Analytics tracking error:', error);
    }
  }

  /**
   * Track page view
   */
  async trackPageView(page: string, referrer?: string): Promise<void> {
    await this.trackEvent('page_view', {
      page,
      referrer: referrer || document.referrer,
      url: window.location.href,
    });
  }

  /**
   * Track product view
   */
  async trackProductView(productId: string, productName: string, source?: string): Promise<void> {
    await this.trackEvent('product_view', {
      product_id: productId,
      product_name: productName,
      source,
    });
  }

  /**
   * Track shop view
   */
  async trackShopView(shopId: string, shopName: string, source?: string): Promise<void> {
    await this.trackEvent('shop_view', {
      shop_id: shopId,
      shop_name: shopName,
      source,
    });
  }

  /**
   * Track inquiry creation
   */
  async trackInquiryCreated(inquiryId: string, shopId: string, productName: string): Promise<void> {
    await this.trackEvent('inquiry_created', {
      inquiry_id: inquiryId,
      shop_id: shopId,
      product_name: productName,
    });
  }

  /**
   * Track favorite action
   */
  async trackFavoriteToggle(itemType: 'product' | 'shop', itemId: string, action: 'add' | 'remove'): Promise<void> {
    await this.trackEvent('favorite_toggle', {
      item_type: itemType,
      item_id: itemId,
      action,
    });
  }

  /**
   * Track message sent
   */
  async trackMessageSent(inquiryId: string, messageType: string): Promise<void> {
    await this.trackEvent('message_sent', {
      inquiry_id: inquiryId,
      message_type: messageType,
    });
  }

  /**
   * Track search
   */
  async trackSearch(query: string, resultsCount: number, filters?: Record<string, any>): Promise<void> {
    await this.trackEvent('search', {
      query,
      results_count: resultsCount,
      filters,
    });
  }

  /**
   * Track filter usage
   */
  async trackFilterApplied(filterType: string, filterValue: any): Promise<void> {
    await this.trackEvent('filter_applied', {
      filter_type: filterType,
      filter_value: filterValue,
    });
  }

  /**
   * Track error
   */
  async trackError(errorType: string, errorMessage: string, errorStack?: string): Promise<void> {
    await this.trackEvent('error', {
      error_type: errorType,
      error_message: errorMessage,
      error_stack: errorStack,
    });
  }

  /**
   * Track performance metric
   */
  async trackPerformance(metricName: string, value: number, unit: string): Promise<void> {
    await this.trackEvent('performance', {
      metric_name: metricName,
      value,
      unit,
    });
  }

  /**
   * Track referral code entry attempt
   */
  async trackReferralAttempt(referralCode: string, isValid: boolean, shopId?: string): Promise<void> {
    await this.trackEvent('referral_attempt', {
      referral_code: referralCode,
      is_valid: isValid,
      shop_id: shopId,
    });
  }

  /**
   * Track successful referral usage
   */
  async trackReferralUsed(customerId: string, referralCode: string, shopId: string, shopName: string): Promise<void> {
    await this.trackEvent('referral_used', {
      customer_id: customerId,
      referral_code: referralCode,
      referrer_shop_id: shopId,
      shop_name: shopName,
    });
  }

  /**
   * Track referral code validation
   */
  async trackReferralValidation(referralCode: string, success: boolean, errorReason?: string): Promise<void> {
    await this.trackEvent('referral_validation', {
      referral_code: referralCode,
      success,
      error_reason: errorReason,
    });
  }
}

export const analyticsService = new AnalyticsService();
