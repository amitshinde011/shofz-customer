import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getTicketMessages, sendMessage, type SendMessageData } from '@/services/supportService';
import type { Database } from '@/integrations/supabase/types';
import { playNotificationSound, initializeSoundNotifications } from '@/lib/soundNotifications';

type SupportMessage = Database['public']['Tables']['support_messages']['Row'];

export interface SupportTypingStatus {
  user_id: string;
  ticket_id: string;
  is_typing: boolean;
  user_role: 'customer' | 'support';
  last_activity: string;
}

export const useRealtimeSupportChat = (ticketId: string | null) => {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<SupportTypingStatus[]>([]);
  const [presenceData, setPresenceData] = useState<any[]>([]);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const isTypingRef = useRef(false);

  // Initialize sound notifications
  useEffect(() => {
    initializeSoundNotifications();
  }, []);

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

  // Typing indicator functions
  const sendTypingIndicator = useCallback(async (isTyping: boolean) => {
    if (!ticketId) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const channel = supabase.channel(`support_ticket_${ticketId}`);
    
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: user.id,
        ticket_id: ticketId,
        is_typing: isTyping,
        user_role: 'customer',
        last_activity: new Date().toISOString(),
      },
    });
  }, [ticketId]);

  const startTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTypingIndicator(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [sendTypingIndicator]);

  const stopTyping = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTypingIndicator(false);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [sendTypingIndicator]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!ticketId) return;

    let currentUserId: string | null = null;

    const setupChannel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id || null;

      const channel = supabase
        .channel(`support_ticket_${ticketId}`)
        // New messages
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

            // Show notification and play sound if message is from support
            if (currentUserId && newMessage.sender_id !== currentUserId) {
              playNotificationSound('medium');
              toast.info('New message from Support Team');

              // Browser notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('New Support Message', {
                  body: newMessage.message.substring(0, 100),
                  icon: '/shofz-logo.png',
                  tag: `support-message-${newMessage.id}`,
                });
              }
            }
          }
        )
        // Ticket status updates
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'support_tickets',
            filter: `id=eq.${ticketId}`,
          },
          (payload) => {
            const oldStatus = (payload.old as any)?.status;
            const newStatus = (payload.new as any)?.status;
            
            if (oldStatus && newStatus && oldStatus !== newStatus) {
              toast.info(`Ticket status changed to ${newStatus}`);
            }
          }
        )
        // Typing indicators
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          if (payload.user_id === currentUserId) return;

          setTypingUsers((prev) => {
            const filtered = prev.filter((u) => u.user_id !== payload.user_id);
            
            if (payload.is_typing) {
              return [...filtered, payload as SupportTypingStatus];
            }
            
            return filtered;
          });

          // Auto-remove typing after 5 seconds
          setTimeout(() => {
            setTypingUsers((prev) => 
              prev.filter((u) => u.user_id !== payload.user_id)
            );
          }, 5000);
        })
        // Presence tracking
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          setPresenceData(Object.values(presenceState).flat());
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && currentUserId) {
            // Track presence
            await channel.track({
              user_id: currentUserId,
              ticket_id: ticketId,
              online_at: new Date().toISOString(),
              user_role: 'customer',
            });
          }
        });

      return channel;
    };

    const channelPromise = setupChannel();

    return () => {
      channelPromise.then((channel) => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
      
      // Cleanup typing indicator
      stopTyping();
    };
  }, [ticketId, stopTyping]);

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
    typingUsers,
    presenceData,
    startTyping,
    stopTyping,
  };
};
