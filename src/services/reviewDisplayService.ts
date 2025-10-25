import { supabase } from "@/integrations/supabase/client";

export interface ReviewFilters {
  rating: string;
  sort: string;
  verified_only: boolean;
  with_photos: boolean;
}

export const reviewDisplayService = {
  // Get shop review statistics
  async getShopReviewStats(shopId: string) {
    const { data, error } = await (supabase as any)
      .from('shop_review_stats')
      .select('*')
      .eq('shop_id', shopId)
      .single();

    return { data, error };
  },

  // Get reviews with filters and pagination
  async getShopReviews(shopId: string, filters: ReviewFilters, page: number = 1, limit: number = 5) {
    let query = (supabase as any)
      .from('shop_reviews')
      .select(`
        *,
        users(name, profile_image_url),
        inquiries(product_name)
      `)
      .eq('shop_id', shopId)
      .eq('review_status', 'approved');

    // Apply filters
    if (filters.rating !== 'all') {
      query = query.eq('rating', parseInt(filters.rating));
    }

    if (filters.verified_only) {
      query = query.eq('is_verified_purchase', true);
    }

    if (filters.with_photos) {
      query = query.not('review_images', 'is', null);
    }

    // Apply sorting
    switch (filters.sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'highest_rated':
        query = query.order('rating', { ascending: false });
        break;
      case 'lowest_rated':
        query = query.order('rating', { ascending: true });
        break;
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error } = await query;
    return { data, error };
  },

  // Get helpfulness votes for a review
  async getReviewHelpfulness(reviewId: string) {
    const { data, error } = await supabase
      .from('review_helpfulness')
      .select('is_helpful')
      .eq('review_id', reviewId);

    if (error) return { data: null, error };

    const helpful = data?.filter(v => v.is_helpful).length || 0;
    const notHelpful = data?.filter(v => !v.is_helpful).length || 0;

    return { data: { helpful, notHelpful }, error: null };
  },

  // Get user's vote on a review
  async getUserVote(reviewId: string, userId: string) {
    const { data, error } = await supabase
      .from('review_helpfulness')
      .select('is_helpful')
      .eq('review_id', reviewId)
      .eq('user_id', userId)
      .maybeSingle();

    return { data, error };
  },

  // Vote on review helpfulness
  async voteReviewHelpfulness(reviewId: string, userId: string, isHelpful: boolean) {
    const { data, error } = await supabase
      .from('review_helpfulness')
      .upsert({
        review_id: reviewId,
        user_id: userId,
        is_helpful: isHelpful
      }, {
        onConflict: 'review_id,user_id'
      });

    return { data, error };
  },

  // Remove vote
  async removeVote(reviewId: string, userId: string) {
    const { data, error } = await supabase
      .from('review_helpfulness')
      .delete()
      .eq('review_id', reviewId)
      .eq('user_id', userId);

    return { data, error };
  },

  // Report review
  async reportReview(reviewId: string, userId: string, reason: string, details?: string) {
    const { data, error } = await supabase
      .from('review_reports')
      .insert([{
        review_id: reviewId,
        reported_by: userId,
        report_reason: reason,
        report_details: details
      }]);

    return { data, error };
  }
};