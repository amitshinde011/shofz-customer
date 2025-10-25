import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StarRating } from "./StarRating";
import { reviewDisplayService } from "@/services/reviewDisplayService";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, MoreHorizontal, ThumbsUp, ThumbsDown, Flag, Store, Edit } from "lucide-react";
import { ReviewImagesModal } from "./ReviewImagesModal";
import { ReportReviewModal } from "./ReportReviewModal";
import { ReviewSubmissionModal } from "./ReviewSubmissionModal";
import { Star } from "lucide-react";

interface ReviewCardProps {
  review: any;
  shopData?: any;
}

function CategoryRatingDisplay({ label, rating }: { label: string; rating: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center space-x-1">
        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
        <span>{rating}</span>
      </div>
    </div>
  );
}

export function ReviewCard({ review, shopData }: ReviewCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [helpfulVotes, setHelpfulVotes] = useState({ helpful: 0, notHelpful: 0 });
  const [userVote, setUserVote] = useState<boolean | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadHelpfulnessData();
  }, [review.id]);

  const loadHelpfulnessData = async () => {
    // Get helpfulness counts
    const { data: votes } = await reviewDisplayService.getReviewHelpfulness(review.id);
    if (votes) {
      setHelpfulVotes(votes);
    }

    // Get user's vote if logged in
    if (user?.id) {
      const { data: userVoteData } = await reviewDisplayService.getUserVote(review.id, user.id);
      if (userVoteData) {
        setUserVote(userVoteData.is_helpful);
      }
    }
  };

  const handleHelpfulVote = async (isHelpful: boolean) => {
    if (!user?.id) {
      toast({
        title: "Login required",
        description: "Please log in to vote on reviews",
        variant: "destructive"
      });
      return;
    }

    if (userVote === isHelpful) {
      // Remove vote if clicking same option
      await reviewDisplayService.removeVote(review.id, user.id);
      setUserVote(null);
    } else {
      // Add or update vote
      await reviewDisplayService.voteReviewHelpfulness(review.id, user.id, isHelpful);
      setUserVote(isHelpful);
    }

    // Reload helpfulness data
    loadHelpfulnessData();
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="border-b border-border pb-6 last:border-b-0">
      {/* Review Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage src={!review.is_anonymous ? review.users?.profile_image_url : undefined} />
            <AvatarFallback>
              {!review.is_anonymous ? review.users?.name?.charAt(0) : 'A'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-medium">
              {review.is_anonymous ? 'Anonymous' : review.users?.name}
            </h4>
            <div className="flex items-center space-x-2">
              <StarRating rating={review.rating} readonly size="small" />
              <span className="text-sm text-muted-foreground">{formatDate(review.created_at)}</span>
              {review.is_verified_purchase && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified Purchase
                </Badge>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {user?.id === review.customer_id && (
              <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                <Edit className="w-3 h-3 mr-2" />
                Edit Review
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setShowReportModal(true)}>
              <Flag className="w-3 h-3 mr-2" />
              Report Review
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Review Content */}
      <div className="space-y-3">
        {/* Product Context */}
        {review.inquiries?.product_name && (
          <p className="text-sm text-muted-foreground">
            Product: <span className="font-medium">{review.inquiries.product_name}</span>
          </p>
        )}

        {/* Review Title */}
        {review.title && (
          <h5 className="font-medium">{review.title}</h5>
        )}

        {/* Category Ratings */}
        {(review.product_quality_rating || review.service_rating || review.price_rating || review.delivery_rating) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
            {review.product_quality_rating && (
              <CategoryRatingDisplay label="Quality" rating={review.product_quality_rating} />
            )}
            {review.service_rating && (
              <CategoryRatingDisplay label="Service" rating={review.service_rating} />
            )}
            {review.price_rating && (
              <CategoryRatingDisplay label="Value" rating={review.price_rating} />
            )}
            {review.delivery_rating && (
              <CategoryRatingDisplay label="Delivery" rating={review.delivery_rating} />
            )}
          </div>
        )}

        {/* Review Text */}
        {review.review_text && (
          <p className="text-foreground leading-relaxed">{review.review_text}</p>
        )}

        {/* Review Images */}
        {review.review_images && review.review_images.length > 0 && (
          <div className="space-y-2">
            <div className="flex space-x-2 overflow-x-auto">
              {review.review_images.slice(0, 4).map((image: string, index: number) => (
                <img
                  key={index}
                  src={image}
                  alt={`Review ${index + 1}`}
                  className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                  onClick={() => setShowImages(true)}
                />
              ))}
              {review.review_images.length > 4 && (
                <div 
                  className="w-16 h-16 bg-muted rounded border flex items-center justify-center cursor-pointer hover:bg-muted/80"
                  onClick={() => setShowImages(true)}
                >
                  <span className="text-xs">+{review.review_images.length - 4}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shop Response */}
        {review.shop_response && (
          <div className="bg-primary/5 border-l-4 border-primary p-3 rounded">
            <div className="flex items-center space-x-2 mb-2">
              <Store className="w-4 h-4 text-primary" />
              <span className="font-medium text-primary">Shop Owner Response</span>
              {review.shop_responded_at && (
                <span className="text-xs text-muted-foreground">
                  {formatDate(review.shop_responded_at)}
                </span>
              )}
            </div>
            <p className="text-foreground">{review.shop_response}</p>
          </div>
        )}

        {/* Helpfulness Voting */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">Was this review helpful?</span>
            <div className="flex items-center space-x-2">
              <Button
                variant={userVote === true ? "default" : "outline"}
                size="sm"
                onClick={() => handleHelpfulVote(true)}
              >
                <ThumbsUp className="w-3 h-3 mr-1" />
                Yes ({helpfulVotes.helpful})
              </Button>
              <Button
                variant={userVote === false ? "default" : "outline"}
                size="sm"
                onClick={() => handleHelpfulVote(false)}
              >
                <ThumbsDown className="w-3 h-3 mr-1" />
                No ({helpfulVotes.notHelpful})
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImages && (
        <ReviewImagesModal
          images={review.review_images}
          onClose={() => setShowImages(false)}
        />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReportReviewModal
          review={review}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && shopData && (
        <ReviewSubmissionModal
          shop={shopData}
          existingReview={review}
          onClose={() => setShowEditModal(false)}
          onSubmitted={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}