import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseMessage, isQuoteMessage, isPaymentRequestMessage } from '@/lib/messageParser';
import { playNotificationSound, initializeSoundNotifications } from '@/lib/soundNotifications';

export interface ChatMessage {
  id: string;
  inquiry_id: string;
  sender_id: string;
  message_text: string;
  message_type: 'text' | 'image' | 'file' | 'quote' | 'payment_request';
  is_read: boolean;
  created_at: string;
  attachments?: any[];
}

export interface TypingStatus {
  user_id: string;
  inquiry_id: string;
  is_typing: boolean;
  last_activity: string;
}

interface UseRealtimeChatProps {
  inquiryId: string;
  userId?: string;
}

export function useRealtimeChat({ inquiryId, userId }: UseRealtimeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const { toast } = useToast();
  
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const isTypingRef = useRef(false);

  // Load initial messages
  const loadMessages = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('messages')
        .select('*')
        .eq('inquiry_id', inquiryId)
        .order('created_at', { ascending: true});

      if (error) {
        console.error('Error loading messages:', error);
        toast({
          title: "Error",
          description: "Failed to load chat messages",
          variant: "destructive",
        });
        return;
      }

      setMessages((data || []).map((msg: any) => ({
        ...msg,
        attachments: Array.isArray(msg.attachments) ? msg.attachments : []
      })) as ChatMessage[]);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [inquiryId, toast]);

  // Send message with optimistic update
  const sendMessage = useCallback(async (messageText: string, messageType: 'text' | 'image' | 'file' | 'quote' = 'text', attachments?: any[]) => {
    if (!userId || !messageText.trim()) return false;

    // Create optimistic message
    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      inquiry_id: inquiryId,
      sender_id: userId,
      message_text: messageText,
      message_type: messageType,
      attachments: attachments || [],
      is_read: false,
      created_at: new Date().toISOString(),
    };

    // Optimistically add message
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const { data, error } = await (supabase as any)
        .from('messages')
        .insert({
          inquiry_id: inquiryId,
          sender_id: userId,
          message_text: messageText,
          message_type: messageType,
          attachments: attachments || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
        });
        return false;
      }

      // Replace optimistic message with real one
      setMessages(prev => prev.map(msg => 
        msg.id === optimisticMessage.id ? {
          ...data,
          attachments: Array.isArray(data.attachments) ? data.attachments : []
        } as ChatMessage : msg
      ));

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      
      return false;
    }
  }, [inquiryId, userId, toast]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!channelRef.current || !userId) return;

    const payload = {
      user_id: userId,
      inquiry_id: inquiryId,
      is_typing: isTyping,
      last_activity: new Date().toISOString(),
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload,
    });

    isTypingRef.current = isTyping;
  }, [inquiryId, userId]);

  // Handle typing start
  const startTyping = useCallback(() => {
    if (isTypingRef.current) return;
    
    sendTypingIndicator(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 3000);
  }, [sendTypingIndicator]);

  // Handle typing stop
  const stopTyping = useCallback(() => {
    if (!isTypingRef.current) return;
    
    sendTypingIndicator(false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [sendTypingIndicator]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      await (supabase as any)
        .from('messages')
        .update({ is_read: true })
        .eq('inquiry_id', inquiryId)
        .neq('sender_id', userId)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [inquiryId, userId]);

  // Setup real-time connection
  const setupRealtimeConnection = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    console.log('Setting up realtime connection for inquiry:', inquiryId);
    
    const channel = supabase
      .channel(`inquiry_${inquiryId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `inquiry_id=eq.${inquiryId}`,
        },
        (payload) => {
          console.log('New message received:', payload);
          const newMessage = payload.new as ChatMessage;
          
          // Parse message to check if it's special
          const parsed = parseMessage(newMessage.message_text || '');
          
          // Only play sound and show notifications for messages from others
          if (userId && newMessage.sender_id !== userId) {
            if (isPaymentRequestMessage(parsed)) {
              playNotificationSound('high', 'payment');
              toast({
                title: "💰 Payment Request Received",
                description: `₹${parsed.data.amount.toLocaleString('en-IN')}`,
              });
              
              // Browser notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Payment Request', {
                  body: `Amount: ₹${parsed.data.amount.toLocaleString('en-IN')}`,
                  icon: '/shofz-logo.png',
                  tag: `inquiry-payment-${newMessage.id}`,
                });
              }
            } else if (isQuoteMessage(parsed)) {
              playNotificationSound('medium', 'inquiry');
              toast({
                title: "💼 New Quote Received",
                description: `₹${parsed.data.quoted_price.toLocaleString('en-IN')}`,
              });
              
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('New Quote', {
                  body: `Price: ₹${parsed.data.quoted_price.toLocaleString('en-IN')}`,
                  icon: '/shofz-logo.png',
                  tag: `inquiry-quote-${newMessage.id}`,
                });
              }
            } else {
              playNotificationSound('medium', 'inquiry');
              
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('New Inquiry Message', {
                  body: newMessage.message_text?.substring(0, 100) || 'New message',
                  icon: '/shofz-logo.png',
                  tag: `inquiry-message-${newMessage.id}`,
                });
              }
            }
          }
          
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `inquiry_id=eq.${inquiryId}`,
        },
        (payload) => {
          console.log('Message updated:', payload);
          const updatedMessage = payload.new as ChatMessage;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            )
          );
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        console.log('Typing indicator received:', payload);
        const typingData = payload.payload as TypingStatus;
        
        // Don't show own typing indicator
        if (typingData.user_id === userId) return;

        setTypingUsers(prev => {
          const filtered = prev.filter(user => user.user_id !== typingData.user_id);
          
          if (typingData.is_typing) {
            return [...filtered, typingData];
          }
          
          return filtered;
        });

        // Auto-remove typing indicator after 5 seconds
        setTimeout(() => {
          setTypingUsers(prev => 
            prev.filter(user => user.user_id !== typingData.user_id)
          );
        }, 5000);
      })
      .subscribe((status) => {
        console.log('Realtime connection status:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setIsReconnecting(false);
          toast({
            title: "Connected",
            description: "Real-time chat is now active",
          });
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          handleReconnection();
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          handleReconnection();
        }
      });

    channelRef.current = channel;
  }, [inquiryId, userId, toast]);

  // Handle reconnection
  const handleReconnection = useCallback(() => {
    if (isReconnecting) return;
    
    setIsReconnecting(true);
    console.log('Attempting to reconnect...');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      setupRealtimeConnection();
    }, 2000);
  }, [isReconnecting, setupRealtimeConnection]);

  // Initialize
  useEffect(() => {
    initializeSoundNotifications();
    loadMessages();
    setupRealtimeConnection();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [loadMessages, setupRealtimeConnection]);

  // Auto-mark messages as read when component is focused
  useEffect(() => {
    const handleFocus = () => {
      markMessagesAsRead();
    };

    window.addEventListener('focus', handleFocus);
    markMessagesAsRead(); // Mark as read initially

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [markMessagesAsRead]);

  return {
    messages,
    typingUsers,
    isConnected,
    isReconnecting,
    sendMessage,
    startTyping,
    stopTyping,
    markMessagesAsRead,
    reconnect: setupRealtimeConnection,
  };
}