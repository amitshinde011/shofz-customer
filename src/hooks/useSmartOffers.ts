import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Offer } from './useOffers';
import { formatDistance } from '@/lib/distanceCalculation';
import { useAuth } from '@/contexts/AuthContext';

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

// Safe localStorage helper
const getViewedOffers = (): Set<string> => {
  try {
    const stored = localStorage.getItem('viewedOffers');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch {
    // Ignore localStorage errors
  }
  return new Set();
};

export function useSmartOffers(options: UseSmartOffersOptions) {
  const { user } = useAuth();
  const pageSize = options.initialLimit || 15;

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

      // Get viewed offers from localStorage
      const viewedOffers = getViewedOffers();

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

      // Smart sort: favorites first → unviewed first → by distance
      enhancedOffers.sort((a, b) => {
        // 1. Favorites first
        if (a.isFavoriteShop && !b.isFavoriteShop) return -1;
        if (!a.isFavoriteShop && b.isFavoriteShop) return 1;
        
        // 2. Unviewed first
        if (!a.isViewed && b.isViewed) return -1;
        if (a.isViewed && !b.isViewed) return 1;
        
        // 3. Then by distance (closer first)
        const distA = a.distanceKm ?? Infinity;
        const distB = b.distanceKm ?? Infinity;
        return distA - distB;
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
  };
}
