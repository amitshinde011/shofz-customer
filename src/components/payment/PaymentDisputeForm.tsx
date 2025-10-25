import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadPaymentScreenshot } from '@/services/paymentService';

interface PaymentDisputeFormProps {
  paymentRequestId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type DisputeType = 'payment_not_received' | 'amount_mismatch' | 'unauthorized' | 'other';

export function PaymentDisputeForm({ paymentRequestId, onClose, onSuccess }: PaymentDisputeFormProps) {
  const [disputeType, setDisputeType] = useState<DisputeType>('payment_not_received');
  const [description, setDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const url = await uploadPaymentScreenshot(file);
    if (url) {
      setEvidenceFiles(prev => [...prev, url]);
      toast.success('Evidence uploaded');
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Please provide a description');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create dispute
      const { error: disputeError } = await (supabase as any)
        .from('payment_disputes')
        .insert({
          payment_request_id: paymentRequestId,
          raised_by: user.id,
          dispute_type: disputeType,
          description: description.trim(),
          evidence_urls: evidenceFiles,
          status: 'open'
        });

      if (disputeError) throw disputeError;

      // Update payment request status
      const { error: updateError } = await (supabase as any)
        .from('payment_requests')
        .update({
          status: 'disputed',
          dispute_raised_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRequestId);

      if (updateError) throw updateError;

      toast.success('Dispute submitted successfully');
      onSuccess?.();
      onClose();

    } catch (error) {
      console.error('Dispute submission error:', error);
      toast.error('Failed to submit dispute');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Raise Payment Dispute</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-warning-foreground">
              Disputes are reviewed by our team. Please provide accurate information.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Dispute Type</Label>
            <Select value={disputeType} onValueChange={(value) => setDisputeType(value as DisputeType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="payment_not_received">Payment Not Received</SelectItem>
                <SelectItem value="amount_mismatch">Amount Mismatch</SelectItem>
                <SelectItem value="unauthorized">Unauthorized Transaction</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe the issue in detail..."
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label>Evidence (Screenshots, receipts, etc.)</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="evidence-upload"
              />
              <label htmlFor="evidence-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload evidence ({evidenceFiles.length} uploaded)
                </p>
              </label>
            </div>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !description.trim()}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Dispute'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}