import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, ExternalLink, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { uploadPaymentScreenshot } from '@/services/paymentService';
import { playNotificationSound, initializeSoundNotifications } from '@/lib/soundNotifications';

interface PendingPayment {
  id: string;
  inquiry_id: string;
  customer_id: string;
  amount: number;
  transaction_id?: string;
  customer_screenshot_url?: string;
  customer_notes?: string;
  customer_confirmed_at: string;
  verification_confidence: number;
  users?: {
    name?: string;
    phone_number?: string;
  };
  inquiries?: {
    product_name: string;
  };
}

interface ShopPaymentConfirmationProps {
  shopId: string;
}

export function ShopPaymentConfirmation({ shopId }: ShopPaymentConfirmationProps) {
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [shopNotes, setShopNotes] = useState<Record<string, string>>({});
  const [shopScreenshots, setShopScreenshots] = useState<Record<string, string>>({});

  useEffect(() => {
    initializeSoundNotifications();
    loadPendingPayments();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`shop_payments_${shopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_requests',
          filter: `shop_id=eq.${shopId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPayment = payload.new as any;
            
            // High priority for new payments
            playNotificationSound('high', 'payment');
            
            toast.success('💰 New Payment Received', {
              description: `Amount: ₹${newPayment.amount?.toLocaleString('en-IN')}`,
            });
            
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Payment', {
                body: `Amount: ₹${newPayment.amount?.toLocaleString('en-IN')}`,
                icon: '/shofz-logo.png',
                tag: `shop-payment-${newPayment.id}`,
              });
            }
          }
          
          loadPendingPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId]);

  const loadPendingPayments = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('payment_requests')
        .select(`
          *,
          users!payment_requests_customer_id_fkey(name, phone_number),
          inquiries(product_name)
        `)
        .eq('shop_id', shopId)
        .eq('status', 'customer_claimed_success')
        .order('customer_confirmed_at', { ascending: false });

      if (error) throw error;
      setPendingPayments((data as any) || []);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('Failed to load pending payments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScreenshotUpload = async (paymentId: string, file: File) => {
    const url = await uploadPaymentScreenshot(file);
    if (url) {
      setShopScreenshots(prev => ({ ...prev, [paymentId]: url }));
      toast.success('Screenshot uploaded');
    }
  };

  const handleConfirm = async (paymentId: string, received: boolean) => {
    setConfirmingId(paymentId);

    try {
      const updates: any = {
        shop_confirmation: received ? 'received' : 'not_received',
        shop_confirmed_at: new Date().toISOString(),
        status: received ? 'shop_confirmed' : 'disputed',
        updated_at: new Date().toISOString()
      };

      if (shopNotes[paymentId]) {
        updates.shop_notes = shopNotes[paymentId];
      }

      if (shopScreenshots[paymentId]) {
        updates.shop_screenshot_url = shopScreenshots[paymentId];
        updates.verification_confidence = Math.min((pendingPayments.find(p => p.id === paymentId)?.verification_confidence || 0) + 20, 100);
      }

      const { error } = await (supabase as any)
        .from('payment_requests')
        .update(updates)
        .eq('id', paymentId);

      if (error) throw error;

      if (!received) {
        // Create dispute
        await (supabase as any).from('payment_disputes').insert({
          payment_request_id: paymentId,
          raised_by: (await supabase.auth.getUser()).data.user?.id,
          dispute_type: 'payment_not_received',
          description: shopNotes[paymentId] || 'Shop did not receive payment'
        });
      }

      toast.success(received ? 'Payment confirmed!' : 'Payment disputed');
      loadPendingPayments();
    } catch (error) {
      console.error('Confirmation error:', error);
      toast.error('Failed to update payment status');
    } finally {
      setConfirmingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (pendingPayments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Payment Confirmations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No pending payment confirmations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pending Payment Confirmations</span>
          <Badge variant="secondary">{pendingPayments.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingPayments.map((payment) => (
          <Card key={payment.id} className="border-2">
            <CardContent className="p-4 space-y-4">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{payment.inquiries?.product_name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {payment.users?.name} • {payment.users?.phone_number}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    ₹{payment.amount.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(payment.customer_confirmed_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Evidence */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                {payment.transaction_id && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Transaction ID:</span>
                    <code className="bg-background px-2 py-0.5 rounded text-xs">
                      {payment.transaction_id}
                    </code>
                  </div>
                )}
                
                {payment.customer_screenshot_url && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">Screenshot:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(payment.customer_screenshot_url, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View
                    </Button>
                  </div>
                )}

                {payment.customer_notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Notes:</span>
                    <p className="text-xs mt-1">{payment.customer_notes}</p>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Confidence:</span>
                  <Badge variant={payment.verification_confidence > 70 ? 'default' : 'secondary'}>
                    {payment.verification_confidence}%
                  </Badge>
                </div>
              </div>

              {/* Shop Response */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor={`notes-${payment.id}`}>Your Notes (Optional)</Label>
                  <Textarea
                    id={`notes-${payment.id}`}
                    value={shopNotes[payment.id] || ''}
                    onChange={(e) => setShopNotes(prev => ({ ...prev, [payment.id]: e.target.value }))}
                    placeholder="Add any notes about this payment..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Your Screenshot (Optional)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleScreenshotUpload(payment.id, file);
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleConfirm(payment.id, true)}
                  disabled={confirmingId === payment.id}
                  className="flex-1 bg-success hover:bg-success/90"
                >
                  {confirmingId === payment.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Confirm Received
                </Button>
                <Button
                  onClick={() => handleConfirm(payment.id, false)}
                  disabled={confirmingId === payment.id}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Not Received
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}