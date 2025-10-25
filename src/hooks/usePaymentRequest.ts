import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PaymentRequest {
  id: string;
  inquiry_id: string;
  shop_id: string;
  customer_id: string;
  amount: number;
  status: string;
  payment_method?: string;
  transaction_id?: string;
  transaction_ref?: string;
  upi_transaction_id?: string;
  customer_confirmation?: string;
  customer_confirmed_at?: string;
  customer_screenshot_url?: string;
  customer_notes?: string;
  shop_confirmation?: string;
  shop_confirmed_at?: string;
  shop_screenshot_url?: string;
  shop_notes?: string;
  verification_confidence?: number;
  verification_evidence?: any;
  verified_at?: string;
  verified_by?: string;
  payment_initiated_at?: string;
  payment_completed_at?: string;
  dispute_raised_at?: string;
  dispute_resolved_at?: string;
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
}

interface UsePaymentRequestProps {
  inquiryId: string;
}

export function usePaymentRequest({ inquiryId }: UsePaymentRequestProps) {
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!inquiryId) return;

    const loadPaymentRequest = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await (supabase as any)
          .from('payment_requests')
          .select('*')
          .eq('inquiry_id', inquiryId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setPaymentRequest(data as PaymentRequest);
      } catch (err) {
        console.error('Error loading payment request:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPaymentRequest();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`payment_request_${inquiryId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payment_requests',
          filter: `inquiry_id=eq.${inquiryId}`,
        },
        (payload) => {
          const newRequest = payload.new as PaymentRequest;
          setPaymentRequest(newRequest);
          
          toast({
            title: "Payment Request Received",
            description: `Shop requests ₹${newRequest.amount.toLocaleString('en-IN')}`,
          });

          // Play notification sound
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {});
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_requests',
          filter: `inquiry_id=eq.${inquiryId}`,
        },
        (payload) => {
          setPaymentRequest(payload.new as PaymentRequest);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inquiryId, toast]);

  const completePayment = async (upiTransactionId?: string, paymentApp?: string) => {
    if (!paymentRequest) return { success: false, error: 'No payment request found' };

    try {
      const { data, error } = await supabase.rpc('complete_payment_request', {
        p_payment_request_id: paymentRequest.id,
        p_upi_transaction_id: upiTransactionId,
        p_payment_app: paymentApp,
      });

      if (error) throw error;

      toast({
        title: "Payment Confirmed",
        description: "Your payment has been recorded successfully",
      });

      return { success: true, data };
    } catch (err) {
      console.error('Error completing payment:', err);
      toast({
        title: "Payment Error",
        description: "Failed to confirm payment. Please try again.",
        variant: "destructive",
      });
      return { success: false, error: err };
    }
  };

  const markAsViewed = async () => {
    if (!paymentRequest || paymentRequest.status !== 'sent') return;

    try {
      await (supabase as any)
        .from('payment_requests')
        .update({ 
          status: 'viewed',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRequest.id);
    } catch (err) {
      console.error('Error marking payment as viewed:', err);
    }
  };

  return {
    paymentRequest,
    isLoading,
    error,
    completePayment,
    markAsViewed,
  };
}