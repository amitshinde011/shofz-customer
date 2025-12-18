import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { shopService, Shop } from '@/services/shopService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ShopSearchOptions {
  search?: string;
  category?: string;
  location?: { lat: number; lng: number; radius?: number };
  featured?: boolean;
  limit?: number;
  offset?: number;
}

const PAGE_SIZE = 20;

export const useShops = (options?: ShopSearchOptions) => {
  return useQuery({
    queryKey: ['shops', options],
    queryFn: async () => {
      console.log('Fetching shops with options:', options);
      const result = await shopService.getShops(options);
      console.log('Shops result:', result);
      return result;
    },
    enabled: !!options?.location, // Only fetch if location is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Infinite scroll hook for shops
export const useInfiniteShops = (options?: Omit<ShopSearchOptions, 'offset' | 'limit'>) => {
  return useInfiniteQuery({
    queryKey: ['shops-infinite', options],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await shopService.getShopsWithCount({
        ...options,
        offset: pageParam * PAGE_SIZE,
        limit: PAGE_SIZE,
      });
      return {
        data: result.data || [],
        nextPage: pageParam + 1,
        hasMore: (result.data?.length || 0) >= PAGE_SIZE,
        totalCount: result.totalCount || 0,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : undefined,
    enabled: !!options?.location,
    staleTime: 5 * 60 * 1000,
  });
};

export const useShop = (id: string) => {
  if (import.meta.env.DEV && id && id !== 'NO_SHOP') {
    console.log('useShop hook called with id:', id);
  }
  return useQuery({
    queryKey: ['shops', id],
    queryFn: async () => {
      const result = await shopService.getShopById(id);
      return result;
    },
    enabled: !!id && id !== 'NO_SHOP',
  });
};

export const useFeaturedShops = (limit?: number) => {
  return useQuery({
    queryKey: ['shops', 'featured', limit],
    queryFn: () => shopService.getFeaturedShops(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useNearbyShops = (location: { lat: number; lng: number }, radius?: number) => {
  return useQuery({
    queryKey: ['shops', 'nearby', location, radius],
    queryFn: () => shopService.getNearbyShops(location, radius || 10),
    enabled: !!location.lat && !!location.lng,
  });
};

export const useShopCategories = () => {
  return useQuery({
    queryKey: ['shops', 'categories'],
    queryFn: () => shopService.getShopCategories(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useUserFavoriteShops = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['shops', 'favorites', user?.id],
    queryFn: () => shopService.getUserFavoriteShops(user!.id),
    enabled: !!user?.id,
  });
};

export const useToggleShopFavorite = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shopId, isFavorited }: { shopId: string; isFavorited: boolean }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      if (isFavorited) {
        return shopService.removeFromFavorites(user.id, shopId);
      } else {
        return shopService.addToFavorites(user.id, shopId);
      }
    },
    // Optimistic update
    onMutate: async ({ shopId, isFavorited }) => {
      await queryClient.cancelQueries({ queryKey: ['shops', 'favorites'] });
      
      const previousFavorites = queryClient.getQueryData(['shops', 'favorites', user?.id]);
      
      queryClient.setQueryData(['shops', 'favorites', user?.id], (old: any) => {
        if (!old?.data) return old;
        
        if (isFavorited) {
          return {
            ...old,
            data: old.data.filter((fav: any) => fav.shop_id !== shopId)
          };
        } else {
          return {
            ...old,
            data: [...old.data, { shop_id: shopId }]
          };
        }
      });
      
      return { previousFavorites };
    },
    onSuccess: (_, { isFavorited }) => {
      queryClient.invalidateQueries({ queryKey: ['shops', 'favorites'] });
      toast({
        title: isFavorited ? "Removed from favorites" : "Added to favorites",
        description: isFavorited 
          ? "Shop removed from your favorites"
          : "Shop added to your favorites",
      });
    },
    onError: (error, _, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(['shops', 'favorites', user?.id], context.previousFavorites);
      }
      
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
      console.error('Error toggling shop favorite:', error);
    },
  });
};

export const useShopReviews = (shopId: string, limit?: number, offset?: number) => {
  return useQuery({
    queryKey: ['shops', shopId, 'reviews', limit, offset],
    queryFn: () => shopService.getShopReviews(shopId, limit, offset),
    enabled: !!shopId,
  });
};