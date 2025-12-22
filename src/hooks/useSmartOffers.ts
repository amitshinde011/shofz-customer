import { useMemo, useCallback } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Offer } from './useOffers';
import { formatDistance } from '@/lib/distanceCalculation';
import { useAuth } from '@/contexts/AuthContext';
import { calculateCombinedScore } from '@/lib/sortUtils';

export interface EnhancedOffer extends Offer {
  distanceKm?: number;
  formattedDistance?: string;
  isFavoriteShop: boolean;
  isViewed?: boolean;
}

interface UseSmartOffersOptions {
  location?: { lat: number; lng: number; radius?: number };
  initialLimit?: number;
}

// Query key for viewed offers cache
const VIEWED_OFFERS_KEY = ['viewed-offers-cache'];

// Safe localStorage helper for initial load
const getViewedOffersFromStorage = (): string[] => {
  try {
    const stored = localStorage.getItem('viewedOffers');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Ignore localStorage errors
  }
  return [];
};

// Hook to get viewed offers from React Query cache
export function useViewedOffers() {
  return useQuery({
    queryKey: VIEWED_OFFERS_KEY,
    queryFn: () => new Set(getViewedOffersFromStorage()),
    staleTime: Infinity, // Never refetch from localStorage, cache is source of truth
    gcTime: Infinity, // Keep in cache forever during session
  });
}

// Hook to mark an offer as viewed - updates cache and triggers re-sort
export function useMarkOfferViewed() {
  const queryClient = useQueryClient();

  return useCallback((offerId: string) => {
    // Update React Query cache
    queryClient.setQueryData<Set<string>>(VIEWED_OFFERS_KEY, (old) => {
      const newSet = new Set(old || []);
      newSet.add(offerId);
      
      // Also persist to localStorage as backup
      try {
        localStorage.setItem('viewedOffers', JSON.stringify([...newSet]));
      } catch {
        // Ignore localStorage errors
      }
      
      return newSet;
    });

    // Invalidate smart-offers to trigger re-sort with new viewed status
    queryClient.invalidateQueries({ queryKey: ['smart-offers'] });
  }, [queryClient]);
}

export function useSmartOffers(options: UseSmartOffersOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pageSize = options.initialLimit || 15;

  // Get viewed offers from cache
  const { data: viewedOffersSet } = useViewedOffers();

  // Infinite offers query with smart sorting
  const infiniteQuery = useInfiniteQuery({
    queryKey: ['smart-offers', options.location, user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!options.location) return { data: [], nextOffset: undefined };

      // Get nearby shops with distance (RPC already calculates distance_km)
      const { data: nearbyShops, error: shopsError } = await (supabase as any).rpc('get_nearby_shops', {
        user_lat: options.location.lat,
        user_lng: options.location.lng,
        radius_km: options.location.radius || 50
      });

      if (shopsError) throw shopsError;
      if (!nearbyShops?.length) return { data: [], nextOffset: undefined };

      // Create shop distance map using RPC-provided distance_km (no recalculation)
      const shopDistanceMap = new Map<string, number>();
      nearbyShops.forEach((shop: any) => {
        if (shop.distance_km !== undefined && shop.distance_km !== null) {
          shopDistanceMap.set(shop.id, shop.distance_km);
        }
      });

      const nearbyShopIds = nearbyShops.map((s: any) => s.id);

      // Fetch offers from nearby shops
      const { data: offers, error } = await (supabase as any)
        .from('offers')
        .select(`
          *,
          shops (
            id,
            name,
            address,
            logo_url
          )
        `)
        .eq('is_active', true)
        .in('shop_id', nearbyShopIds)
        .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + pageSize - 1);

      if (error) throw error;

      // Fetch favorite shop IDs for current user
      let favoriteSet = new Set<string>();
      if (user?.id) {
        const { data: favorites } = await (supabase as any)
          .from('user_favorites')
          .select('shop_id')
          .eq('user_id', user.id);
        favoriteSet = new Set((favorites || []).map((f: any) => f.shop_id));
      }

      // Get viewed offers from React Query cache (fallback to localStorage)
      const viewedOffers = queryClient.getQueryData<Set<string>>(VIEWED_OFFERS_KEY) || new Set(getViewedOffersFromStorage());

      // Enhance offers with distance, favorite status, and viewed status
      const enhancedOffers: EnhancedOffer[] = (offers || []).map((offer: any) => {
        const distanceKm = shopDistanceMap.get(offer.shop_id);
        return {
          ...offer,
          distanceKm,
          formattedDistance: distanceKm !== undefined ? formatDistance(distanceKm) : undefined,
          isFavoriteShop: favoriteSet.has(offer.shop_id),
          isViewed: viewedOffers.has(offer.id),
        };
      });

      // Smart sort with blended ranking:
      // - Check if all offers are viewed
      // - If not all viewed: favorites+unviewed first (blended), then unviewed (blended), then viewed (blended)
      // - If all viewed: re-sort everything by blended ranking only
      const allViewed = enhancedOffers.length > 0 && enhancedOffers.every(o => viewedOffers.has(o.id));

      enhancedOffers.sort((a, b) => {
        const aViewed = viewedOffers.has(a.id);
        const bViewed = viewedOffers.has(b.id);

        // Calculate blended scores for both
        const scoreA = calculateCombinedScore({ is_featured: a.is_featured, distance_km: a.distanceKm });
        const scoreB = calculateCombinedScore({ is_featured: b.is_featured, distance_km: b.distanceKm });

        if (allViewed) {
          // All offers viewed - sort by blended ranking only
          return scoreB - scoreA;
        }

        // Not all viewed - apply grouping logic
        // Group 1: Favorite shop + unviewed (sorted by blended)
        // Group 2: Non-favorite + unviewed (sorted by blended)
        // Group 3: All viewed (sorted by blended)
        
        const aGroup = aViewed ? 3 : (a.isFavoriteShop ? 1 : 2);
        const bGroup = bViewed ? 3 : (b.isFavoriteShop ? 1 : 2);

        // Sort by group first
        if (aGroup !== bGroup) {
          return aGroup - bGroup;
        }

        // Within same group, sort by blended score (higher = better)
        return scoreB - scoreA;
      });

      const hasMore = offers?.length === pageSize;
      return { 
        data: enhancedOffers, 
        nextOffset: hasMore ? pageParam + pageSize : undefined 
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    staleTime: 10 * 60 * 1000,
    enabled: !!options.location,
  });

  // Flatten all pages into single array
  const allOffers = useMemo(() => {
    return infiniteQuery.data?.pages.flatMap(page => page.data) || [];
  }, [infiniteQuery.data]);

  return {
    offers: allOffers,
    isLoading: infiniteQuery.isLoading,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    hasNextPage: infiniteQuery.hasNextPage,
    fetchNextPage: infiniteQuery.fetchNextPage,
    error: infiniteQuery.error as Error | null,
    viewedOffers: viewedOffersSet,
  };
}
