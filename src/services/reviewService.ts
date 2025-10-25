import { supabase } from "@/integrations/supabase/client";

export interface ReviewSubmission {
  shop_id: string;
  customer_id: string;
  inquiry_id: string;
  rating: number;
  title: string;
  review_text: string;
  product_quality_rating?: number | null;
  service_rating?: number | null;
  price_rating?: number | null;
  delivery_rating?: number | null;
  review_images?: string[];
  is_anonymous?: boolean;
  is_verified_purchase?: boolean;
}

export interface ReviewTemplate {
  id: string;
  rating: number;
  template_text: string;
  category: string;
  is_active: boolean;
}

export const reviewService = {
  // Check if customer can review a shop for a specific inquiry
  async canReviewShop(customerId: string, shopId: string, inquiryId: string) {
    const { data, error } = await supabase.rpc('can_customer_review_shop', {
      p_customer_id: customerId,
      p_shop_id: shopId,
      p_inquiry_id: inquiryId
    });

    return { data, error };
  },

  // Check if customer can review a shop directly (without inquiry)
  async canReviewShopDirectly(customerId: string, shopId: string) {
    const { data, error } = await supabase.rpc('can_review_shop_directly', {
      p_customer_id: customerId,
      p_shop_id: shopId
    });

    return { data, error };
  },

  // Get review templates
  async getReviewTemplates() {
    const { data, error } = await supabase
      .from('review_templates')
      .select('*')
      .eq('is_active', true)
      .order('rating', { ascending: false });

    return { data: data as ReviewTemplate[] | null, error };
  },

  // Submit a review
  async submitReview(reviewData: ReviewSubmission) {
    // Map review_text to comment for database compatibility
    const dbData = {
      shop_id: reviewData.shop_id,
      customer_id: reviewData.customer_id,
      inquiry_id: reviewData.inquiry_id,
      rating: reviewData.rating,
      title: reviewData.title,
      comment: reviewData.review_text, // Map review_text to comment
      product_quality_rating: reviewData.product_quality_rating,
      service_rating: reviewData.service_rating,
      price_rating: reviewData.price_rating,
      delivery_rating: reviewData.delivery_rating,
      review_images: reviewData.review_images,
      is_anonymous: reviewData.is_anonymous,
      is_verified_purchase: reviewData.is_verified_purchase,
      review_status: 'approved' // Auto-approve reviews for immediate visibility
    };

    const { data, error } = await supabase
      .from('shop_reviews')
      .insert([dbData])
      .select()
      .single();

    return { data, error };
  },

  // Update a review
  async updateReview(reviewId: string, reviewData: Partial<ReviewSubmission>) {
    const dbData: any = {
      rating: reviewData.rating,
      title: reviewData.title,
      comment: reviewData.review_text,
      product_quality_rating: reviewData.product_quality_rating,
      service_rating: reviewData.service_rating,
      price_rating: reviewData.price_rating,
      delivery_rating: reviewData.delivery_rating,
      review_images: reviewData.review_images,
      is_anonymous: reviewData.is_anonymous,
    };

    const { data, error } = await supabase
      .from('shop_reviews')
      .update(dbData)
      .eq('id', reviewId)
      .select()
      .single();

    return { data, error };
  },

  // Upload review images
  async uploadReviewImages(files: File[]): Promise<string[]> {
    const uploadPromises = files.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `review-images/${fileName}`;

      const { error } = await supabase.storage
        .from('customer-uploads')
        .upload(filePath, file);

      if (!error) {
        const { data } = supabase.storage
          .from('customer-uploads')
          .getPublicUrl(filePath);
        
        return data.publicUrl;
      }
      return null;
    });

    const urls = await Promise.all(uploadPromises);
    return urls.filter((url): url is string => url !== null);
  }
};