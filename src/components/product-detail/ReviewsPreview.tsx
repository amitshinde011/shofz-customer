import { useNavigate } from 'react-router-dom';
import { Star, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ReviewsPreviewProps {
  productId: string;
  shopId: string;
}

export const ReviewsPreview = ({ productId, shopId }: ReviewsPreviewProps) => {
  const navigate = useNavigate();

  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', shopId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('reviews')
        .select(`
          *,
          users:customer_id (
            name,
            profile_image_url
          )
        `)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    },
  });

  const reviews = reviewsData || [];
  const avgRating = reviews.length > 0
    ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length
    : 0;

  if (reviews.length === 0) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2 text-foreground">Reviews</h3>
        <p className="text-sm text-muted-foreground">No reviews yet</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Reviews</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{avgRating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {reviews.map((review: any) => (
          <Card key={review.id} className="p-3">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={review.users?.profile_image_url} />
                <AvatarFallback>
                  {review.users?.name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-foreground">
                    {review.users?.name || 'Anonymous'}
                  </span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">{review.rating}</span>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {review.comment}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button
        variant="outline"
        className="w-full mt-3"
        onClick={() => navigate(`/shops/${shopId}#reviews`)}
      >
        View all reviews
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};
