import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReviewFilters } from "./ReviewFilters";
import { ReviewCard } from "./ReviewCard";
import { ReviewFilters as IReviewFilters } from "@/services/reviewDisplayService";
import { useShopReviewsList } from "@/hooks/useReviews";

interface ShopReviewsListProps {
  shopId: string;
}

export function ShopReviewsList({ shopId }: ShopReviewsListProps) {
  const [filters, setFilters] = useState<IReviewFilters>({
    rating: 'all',
    sort: 'newest',
    verified_only: false,
    with_photos: false
  });
  const [currentPage, setCurrentPage] = useState(1);

  const { data: reviews = [], isLoading } = useShopReviewsList(shopId, filters, currentPage);
  
  const hasMore = reviews.length === 5; // If we got a full page, there might be more

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Reviews</h3>
        <ReviewFilters filters={filters} onFilterChange={handleFilterChange} />
      </div>

      {isLoading && currentPage === 1 ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full mb-1"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No reviews match your filters
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
      
      {hasMore && reviews.length > 0 && (
        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load More Reviews'}
          </Button>
        </div>
      )}
    </Card>
  );
}