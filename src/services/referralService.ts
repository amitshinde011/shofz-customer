import { supabase } from '@/integrations/supabase/client';
import { analyticsService } from './analyticsService';

export interface ReferralData {
  shopId: string;
  referralCode: string;
}

export const referralService = {
  /**
   * Process customer referral after successful signup
   */
  async processCustomerReferral(customerId: string, referralCode: string): Promise<{ success: boolean; error?: string }> {
    if (!referralCode) {
      return { success: false, error: 'No referral code provided' };
    }

    try {
      console.log('[ReferralService] Processing customer referral:', { customerId, referralCode });

      // Check if user has already used a referral code
      const hasUsed = await this.hasUsedReferral(customerId);
      if (hasUsed) {
        console.log('[ReferralService] Customer has already used a referral code');
        return { success: false, error: 'You have already used a referral code' };
      }

      // Get referrer shop details
      const { data: referralData, error: fetchError } = await supabase
        .from('referral_codes' as any)
        .select('shop_id')
        .eq('referral_code', referralCode)
        .eq('is_active', true)
        .single();

      if (fetchError || !referralData) {
        console.error('[ReferralService] Failed to fetch referral code:', fetchError);
        return { success: false, error: 'Invalid referral code' };
      }

      const shopData = referralData as any;

      // Call the referral processing function
      const { data, error } = await supabase.rpc('process_referral_transaction' as any, {
        p_referrer_shop_id: shopData.shop_id,
        p_referred_entity_type: 'customer',
        p_referred_customer_id: customerId,
        p_referral_code: referralCode
      });

      if (error) {
        console.error('[ReferralService] Failed to process referral:', error);
        await analyticsService.trackReferralValidation(referralCode, false, error.message);
        return { success: false, error: error.message };
      }

      console.log('[ReferralService] Referral processed successfully:', data);
      
      // Track successful referral usage
      await analyticsService.trackReferralUsed(customerId, referralCode, shopData.shop_id, 'Unknown Shop');
      
      return { success: true };
    } catch (error) {
      console.error('[ReferralService] Exception during referral processing:', error);
      return { success: false, error: 'Failed to process referral' };
    }
  },

  /**
   * Check if user has already used a referral code
   */
  async hasUsedReferral(customerId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('referral_transactions' as any)
        .select('id')
        .eq('referred_customer_id', customerId)
        .limit(1);

      if (error) {
        console.error('[ReferralService] Error checking referral usage:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('[ReferralService] Exception checking referral usage:', error);
      return false;
    }
  },

  /**
   * Validate a referral code
   */
  async validateReferralCode(code: string): Promise<{ 
    valid: boolean; 
    shopName?: string; 
    shopLogo?: string; 
    shopRating?: number 
  }> {
    try {
      const { data, error } = await supabase
        .from('referral_codes' as any)
        .select(`
          referral_code,
          shop_id,
          shops(name, logo_url, rating)
        `)
        .eq('referral_code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        await analyticsService.trackReferralAttempt(code, false);
        return { valid: false };
      }

      const shop = (data as any).shops;
      const referralData = data as any;
      
      // Track successful validation
      await analyticsService.trackReferralAttempt(code, true, referralData.shop_id);
      
      return {
        valid: true,
        shopName: shop?.name,
        shopLogo: shop?.logo_url,
        shopRating: shop?.rating
      };
    } catch (error) {
      console.error('[ReferralService] Exception validating code:', error);
      await analyticsService.trackReferralValidation(code, false, 'Exception during validation');
      return { valid: false };
    }
  }
};
