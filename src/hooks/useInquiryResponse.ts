import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface InquiryResponse {
  id: string;
  inquiry_id: string;
  shop_id: string;
  response_text: string;
  quoted_price: number;
  estimated_delivery_days?: number;
  payment_requested: boolean;
  payment_status: 'not_requested' | 'requested' | 'completed' | 'expired';
  payment_request_timestamp?: string;
  final_price?: number;
  created_at: string;
  updated_at: string;
}

interface UseInquiryResponseProps {
  inquiryId: string;
}

export function useInquiryResponse({ inquiryId }: UseInquiryResponseProps) {
  const [response, setResponse] = useState<InquiryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isNew, setIsNew] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!inquiryId) return;

    const loadResponse = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await (supabase as any)
          .from('inquiry_responses')
          .select('*')
          .eq('inquiry_id', inquiryId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setResponse(data as InquiryResponse);
          // Check if response is less than 1 minute old
          const responseAge = Date.now() - new Date(data.created_at).getTime();
          setIsNew(responseAge < 60000);
        }
      } catch (err) {
        console.error('Error loading inquiry response:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadResponse();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`inquiry_response_${inquiryId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inquiry_responses',
          filter: `inquiry_id=eq.${inquiryId}`,
        },
        (payload) => {
          const newResponse = payload.new as InquiryResponse;
          setResponse(newResponse);
          setIsNew(true);
          
          toast({
            title: "New Quote Received!",
            description: `Shop quoted ₹${newResponse.quoted_price.toLocaleString('en-IN')}`,
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
          table: 'inquiry_responses',
          filter: `inquiry_id=eq.${inquiryId}`,
        },
        (payload) => {
          setResponse(payload.new as InquiryResponse);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inquiryId, toast]);

  return {
    response,
    isLoading,
    error,
    isNew,
  };
}