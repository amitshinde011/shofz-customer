import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerReferralService } from '@/services/customerReferralService';
import { useToast } from '@/hooks/use-toast';

export function useCustomerReferral(customerId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch referral data (code, UPI ID, earnings)
  const { data: referralData, isLoading: isLoadingData } = useQuery({
    queryKey: ['customer-referral', customerId],
    queryFn: () => customerReferralService.getCustomerReferralData(customerId!),
    enabled: !!customerId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true, // Only refetch if stale
  });

  // Fetch referral statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['customer-referral-stats', customerId],
    queryFn: () => customerReferralService.getCustomerReferralStats(customerId!),
    enabled: !!customerId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch referral history
  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['customer-referral-history', customerId],
    queryFn: () => customerReferralService.getReferralHistory(customerId!),
    enabled: !!customerId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Generate referral code mutation
  const generateCode = useMutation({
    mutationFn: () => customerReferralService.generateReferralCode(customerId!),
    retry: false, // Prevent multiple simultaneous calls
    onSuccess: async (result) => {
      if (result.code) {
        // No delay needed - DB function is now atomic
        await queryClient.invalidateQueries({ queryKey: ['customer-referral', customerId] });
        toast({
          title: "Referral Code Generated",
          description: `Your referral code is: ${result.code}`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to generate referral code",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate referral code",
        variant: "destructive",
      });
    },
  });

  // Update UPI ID mutation
  const updateUpi = useMutation({
    mutationFn: (upiId: string) => customerReferralService.updateUpiId(customerId!, upiId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['customer-referral', customerId] });
        toast({
          title: "UPI ID Updated",
          description: "Your UPI ID has been saved successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update UPI ID",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update UPI ID",
        variant: "destructive",
      });
    },
  });

  return {
    referralData,
    stats,
    history,
    isLoading: isLoadingData || isLoadingStats,
    isLoadingHistory,
    generateCode,
    updateUpi,
  };
}
