import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUnreadSupportMessages = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          setUnreadCount(0);
          setIsLoading(false);
          return;
        }

        const userId = userData.user.id;

        // Get user's tickets
        const { data: tickets } = await supabase
          .from('support_tickets')
          .select('id')
          .eq('user_id', userId);

        if (!tickets || tickets.length === 0) {
          setUnreadCount(0);
          setIsLoading(false);
          return;
        }

        // Count unread messages for each ticket
        let total = 0;
        
        for (const ticket of tickets) {
          // @ts-ignore - Supabase type inference depth issue
          const { count } = await supabase
            .from('support_messages')
            .select('*', { count: 'exact', head: true })
            .eq('ticket_id', ticket.id)
            .neq('sender_id', userId)
            .eq('is_read', false);

          if (count) {
            total += count;
          }
        }

        setUnreadCount(total);
      } catch (error) {
        console.error('Failed to load unread count:', error);
        setUnreadCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadUnreadCount();

    // Subscribe to new messages
    const channel = supabase
      .channel('unread_support_messages_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_messages',
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { unreadCount, isLoading };
};
