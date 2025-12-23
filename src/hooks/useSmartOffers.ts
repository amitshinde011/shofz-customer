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

    // No need to invalidate smart-offers - viewedOffersSet dependency will trigger re-sort
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

      // Use RPC to get nearby offers with distance - no shop ID filtering needed
      const { data: offers, error } = await (supabase as any).rpc('get_nearby_offers', {
        user_lat: options.location.lat,
        user_lng: options.location.lng,
        radius_km: options.location.radius || 50,
        p_limit: pageSize,
        p_offset: pageParam
      });

      if (error) {
        console.error('useSmartOffers fetch error:', error);
        throw error;
      }
      if (!offers?.length) return { data: [], nextOffset: undefined };

      // Fetch favorite shop IDs for current user
      let favoriteSet = new Set<string>();
      if (user?.id) {
        const { data: favorites, error: favError } = await (supabase as any)
          .from('user_favorites')
          .select('shop_id')
          .eq('user_id', user.id);
        if (favError) {
          console.error('useSmartOffers favorites error:', favError);
        }
        favoriteSet = new Set((favorites || []).map((f: any) => f.shop_id));
      }

      // Get viewed offers from React Query cache (fallback to localStorage)
      const viewedOffers = queryClient.getQueryData<Set<string>>(VIEWED_OFFERS_KEY) || new Set(getViewedOffersFromStorage());

      // Transform RPC response and enhance offers
      const enhancedOffers: EnhancedOffer[] = offers.map((offer: any) => ({
        ...offer,
        // Transform shop fields to nested object
        shops: {
          id: offer.shop_id,
          name: offer.shop_name,
          address: offer.shop_address,
          logo_url: offer.shop_logo_url,
          is_verified: offer.shop_is_verified,
          is_featured: offer.shop_is_featured,
        },
        distanceKm: offer.distance_km,
        formattedDistance: offer.distance_km !== undefined ? formatDistance(offer.distance_km) : undefined,
        isFavoriteShop: favoriteSet.has(offer.shop_id),
        isViewed: viewedOffers.has(offer.id),
      }));

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

  // Flatten all pages and apply GLOBAL smart sorting
  // IMPORTANT: viewedOffersSet is a dependency to trigger re-sort when offers are viewed
  const allOffers = useMemo(() => {
    const flatOffers = infiniteQuery.data?.pages.flatMap(page => page.data) || [];
    
    if (flatOffers.length === 0) return [];

    // Use viewedOffersSet directly since it's a dependency
    const viewedOffers = viewedOffersSet || new Set<string>();
    
    // Update isViewed status for all offers
    const offersWithViewedStatus = flatOffers.map(offer => ({
      ...offer,
      isViewed: viewedOffers.has(offer.id),
    }));

    // Apply global smart sort
    const allViewed = offersWithViewedStatus.length > 0 && offersWithViewedStatus.every(o => o.isViewed);

    return offersWithViewedStatus.sort((a, b) => {
      const aViewed = a.isViewed;
      const bViewed = b.isViewed;

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
  }, [infiniteQuery.data, viewedOffersSet]);

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
