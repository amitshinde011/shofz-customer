import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inquiryService, Inquiry } from '@/services/inquiryService';
import { useToast } from '@/hooks/use-toast';

export interface InquiryFilters {
  status?: string;
  limit?: number;
  offset?: number;
}

export const useUserInquiries = (userId: string, filters?: InquiryFilters) => {
  return useQuery({
    queryKey: ['inquiries', 'user', userId, filters],
    queryFn: async () => {
      console.log('Fetching user inquiries:', { userId, filters });
      const result = await inquiryService.getUserInquiries(userId, filters);
      console.log('User inquiries result:', result);
      return result;
    },
    enabled: !!userId,
    staleTime: 0, // Always fetch fresh data on navigation
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useInquiry = (id: string) => {
  return useQuery({
    queryKey: ['inquiry', id],
    queryFn: () => inquiryService.getInquiryById(id),
    enabled: !!id,
    staleTime: 0, // Always fetch fresh data on navigation
    gcTime: 5 * 60 * 1000,
  });
};

export const useCreateInquiry = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: inquiryService.createInquiry,
    onSuccess: (data) => {
      // Invalidate user inquiries
      queryClient.invalidateQueries({ queryKey: ['inquiries', 'user'] });
      toast({
        title: "Inquiry sent successfully!",
        description: "Your inquiry has been sent to the shop.",
      });
      return data;
    },
    onError: (error: Error) => {
      console.error('Error creating inquiry:', error);
      toast({
        title: "Error sending inquiry",
        description: error.message || "Failed to send inquiry. Please try again.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateInquiryStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'pending' | 'in_progress' | 'completed' | 'expired' }) =>
      inquiryService.updateInquiryStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
      queryClient.invalidateQueries({ queryKey: ['inquiry'] });
      toast({
        title: "Status updated",
        description: "Inquiry status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating status",
        description: error.message || "Failed to update inquiry status.",
        variant: "destructive",
      });
    },
  });
};

export const useInquiryStats = (userId: string) => {
  return useQuery({
    queryKey: ['inquiry-stats', userId],
    queryFn: () => inquiryService.getInquiryStats(userId),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds for fresher data
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};