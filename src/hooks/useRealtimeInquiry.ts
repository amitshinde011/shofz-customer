import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useInquiry } from './useInquiries';
import { useToast } from './use-toast';

interface UseRealtimeInquiryOptions {
  inquiryId: string;
  enabled?: boolean;
}

export const useRealtimeInquiry = ({ inquiryId, enabled = true }: UseRealtimeInquiryOptions) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  
  // Initial fetch using existing hook
  const { data: inquiryResponse, isLoading, error } = useInquiry(inquiryId);
  const inquiry = inquiryResponse?.data;

  // Track previous status for comparison
  useEffect(() => {
    if (inquiry?.status && previousStatus === null) {
      setPreviousStatus(inquiry.status);
    }
  }, [inquiry?.status, previousStatus]);

  // Real-time subscription
  useEffect(() => {
    if (!inquiryId || !enabled) return;

    console.log('[Real-time Inquiry] Setting up subscription for:', inquiryId);

    const channel = supabase
      .channel(`inquiry-${inquiryId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inquiries',
          filter: `id=eq.${inquiryId}`
        },
        (payload) => {
          console.log('[Real-time Inquiry] Update received:', payload);
          
          const oldStatus = payload.old?.status;
          const newStatus = payload.new?.status;
          
          // Invalidate and refetch inquiry data
          queryClient.invalidateQueries({ queryKey: ['inquiry', inquiryId] });
          
          // Show toast notification if status changed
          if (oldStatus && newStatus && oldStatus !== newStatus) {
            const statusMessages: Record<string, string> = {
              'pending': 'Inquiry sent to shop',
              'in_progress': 'Shop has responded to your inquiry',
              'completed': 'Inquiry completed',
              'expired': 'Inquiry expired'
            };

            toast({
              title: "Inquiry Status Updated",
              description: statusMessages[newStatus] || `Status changed to ${newStatus}`,
              duration: 5000,
            });

            setPreviousStatus(newStatus);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Real-time Inquiry] Subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'CHANNEL_ERROR') {
          toast({
            title: "Connection Error",
            description: "Failed to connect to real-time updates",
            variant: "destructive",
          });
        }
      });

    return () => {
      console.log('[Real-time Inquiry] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [inquiryId, enabled, queryClient, toast]);

  return {
    inquiry,
    isLoading,
    error,
    isConnected,
  };
};
