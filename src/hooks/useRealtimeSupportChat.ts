import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getTicketMessages, sendMessage, type SendMessageData } from '@/services/supportService';
import type { Database } from '@/integrations/supabase/types';

type SupportMessage = Database['public']['Tables']['support_messages']['Row'];

export const useRealtimeSupportChat = (ticketId: string | null) => {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Load messages
  useEffect(() => {
    if (!ticketId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const data = await getTicketMessages(ticketId);
        setMessages(data);
      } catch (error) {
        console.error('Failed to load messages:', error);
        toast.error('Failed to load messages');
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [ticketId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`support_ticket_${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const newMessage = payload.new as SupportMessage;
          
          // Don't add if it's an internal note
          if (newMessage.is_internal_note) return;

          setMessages((prev) => {
            // Check if message already exists
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });

          // Show notification if message is from support (not current user)
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user && newMessage.sender_id !== user.id) {
              toast.info('New message from Support Team');
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  // Send message
  const handleSendMessage = useCallback(
    async (message: string, attachments?: string[]) => {
      if (!ticketId || !message.trim()) return;

      setIsSending(true);
      try {
        const data: SendMessageData = {
          ticketId,
          message: message.trim(),
          attachments,
        };

        await sendMessage(data);
        // Message will be added via real-time subscription
      } catch (error) {
        console.error('Failed to send message:', error);
        toast.error('Failed to send message. Please try again.');
      } finally {
        setIsSending(false);
      }
    },
    [ticketId]
  );

  return {
    messages,
    isLoading,
    isSending,
    sendMessage: handleSendMessage,
  };
};
