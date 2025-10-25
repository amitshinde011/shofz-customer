import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Review {
  id: string;
  customer_id: string;
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
  created_at: string;
  is_verified: boolean;
  helpful_count: number;
  users?: {
    name?: string;
    profile_image_url?: string;
  };
}

interface ShopReviewsProps {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  ratingDistribution?: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export default function ShopReviews({
  reviews,
  averageRating,
  totalReviews,
  ratingDistribution,
}: ShopReviewsProps) {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < rating
            ? 'fill-warning text-warning'
            : 'fill-muted text-muted'
        }`}
      />
    ));
  };

  const getRatingPercentage = (star: number) => {
    if (!ratingDistribution || totalReviews === 0) return 0;
    return (ratingDistribution[star as keyof typeof ratingDistribution] / totalReviews) * 100;
  };

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground mb-4">Customer Reviews</h3>

        {/* Rating Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Average Rating */}
          <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
            <div className="text-4xl font-bold text-foreground mb-2">
              {averageRating.toFixed(1)}
            </div>
            <div className="flex items-center space-x-1 mb-2">
              {renderStars(Math.round(averageRating))}
            </div>
            <p className="text-sm text-muted-foreground">
              Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
            </p>
          </div>

          {/* Rating Distribution */}
          {ratingDistribution && (
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center space-x-2">
                  <span className="text-sm font-medium w-8">{star}★</span>
                  <Progress
                    value={getRatingPercentage(star)}
                    className="flex-1 h-2"
                  />
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {ratingDistribution[star as keyof typeof ratingDistribution] || 0}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No reviews yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Be the first to review this shop!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border-b border-border last:border-0 pb-4 last:pb-0"
              >
                <div className="flex items-start space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={review.users?.profile_image_url} />
                    <AvatarFallback>
                      {review.users?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {review.users?.name || 'Anonymous'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(review.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      {review.is_verified && (
                        <span className="text-xs text-success bg-success/10 px-2 py-1 rounded">
                          Verified Purchase
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 mb-2">
                      {renderStars(review.rating)}
                    </div>

                    {review.title && (
                      <p className="font-medium text-sm text-foreground mb-1">
                        {review.title}
                      </p>
                    )}

                    {review.comment && (
                      <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                        {review.comment}
                      </p>
                    )}

                    {review.images && review.images.length > 0 && (
                      <div className="flex space-x-2 mb-2">
                        {review.images.slice(0, 3).map((image, idx) => (
                          <img
                            key={idx}
                            src={image}
                            alt={`Review ${idx + 1}`}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ))}
                      </div>
                    )}

                    {review.helpful_count > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {review.helpful_count} {review.helpful_count === 1 ? 'person' : 'people'} found this helpful
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Write Review Button (Future Feature) */}
        <Button className="w-full mt-4" variant="outline" disabled>
          Write a Review (Coming Soon)
        </Button>
      </CardContent>
    </Card>
  );
}
