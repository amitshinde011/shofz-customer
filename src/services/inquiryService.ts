import { supabase } from '@/integrations/supabase/client';

export interface Inquiry {
  id: string;
  customer_id: string;
  shop_id: string;
  product_name: string;
  description?: string;
  quantity: number;
  budget_min?: number;
  budget_max?: number;
  image_url?: string;
  attachment_urls?: string[];
  preferred_contact: 'chat' | 'call' | 'both';
  status: 'pending' | 'in_progress' | 'rejected' | 'completed' | 'expired';
  expires_at?: string;
  created_at: string;
  updated_at: string;
  shops?: {
    id: string;
    name: string;
    address?: string;
    phone_number?: string;
    logo_url?: string;
    accepts_online_payments?: boolean;
    preferred_payment_methods?: string[];
  };
  users?: {
    id: string;
    name?: string;
    phone_number: string;
  };
}

export const getDisplayStatus = (status: Inquiry['status']): 'pending' | 'in progress' | 'completed' | 'expired' => {
  return status as any;
};

export const inquiryService = {
  // Create new inquiry
  async createInquiry(inquiryData: {
    shop_id: string;
    product_name: string;
    description?: string;
    quantity?: number;
    budget_min?: number;
    budget_max?: number;
    image_url?: string;
    attachment_urls?: string[];
    preferred_contact?: 'chat' | 'call' | 'both';
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expire in 7 days

    // Create the main inquiry record
    const { data: inquiry, error: inquiryError } = await (supabase as any)
      .from('inquiries')
      .insert([{
        customer_id: user.id,
        expires_at: expiresAt.toISOString(),
        ...inquiryData,
      }])
      .select(`
        *,
        shops (
          id,
          name,
          address,
          phone_number,
          logo_url
        )
      `)
      .single();

    if (inquiryError) {
      return { data: null, error: inquiryError };
    }

    return { data: inquiry, error: null };
  },

  // Get user's inquiries
  async getUserInquiries(userId: string, options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = (supabase as any)
      .from('inquiries')
      .select(`
        *,
        shops (
          id,
          name,
          address,
          phone_number,
          logo_url,
          accepts_online_payments,
          preferred_payment_methods
        )
      `)
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    return await query;
  },

  // Get inquiry by ID
  async getInquiryById(id: string) {
    return await (supabase as any)
      .from('inquiries')
      .select(`
        *,
        shops (
          id,
          name,
          address,
          phone_number,
          logo_url,
          owner_id,
          accepts_online_payments,
          preferred_payment_methods,
          payment_upi_id,
          payment_phone_number,
          payment_qr_code_url,
          payment_instructions
        ),
        users (
          id,
          name,
          phone_number
        )
      `)
      .eq('id', id)
      .single();
  },

  // Update inquiry status
  async updateInquiryStatus(id: string, status: 'pending' | 'in_progress' | 'rejected' | 'completed' | 'expired') {
    return await (supabase as any)
      .from('inquiries')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
  },

  // Get shop inquiries (for shop owners)
  async getShopInquiries(shopId: string, options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = (supabase as any)
      .from('inquiries')
      .select(`
        *,
        users (
          id,
          name,
          phone_number
        )
      `)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    return await query;
  },

  // Mark inquiries as expired (batch job)
  async markExpiredInquiries() {
    return await (supabase as any)
      .from('inquiries')
      .update({ status: 'expired' })
      .lt('expires_at', new Date().toISOString())
      .neq('status', 'expired');
  },

  // Delete inquiry
  async deleteInquiry(id: string) {
    return await (supabase as any)
      .from('inquiries')
      .delete()
      .eq('id', id);
  },

  // Get inquiry statistics for user
  async getInquiryStats(userId: string) {
    const { data, error } = await (supabase as any)
      .from('inquiries')
      .select('status')
      .eq('customer_id', userId);

    if (error) return { data: null, error };

    const stats = {
      total: data.length,
      pending: data.filter((i: any) => i.status === 'pending').length,
      in_progress: data.filter((i: any) => i.status === 'in_progress').length,
      completed: data.filter((i: any) => i.status === 'completed').length,
      expired: data.filter((i: any) => i.status === 'expired').length,
    };

    return { data: stats, error: null };
  },

  // Add attachment to inquiry
  async addAttachmentToInquiry(inquiryId: string, attachmentPath: string) {
    try {
      const { data: inquiry, error: fetchError } = await supabase
        .from('inquiries')
        .select('attachment_urls')
        .eq('id', inquiryId)
        .single();

      if (fetchError) {
        return { data: null, error: fetchError };
      }

      const currentAttachments = inquiry?.attachment_urls || [];

      const { data, error } = await supabase
        .from('inquiries')
        .update({ 
          attachment_urls: [...currentAttachments, attachmentPath]
        })
        .eq('id', inquiryId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('Error adding attachment:', error);
      return { data: null, error };
    }
  },

  // Remove attachment from inquiry
  async removeAttachmentFromInquiry(inquiryId: string, attachmentPath: string) {
    try {
      const { data: inquiry, error: fetchError } = await supabase
        .from('inquiries')
        .select('attachment_urls')
        .eq('id', inquiryId)
        .single();

      if (fetchError) {
        return { data: null, error: fetchError };
      }

      const updatedAttachments = (inquiry?.attachment_urls || [])
        .filter(path => path !== attachmentPath);

      const { data, error } = await supabase
        .from('inquiries')
        .update({ attachment_urls: updatedAttachments })
        .eq('id', inquiryId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('Error removing attachment:', error);
      return { data: null, error };
    }
  },
};