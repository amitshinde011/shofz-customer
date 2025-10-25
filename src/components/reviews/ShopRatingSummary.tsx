import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { StarRating } from "./StarRating";
import { reviewDisplayService } from "@/services/reviewDisplayService";

interface ShopRatingSummaryProps {
  shopId: string;
  compact?: boolean;
}

function CategoryRatingDisplay({ label, rating }: { label: string; rating: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center space-x-1">
        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
        <span>{rating.toFixed(1)}</span>
      </div>
    </div>
  );
}

export function ShopRatingSummary({ shopId, compact = false }: ShopRatingSummaryProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviewStats();
  }, [shopId]);

  const loadReviewStats = async () => {
    const { data, error } = await reviewDisplayService.getShopReviewStats(shopId);
    
    if (data) {
      setStats(data);
    } else if (!error) {
      // Initialize empty stats if none exist
      setStats({
        total_reviews: 0,
        average_rating: 0,
        rating_5_count: 0,
        rating_4_count: 0,
        rating_3_count: 0,
        rating_2_count: 0,
        rating_1_count: 0,
        verified_reviews_count: 0
      });
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="animate-pulse h-20 bg-muted rounded"></div>;
  }

  if (!stats || stats.total_reviews === 0) {
    return (
      <div className="text-center p-4 bg-muted/50 rounded-lg">
        <Star className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No reviews yet</p>
        <p className="text-sm text-muted-foreground">Be the first to review this shop!</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="ml-1 font-medium">{stats.average_rating.toFixed(1)}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          ({stats.total_reviews} review{stats.total_reviews !== 1 ? 's' : ''})
        </span>
        {stats.verified_reviews_count > 0 && (
          <Badge variant="secondary" className="text-xs">
            {stats.verified_reviews_count} verified
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Customer Reviews</h3>

      <div className="flex items-start space-x-6">
        {/* Overall Rating */}
        <div className="text-center">
          <div className="text-4xl font-bold text-primary mb-1">
            {stats.average_rating.toFixed(1)}
          </div>
          <StarRating rating={Math.round(stats.average_rating)} readonly />
          <p className="text-sm text-muted-foreground mt-1">
            {stats.total_reviews} review{stats.total_reviews !== 1 ? 's' : ''}
          </p>
          {stats.verified_reviews_count > 0 && (
            <Badge variant="secondary" className="text-xs mt-1">
              {stats.verified_reviews_count} verified purchases
            </Badge>
          )}
        </div>

        {/* Rating Distribution */}
        <div className="flex-1">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats[`rating_${rating}_count`] || 0;
            const percentage = stats.total_reviews > 0 ? (count / stats.total_reviews) * 100 : 0;
            
            return (
              <div key={rating} className="flex items-center space-x-3 mb-2">
                <span className="text-sm w-8">{rating}★</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div 
                    className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm text-muted-foreground w-8">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Category Ratings */}
        {(stats.avg_product_quality || stats.avg_service || stats.avg_price || stats.avg_delivery) && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Category Ratings</h4>
            {stats.avg_product_quality && (
              <CategoryRatingDisplay label="Quality" rating={stats.avg_product_quality} />
            )}
            {stats.avg_service && (
              <CategoryRatingDisplay label="Service" rating={stats.avg_service} />
            )}
            {stats.avg_price && (
              <CategoryRatingDisplay label="Value" rating={stats.avg_price} />
            )}
            {stats.avg_delivery && (
              <CategoryRatingDisplay label="Delivery" rating={stats.avg_delivery} />
            )}
          </div>
        )}
      </div>
    </Card>
  );
}