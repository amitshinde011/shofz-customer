import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ReviewFilters } from "./ReviewFilters";
import { ReviewCard } from "./ReviewCard";
import { ReviewFilters as IReviewFilters } from "@/services/reviewDisplayService";
import { useInfiniteShopReviews } from "@/hooks/useReviews";
import { InfiniteScrollTrigger } from "@/components/InfiniteScrollTrigger";
import { InfiniteScrollLoader } from "@/components/InfiniteScrollLoader";
import { Skeleton } from "@/components/ui/skeleton";

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

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteShopReviews(shopId, filters);

  const allReviews = useMemo(() => {
    return data?.pages.flatMap(page => page) || [];
  }, [data]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Reviews</h3>
        <ReviewFilters filters={filters} onFilterChange={handleFilterChange} />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      ) : allReviews.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No reviews match your filters
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {allReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
          
          <InfiniteScrollTrigger
            onLoadMore={() => fetchNextPage()}
            hasMore={hasNextPage}
            isLoading={isFetchingNextPage}
            threshold={300}
          />
          
          <InfiniteScrollLoader
            isLoading={isFetchingNextPage}
            hasMore={hasNextPage}
            loadingText="Loading more reviews..."
            endText="No more reviews"
          />
        </>
      )}
    </Card>
  );
}