import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  Shield, 
  Package,
  ExternalLink 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { playNotificationSound, initializeSoundNotifications } from '@/lib/soundNotifications';

interface PaymentStatusTrackerProps {
  paymentRequestId: string;
}

interface TimelineEvent {
  status: string;
  timestamp: string;
  icon: any;
  color: string;
  title: string;
  description: string;
}

export function PaymentStatusTracker({ paymentRequestId }: PaymentStatusTrackerProps) {
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeSoundNotifications();
    loadPaymentRequest();

    const channel = supabase
      .channel(`payment_tracking_${paymentRequestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_requests',
          filter: `id=eq.${paymentRequestId}`
        },
        (payload) => {
          const oldRequest = payload.old as any;
          const newRequest = payload.new as any;

          if (oldRequest.request_status !== newRequest.request_status) {
            playNotificationSound('high', 'payment');
            
            const statusMessages: Record<string, string> = {
              pending: '⏳ Payment pending',
              customer_claimed_success: '✅ Payment claimed by customer',
              shop_confirmed: '🎉 Payment confirmed by shop',
              verified: '🎉 Payment verified',
              disputed: '⚠️ Payment disputed',
              refunded: '↩️ Payment refunded'
            };

            const { toast } = useToast();
            toast({
              title: "Payment Status Updated",
              description: statusMessages[newRequest.request_status] || `Status: ${newRequest.request_status}`,
            });
            
            // Browser notification for critical statuses
            if (['customer_claimed_success', 'shop_confirmed', 'verified', 'disputed', 'refunded'].includes(newRequest.request_status)) {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Payment Update', {
                  body: statusMessages[newRequest.request_status],
                  icon: '/shofz-logo.png',
                  tag: `payment-${newRequest.id}`,
                });
              }
            }
          }

          setPaymentRequest(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [paymentRequestId]);

  const loadPaymentRequest = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('payment_requests')
        .select('*')
        .eq('id', paymentRequestId)
        .single();

      if (error) throw error;
      setPaymentRequest(data);
    } catch (error) {
      console.error('Error loading payment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !paymentRequest) {
    return <div>Loading...</div>;
  }

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      'initiated': { color: 'bg-blue-500', label: 'Initiated' },
      'customer_claimed_success': { color: 'bg-yellow-500', label: 'Awaiting Confirmation' },
      'shop_confirmed': { color: 'bg-green-500', label: 'Confirmed' },
      'verified': { color: 'bg-green-600', label: 'Verified' },
      'disputed': { color: 'bg-red-500', label: 'Disputed' },
      'refunded': { color: 'bg-gray-500', label: 'Refunded' }
    };
    return statusMap[status] || { color: 'bg-gray-500', label: status };
  };

  const timeline: TimelineEvent[] = [
    {
      status: 'initiated',
      timestamp: paymentRequest.payment_initiated_at || paymentRequest.created_at,
      icon: CreditCard,
      color: 'text-blue-500',
      title: 'Payment Initiated',
      description: `₹${paymentRequest.amount.toLocaleString('en-IN')} via ${paymentRequest.payment_method || 'UPI'}`
    }
  ];

  if (paymentRequest.customer_confirmed_at) {
    timeline.push({
      status: 'customer_claimed_success',
      timestamp: paymentRequest.customer_confirmed_at,
      icon: CheckCircle2,
      color: 'text-yellow-500',
      title: 'Customer Confirmed',
      description: paymentRequest.transaction_id 
        ? `Transaction ID: ${paymentRequest.transaction_id}`
        : 'Awaiting shop verification'
    });
  }

  if (paymentRequest.shop_confirmed_at) {
    timeline.push({
      status: 'shop_confirmed',
      timestamp: paymentRequest.shop_confirmed_at,
      icon: Package,
      color: 'text-green-500',
      title: 'Shop Confirmed',
      description: paymentRequest.shop_confirmation === 'received' 
        ? 'Payment received by shop'
        : 'Shop did not receive payment'
    });
  }

  if (paymentRequest.verified_at) {
    timeline.push({
      status: 'verified',
      timestamp: paymentRequest.verified_at,
      icon: Shield,
      color: 'text-green-600',
      title: 'Verified',
      description: 'Payment fully verified'
    });
  }

  if (paymentRequest.dispute_raised_at) {
    timeline.push({
      status: 'disputed',
      timestamp: paymentRequest.dispute_raised_at,
      icon: AlertCircle,
      color: 'text-red-500',
      title: 'Dispute Raised',
      description: 'Payment under dispute resolution'
    });
  }

  const statusInfo = getStatusInfo(paymentRequest.status);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle>Payment Status</CardTitle>
          <Badge className={statusInfo.color}>
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Amount Display */}
        <div className="bg-primary/5 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Amount</p>
          <p className="text-3xl font-bold text-primary">
            ₹{paymentRequest.amount.toLocaleString('en-IN')}
          </p>
        </div>

        {/* Verification Confidence */}
        {paymentRequest.verification_confidence !== undefined && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Verification Confidence</span>
              <span className="font-medium">{paymentRequest.verification_confidence}%</span>
            </div>
            <Progress value={paymentRequest.verification_confidence} className="h-2" />
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">Timeline</h4>
          {timeline.map((event, idx) => {
            const Icon = event.icon;
            const isLast = idx === timeline.length - 1;
            
            return (
              <div key={idx} className="flex space-x-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${event.color} bg-background`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {!isLast && <div className="w-0.5 flex-1 bg-border my-1" />}
                </div>
                <div className="flex-1 pb-4">
                  <p className="font-medium text-sm">{event.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Evidence Section */}
        {(paymentRequest.customer_screenshot_url || paymentRequest.shop_screenshot_url) && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="font-semibold text-sm">Evidence</h4>
            <div className="space-y-2">
              {paymentRequest.customer_screenshot_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => window.open(paymentRequest.customer_screenshot_url, '_blank')}
                >
                  <ExternalLink className="w-3 h-3 mr-2" />
                  Customer Screenshot
                </Button>
              )}
              {paymentRequest.shop_screenshot_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => window.open(paymentRequest.shop_screenshot_url, '_blank')}
                >
                  <ExternalLink className="w-3 h-3 mr-2" />
                  Shop Screenshot
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}