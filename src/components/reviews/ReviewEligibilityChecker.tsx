import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { reviewService } from "@/services/reviewService";
import { useAuth } from "@/hooks/useAuth";
import { ReviewSubmissionModal } from "./ReviewSubmissionModal";

interface ReviewEligibilityCheckerProps {
  inquiry: any;
  shop: any;
}

export function ReviewEligibilityChecker({ inquiry, shop }: ReviewEligibilityCheckerProps) {
  const { user } = useAuth();
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    checkReviewEligibility();
  }, [inquiry.id, shop.id]);

  const checkReviewEligibility = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await reviewService.canReviewShop(
        user.id,
        shop.id,
        inquiry.id
      );

      if (!error) {
        setCanReview(data || false);
      }
    } catch (error) {
      console.error('Review eligibility check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Checking review eligibility...</div>;
  }

  if (!canReview) {
    return null;
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowReviewModal(true)}
        className="border-blue-500 text-blue-600 hover:bg-blue-50"
      >
        <Star className="w-3 h-3 mr-1" />
        Write Review
      </Button>

      {showReviewModal && (
        <ReviewSubmissionModal
          inquiry={inquiry}
          shop={shop}
          onClose={() => setShowReviewModal(false)}
          onSubmitted={() => {
            setCanReview(false);
            setShowReviewModal(false);
          }}
        />
      )}
    </>
  );
}