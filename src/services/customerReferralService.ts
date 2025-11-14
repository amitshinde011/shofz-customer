import { supabase } from '@/integrations/supabase/client';

export interface CustomerReferralData {
  referral_code: string;
  upi_id: string | null;
  total_referral_earnings: number;
  updated_at: string;
}

export interface ReferralStats {
  total_shops_referred: number;
  verified_shops: number;
  pending_verification: number;
  total_earnings: number;
  pending_earnings: number;
  approved_earnings: number;
}

export interface ReferralEarning {
  id: string;
  shop_id: string;
  shop_name: string;
  shop_logo_url: string | null;
  referral_code: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid';
  created_at: string;
  shop_verified_at: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  notes: string | null;
}

export const customerReferralService = {
  /**
   * Generate a unique referral code for a customer
   */
  async generateReferralCode(customerId: string): Promise<{ code: string; error?: string }> {
    try {
      console.log('[CustomerReferralService] Generating referral code for customer:', customerId);

      // Check if code already exists (client-side optimization)
      const existing = await this.getCustomerReferralData(customerId);
      if (existing?.referral_code) {
        console.log('[CustomerReferralService] Code already exists:', existing.referral_code);
        return { code: existing.referral_code };
      }

      // Call RPC (now idempotent and persists to DB)
      const { data, error } = await supabase.rpc('generate_customer_referral_code' as any, {
        p_customer_id: customerId
      });

      if (error) {
        console.error('[CustomerReferralService] Error generating code:', error);
        return { code: '', error: error.message };
      }

      console.log('[CustomerReferralService] Code generated and saved:', data);
      return { code: String(data) };
    } catch (error: any) {
      console.error('[CustomerReferralService] Exception generating code:', error);
      return { code: '', error: error.message || 'Failed to generate referral code' };
    }
  },

  /**
   * Get customer referral data (code, UPI ID, earnings)
   */
  async getCustomerReferralData(customerId: string): Promise<CustomerReferralData | null> {
    try {
      console.log('[CustomerReferralService] Fetching referral data for customer:', customerId);

      const { data, error } = await (supabase
        .from('customer_profiles') as any)
        .select('referral_code, upi_id, total_referral_earnings, updated_at')
        .eq('user_id', customerId)
        .single();

      if (error) {
        console.error('[CustomerReferralService] Error fetching data:', error);
        return null;
      }

      return {
        referral_code: data?.referral_code || '',
        upi_id: data?.upi_id,
        total_referral_earnings: data?.total_referral_earnings || 0,
        updated_at: data?.updated_at
      };
    } catch (error) {
      console.error('[CustomerReferralService] Exception fetching data:', error);
      return null;
    }
  },

  /**
   * Get customer referral statistics
   */
  async getCustomerReferralStats(customerId: string): Promise<ReferralStats | null> {
    try {
      console.log('[CustomerReferralService] Fetching referral stats for customer:', customerId);

      const { data, error } = await supabase.rpc('get_customer_referral_stats' as any, {
        p_customer_id: customerId
      });

      if (error) {
        console.error('[CustomerReferralService] Error fetching stats:', error);
        return null;
      }

      return data as ReferralStats;
    } catch (error) {
      console.error('[CustomerReferralService] Exception fetching stats:', error);
      return null;
    }
  },

  /**
   * Update customer's UPI ID
   */
  async updateUpiId(customerId: string, upiId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[CustomerReferralService] Updating UPI ID for customer:', customerId);

      const { error } = await (supabase
        .from('customer_profiles') as any)
        .update({ upi_id: upiId })
        .eq('user_id', customerId);

      if (error) {
        console.error('[CustomerReferralService] Error updating UPI ID:', error);
        return { success: false, error: error.message };
      }

      console.log('[CustomerReferralService] UPI ID updated successfully');
      return { success: true };
    } catch (error: any) {
      console.error('[CustomerReferralService] Exception updating UPI ID:', error);
      return { success: false, error: error.message || 'Failed to update UPI ID' };
    }
  },

  /**
   * Get customer's referral history
   */
  async getReferralHistory(customerId: string): Promise<ReferralEarning[]> {
    try {
      console.log('[CustomerReferralService] Fetching referral history for customer:', customerId);

      const { data, error }: any = await supabase
        .from('customer_referral_earnings' as any)
        .select(`
          id,
          shop_id,
          referral_code,
          amount,
          status,
          created_at,
          shop_verified_at,
          paid_at,
          payment_reference,
          notes,
          shops(name, logo_url)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[CustomerReferralService] Error fetching history:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        shop_id: item.shop_id,
        shop_name: item.shops?.name || 'Unknown Shop',
        shop_logo_url: item.shops?.logo_url,
        referral_code: item.referral_code,
        amount: item.amount,
        status: item.status,
        created_at: item.created_at,
        shop_verified_at: item.shop_verified_at,
        paid_at: item.paid_at,
        payment_reference: item.payment_reference,
        notes: item.notes
      }));
    } catch (error) {
      console.error('[CustomerReferralService] Exception fetching history:', error);
      return [];
    }
  },

  /**
   * Get recent referral history (limited)
   */
  async getRecentReferrals(customerId: string, limit: number = 3): Promise<ReferralEarning[]> {
    try {
      const { data, error }: any = await supabase
        .from('customer_referral_earnings')
        .select(`
          id, shop_id, referral_code, amount, status,
          created_at, shop_verified_at, paid_at,
          payment_reference, notes,
          shops(name, logo_url)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) return [];

      return (data || []).map((item: any) => ({
        id: item.id,
        shop_id: item.shop_id,
        shop_name: item.shops?.name || 'Unknown Shop',
        shop_logo_url: item.shops?.logo_url,
        referral_code: item.referral_code,
        amount: item.amount,
        status: item.status,
        created_at: item.created_at,
        shop_verified_at: item.shop_verified_at,
        paid_at: item.paid_at,
        payment_reference: item.payment_reference,
        notes: item.notes
      }));
    } catch (error) {
      return [];
    }
  },

  /**
   * Validate UPI ID format
   */
  validateUpiId(upiId: string): { valid: boolean; error?: string } {
    if (!upiId || upiId.trim() === '') {
      return { valid: false, error: 'UPI ID is required' };
    }

    const trimmedUpiId = upiId.trim();

    // Basic UPI ID format: user@bank
    const upiRegex = /^[a-zA-Z0-9._-]{4,}@[a-zA-Z]{3,}$/;

    if (!upiRegex.test(trimmedUpiId)) {
      return { valid: false, error: 'Invalid UPI ID format (e.g., username@paytm)' };
    }

    // Check minimum length before @
    const [username] = trimmedUpiId.split('@');
    if (username.length < 4) {
      return { valid: false, error: 'Username must be at least 4 characters' };
    }

    return { valid: true };
  }
};
