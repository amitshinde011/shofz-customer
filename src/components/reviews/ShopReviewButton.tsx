import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { reviewService } from "@/services/reviewService";
import { useAuth } from "@/hooks/useAuth";
import { ReviewSubmissionModal } from "./ReviewSubmissionModal";
import { useNavigate } from "react-router-dom";

interface ShopReviewButtonProps {
  shop: any;
}

export function ShopReviewButton({ shop }: ShopReviewButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    checkReviewEligibility();
  }, [user?.id, shop.id]);

  const checkReviewEligibility = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await reviewService.canReviewShopDirectly(
        user.id,
        shop.id
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
    return null;
  }

  if (!user) {
    return (
      <Button
        variant="outline"
        onClick={() => navigate('/auth')}
        className="w-full sm:w-auto"
      >
        <Star className="w-4 h-4 mr-2" />
        Login to Review
      </Button>
    );
  }

  if (!canReview) {
    return (
      <div className="text-sm text-muted-foreground">
        You've recently reviewed this shop
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowReviewModal(true)}
        className="w-full sm:w-auto"
      >
        <Star className="w-4 h-4 mr-2" />
        Write a Review
      </Button>

      {showReviewModal && (
        <ReviewSubmissionModal
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
