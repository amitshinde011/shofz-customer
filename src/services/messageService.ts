import { supabase } from '@/integrations/supabase/client';

export interface Message {
  id: string;
  inquiry_id: string;
  sender_id: string;
  message_text?: string;
  message_type: 'text' | 'image' | 'system';
  attachments?: any;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    name?: string;
    phone_number: string;
    role: string;
  };
}

export const messageService = {
  // Send message
  async sendMessage(messageData: {
    inquiry_id: string;
    message_text?: string;
    message_type?: 'text' | 'image' | 'system';
    attachments?: any;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    return await (supabase as any)
      .from('messages')
      .insert([{
        sender_id: user.id,
        message_type: 'text',
        ...messageData,
      }])
      .select(`
        *,
        users!messages_sender_id_fkey (
          id,
          name,
          phone_number,
          role
        )
      `)
      .single();
  },

  // Get messages for inquiry
  async getInquiryMessages(inquiryId: string, options?: {
    limit?: number;
    offset?: number;
    before?: string;
  }) {
    let query = (supabase as any)
      .from('messages')
      .select(`
        *,
        users!messages_sender_id_fkey (
          id,
          name,
          phone_number,
          role
        )
      `)
      .eq('inquiry_id', inquiryId)
      .order('created_at', { ascending: true });

    if (options?.before) {
      query = query.lt('created_at', options.before);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    return await query;
  },

  // Mark messages as read
  async markMessagesAsRead(inquiryId: string, userId: string) {
    return await (supabase as any)
      .from('messages')
      .update({ is_read: true })
      .eq('inquiry_id', inquiryId)
      .neq('sender_id', userId)
      .eq('is_read', false);
  },

  // Get unread message count for user
  async getUnreadMessageCount(userId: string) {
    // Get all inquiries where user is either customer or shop owner
    const { data: inquiries, error: inquiryError } = await (supabase as any)
      .from('inquiries')
      .select(`
        id,
        customer_id,
        shops!inner (
          owner_id
        )
      `)
      .or(`customer_id.eq.${userId},shops.owner_id.eq.${userId}`);

    if (inquiryError) return { data: 0, error: inquiryError };

    const inquiryIds = inquiries.map((i: any) => i.id);
    
    if (inquiryIds.length === 0) {
      return { data: 0, error: null };
    }

    const { count, error } = await (supabase as any)
      .from('messages')
      .select('id', { count: 'exact' })
      .in('inquiry_id', inquiryIds)
      .neq('sender_id', userId)
      .eq('is_read', false);

    return { data: count || 0, error };
  },

  // Get recent conversations for user
  async getRecentConversations(userId: string, limit: number = 10) {
    // Get inquiries with latest message
    const { data, error } = await (supabase as any)
      .rpc('get_recent_conversations', {
        user_id: userId,
        conversation_limit: limit
      });

    return { data, error };
  },

  // Subscribe to new messages for inquiry
  subscribeToInquiryMessages(inquiryId: string, callback: (message: Message) => void) {
    const subscription = supabase
      .channel(`messages-${inquiryId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `inquiry_id=eq.${inquiryId}`,
        },
        async (payload) => {
          // Fetch the complete message with sender info
          const { data } = await (supabase as any)
            .from('messages')
            .select(`
              *,
              users!messages_sender_id_fkey (
                id,
                name,
                phone_number,
                role
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback(data);
          }
        }
      )
      .subscribe();

    return subscription;
  },

  // Unsubscribe from messages
  unsubscribeFromMessages(subscription: any) {
    supabase.removeChannel(subscription);
  },

  // Send system message
  async sendSystemMessage(inquiryId: string, message: string) {
    return await (supabase as any)
      .from('messages')
      .insert([{
        inquiry_id: inquiryId,
        sender_id: '00000000-0000-0000-0000-000000000000', // System user ID
        message_text: message,
        message_type: 'system',
      }]);
  },
};