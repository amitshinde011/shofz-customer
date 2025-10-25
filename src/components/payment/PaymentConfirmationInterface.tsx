import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadPaymentScreenshot } from '@/services/paymentService';

interface PaymentConfirmationInterfaceProps {
  paymentRequestId: string;
  inquiry: any;
  shop: any;
  amount: number;
  onClose: () => void;
}

type Step = 'status' | 'details' | 'confirmation';

export function PaymentConfirmationInterface({ 
  paymentRequestId, 
  inquiry, 
  shop, 
  amount, 
  onClose 
}: PaymentConfirmationInterfaceProps) {
  const [step, setStep] = useState<Step>('status');
  const [paymentSuccess, setPaymentSuccess] = useState<boolean | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');

  const handleStatusSelection = (success: boolean) => {
    setPaymentSuccess(success);
    if (success) {
      setStep('details');
    } else {
      toast.info('Payment not completed. Please try again or contact the shop.');
      onClose();
    }
  };

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setScreenshot(file);
    
    // Upload immediately
    const url = await uploadPaymentScreenshot(file);
    if (url) {
      setScreenshotUrl(url);
      toast.success('Screenshot uploaded');
    }
  };

  const calculateConfidence = () => {
    let confidence = 30; // Base confidence for user claim
    
    if (transactionId && transactionId.length >= 12) {
      confidence += 30;
    }
    
    if (screenshotUrl) {
      confidence += 40;
    }
    
    return Math.min(confidence, 100);
  };

  const handleSubmit = async () => {
    if (!transactionId && !screenshotUrl) {
      toast.error('Please provide transaction ID or screenshot');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const confidence = calculateConfidence();

      // Update payment request
      const { error: updateError } = await (supabase as any)
        .from('payment_requests')
        .update({
          status: 'customer_claimed_success',
          customer_confirmation: 'success',
          customer_confirmed_at: new Date().toISOString(),
          transaction_id: transactionId || null,
          customer_screenshot_url: screenshotUrl || null,
          customer_notes: notes || null,
          verification_confidence: confidence,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRequestId);

      if (updateError) throw updateError;

      // Create verification evidence
      const evidenceRecords = [];
      
      if (transactionId) {
        evidenceRecords.push({
          payment_request_id: paymentRequestId,
          evidence_type: 'transaction_id',
          evidence_data: { transaction_id: transactionId },
          confidence_score: 30,
          submitted_by: user.id
        });
      }

      if (screenshotUrl) {
        evidenceRecords.push({
          payment_request_id: paymentRequestId,
          evidence_type: 'screenshot',
          evidence_data: { screenshot_url: screenshotUrl },
          confidence_score: 40,
          submitted_by: user.id
        });
      }

      if (evidenceRecords.length > 0) {
        const { error: evidenceError } = await (supabase as any)
          .from('payment_verification_evidence')
          .insert(evidenceRecords);

        if (evidenceError) console.error('Evidence error:', evidenceError);
      }

      setStep('confirmation');
      
      setTimeout(() => {
        onClose();
      }, 3000);

    } catch (error) {
      console.error('Confirmation error:', error);
      toast.error('Failed to confirm payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'status' && 'Payment Status'}
            {step === 'details' && 'Payment Details'}
            {step === 'confirmation' && 'Success!'}
          </DialogTitle>
        </DialogHeader>

        {step === 'status' && (
          <div className="space-y-4 py-4">
            <p className="text-center text-muted-foreground">
              Did you complete the payment successfully?
            </p>
            <div className="bg-primary/5 rounded-lg p-4 text-center mb-6">
              <p className="text-sm text-muted-foreground mb-1">Amount Paid</p>
              <p className="text-2xl font-bold text-primary">₹{amount.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground mt-1">to {shop.name}</p>
            </div>
            <div className="flex space-x-3">
              <Button 
                onClick={() => handleStatusSelection(true)}
                className="flex-1 bg-success hover:bg-success/90"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Yes, Paid
              </Button>
              <Button 
                onClick={() => handleStatusSelection(false)}
                variant="outline"
                className="flex-1"
              >
                No, Cancel
              </Button>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="txnId">Transaction ID (Optional)</Label>
              <Input
                id="txnId"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter UPI transaction ID"
              />
              <p className="text-xs text-muted-foreground">
                Found in your payment app or SMS
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="screenshot">Payment Screenshot (Optional)</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <Input
                  id="screenshot"
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  className="hidden"
                />
                <label htmlFor="screenshot" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {screenshot ? screenshot.name : 'Click to upload screenshot'}
                  </p>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information..."
                rows={3}
              />
            </div>

            <div className="flex space-x-2 pt-4">
              <Button variant="outline" onClick={() => setStep('status')} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || (!transactionId && !screenshotUrl)}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Confirm Payment'
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'confirmation' && (
          <div className="space-y-4 py-8 text-center">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-success mb-2">Payment Submitted!</h3>
              <p className="text-muted-foreground">
                Your payment is being verified. The shop will confirm receipt shortly.
              </p>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-sm">
                You'll receive a notification once the shop confirms your payment.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}