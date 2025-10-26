import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { reviewDisplayService } from "@/services/reviewDisplayService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ReportReviewModalProps {
  review: any;
  onClose: () => void;
}

const reportReasons = [
  { value: 'spam', label: 'Spam or fake review' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'off_topic', label: 'Off-topic or irrelevant' },
  { value: 'personal_attack', label: 'Personal attack' },
  { value: 'other', label: 'Other' }
];

export function ReportReviewModal({ review, onClose }: ReportReviewModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitReport = async () => {
    if (!reason) {
      toast({
        title: "Reason required",
        description: "Please select a reason for reporting",
        variant: "destructive"
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Login required",
        description: "Please log in to report reviews",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await reviewDisplayService.reportReview(
        review.id,
        user.id,
        reason,
        details
      );

      if (!error) {
        toast({
          title: "Report submitted",
          description: "Thank you for helping us maintain quality",
        });
        onClose();
      } else {
        throw error;
      }
    } catch (error) {
      console.error('Report submission failed:', error);
      toast({
        title: "Report failed",
        description: "Failed to submit report",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report Review</DialogTitle>
          <DialogDescription>
            Help us maintain quality by reporting inappropriate content
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Reason for reporting *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reportReasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Additional details (optional)</Label>
            <Textarea
              placeholder="Provide more context about the issue..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={submitReport} 
              disabled={submitting || !reason}
              className="flex-1"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}