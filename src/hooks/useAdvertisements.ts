import { useQuery } from '@tanstack/react-query';
import { advertisementService } from '@/services/advertisementService';

export const useAdvertisements = (
  adType?: 'carousel' | 'banner',
  placement?: string
) => {
  return useQuery({
    queryKey: ['advertisements', adType, placement],
    queryFn: async () => {
      const result = await advertisementService.getActiveAds(adType, placement);
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};
