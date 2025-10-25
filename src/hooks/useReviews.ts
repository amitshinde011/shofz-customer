import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewDisplayService, ReviewFilters } from "@/services/reviewDisplayService";
import { useToast } from "@/hooks/use-toast";

export const useShopReviewStats = (shopId: string) => {
  return useQuery({
    queryKey: ['shop-review-stats', shopId],
    queryFn: async () => {
      const { data, error } = await reviewDisplayService.getShopReviewStats(shopId);
      if (error) throw error;
      return data;
    },
    enabled: !!shopId
  });
};

export const useShopReviewsList = (shopId: string, filters: ReviewFilters, page: number = 1) => {
  return useQuery({
    queryKey: ['shop-reviews', shopId, filters, page],
    queryFn: async () => {
      const { data, error } = await reviewDisplayService.getShopReviews(shopId, filters, page);
      if (error) throw error;
      return data;
    },
    enabled: !!shopId
  });
};

export const useReviewHelpfulness = (reviewId: string) => {
  return useQuery({
    queryKey: ['review-helpfulness', reviewId],
    queryFn: async () => {
      const { data, error } = await reviewDisplayService.getReviewHelpfulness(reviewId);
      if (error) throw error;
      return data;
    },
    enabled: !!reviewId
  });
};

export const useUserReviewVote = (reviewId: string, userId?: string) => {
  return useQuery({
    queryKey: ['user-review-vote', reviewId, userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await reviewDisplayService.getUserVote(reviewId, userId);
      if (error) throw error;
      return data;
    },
    enabled: !!reviewId && !!userId
  });
};

export const useVoteReviewHelpfulness = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ reviewId, userId, isHelpful }: { reviewId: string; userId: string; isHelpful: boolean }) => {
      const { data, error } = await reviewDisplayService.voteReviewHelpfulness(reviewId, userId, isHelpful);
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['review-helpfulness', variables.reviewId] });
      queryClient.invalidateQueries({ queryKey: ['user-review-vote', variables.reviewId, variables.userId] });
    },
    onError: (error) => {
      toast({
        title: "Vote failed",
        description: "Failed to record your vote",
        variant: "destructive"
      });
    }
  });
};

export const useReportReview = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ reviewId, userId, reason, details }: { 
      reviewId: string; 
      userId: string; 
      reason: string; 
      details?: string;
    }) => {
      const { data, error } = await reviewDisplayService.reportReview(reviewId, userId, reason, details);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Report submitted",
        description: "Thank you for helping us maintain quality",
      });
    },
    onError: (error) => {
      toast({
        title: "Report failed",
        description: "Failed to submit report",
        variant: "destructive"
      });
    }
  });
};

export const useSubmitReview = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (reviewData: any) => {
      const { reviewService } = await import("@/services/reviewService");
      const { data, error } = await reviewService.submitReview(reviewData);
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shop-reviews', variables.shop_id] });
      queryClient.invalidateQueries({ queryKey: ['shop-review-stats', variables.shop_id] });
      queryClient.invalidateQueries({ queryKey: ['shop', variables.shop_id] });
      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });
    },
    onError: (error) => {
      toast({
        title: "Submission failed",
        description: "Failed to submit review",
        variant: "destructive"
      });
    }
  });
};

export const useUpdateReview = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ reviewId, reviewData }: { reviewId: string; reviewData: any }) => {
      const { reviewService } = await import("@/services/reviewService");
      const { data, error } = await reviewService.updateReview(reviewId, reviewData);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shop-reviews', data.shop_id] });
      queryClient.invalidateQueries({ queryKey: ['shop-review-stats', data.shop_id] });
      queryClient.invalidateQueries({ queryKey: ['shop', data.shop_id] });
      toast({
        title: "Review updated",
        description: "Your review has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: "Failed to update review",
        variant: "destructive"
      });
    }
  });
};