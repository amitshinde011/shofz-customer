import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RealtimeNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  related_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface InquiryStatusUpdate {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'expired';
  updated_at: string;
  shop_name?: string;
  product_name?: string;
}

interface UseRealtimeNotificationsProps {
  userId?: string;
}

export function useRealtimeNotifications({ userId }: UseRealtimeNotificationsProps) {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  
  const channelRef = useRef<any>(null);

  // Load initial notifications
  const loadNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      setNotifications((data as any) || []);
      setUnreadCount((data as any)?.filter((n: any) => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [userId]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [userId]);

  // Clear old notifications
  const clearOldNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      // Delete notifications older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { error } = await (supabase as any)
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (error) {
        console.error('Error clearing old notifications:', error);
      }
    } catch (error) {
      console.error('Error clearing old notifications:', error);
    }
  }, [userId]);

  // Setup real-time connection
  const setupRealtimeConnection = useCallback(() => {
    if (!userId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    console.log('Setting up notification realtime connection for user:', userId);
    
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('New notification received:', payload);
          const newNotification = payload.new as RealtimeNotification;
          
          setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep only last 50
          setUnreadCount(prev => prev + 1);

          // Show toast notification
          toast({
            title: newNotification.title,
            description: newNotification.message,
          });

          // Show browser notification if permitted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: '/favicon.ico',
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inquiries',
          filter: `customer_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Inquiry status update:', payload);
          // Handle inquiry updates separately if needed
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inquiries',
          filter: `customer_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Inquiry updated:', payload);
          const oldInquiry = payload.old as any;
          const newInquiry = payload.new as any;
          
          // Check if status changed
          if (oldInquiry.status !== newInquiry.status) {
            const statusMessages = {
              pending: 'Your inquiry is being processed',
              responded: 'You have a new response to your inquiry',
              completed: 'Your inquiry has been completed',
              expired: 'Your inquiry has expired',
            };

            toast({
              title: "Inquiry Update",
              description: `${newInquiry.product_name}: ${statusMessages[newInquiry.status as keyof typeof statusMessages]}`,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Notification realtime status:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          // Auto-reconnect after 5 seconds
          setTimeout(() => {
            setupRealtimeConnection();
          }, 5000);
        }
      });

    channelRef.current = channel;
  }, [userId, toast]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  // Initialize
  useEffect(() => {
    if (userId) {
      loadNotifications();
      setupRealtimeConnection();
      clearOldNotifications();
      requestNotificationPermission();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, loadNotifications, setupRealtimeConnection, clearOldNotifications, requestNotificationPermission]);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    requestNotificationPermission,
    reload: loadNotifications,
  };
}