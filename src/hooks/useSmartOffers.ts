import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Offer } from './useOffers';
import { calculateDistance, formatDistance } from '@/lib/distanceCalculation';
import { useAuth } from '@/contexts/AuthContext';

export interface EnhancedOffer extends Offer {
  distanceKm?: number;
  formattedDistance?: string;
  isFavoriteShop: boolean;
}

interface UseSmartOffersOptions {
  location?: { lat: number; lng: number; radius?: number };
  initialLimit?: number;
}

export function useSmartOffers(options: UseSmartOffersOptions) {
  const { user } = useAuth();
  const pageSize = options.initialLimit || 15;

  // Fetch favorite shop IDs
  const { data: favoriteShopIds } = useInfiniteQuery({
    queryKey: ['user-favorite-shop-ids', user?.id],
    queryFn: async () => {
      if (!user?.id) return new Set<string>();
      
      const { data } = await (supabase as any)
        .from('user_favorites')
        .select('shop_id')
        .eq('user_id', user.id);
      
      return new Set<string>((data || []).map((f: any) => f.shop_id));
    },
    getNextPageParam: () => undefined,
    initialPageParam: 0,
    enabled: !!user?.id,
  });

  // Infinite offers query with smart sorting
  const infiniteQuery = useInfiniteQuery({
    queryKey: ['smart-offers', options.location, user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!options.location) return { data: [], nextOffset: undefined };

      // Get nearby shops with distance
      const { data: nearbyShops, error: shopsError } = await (supabase as any).rpc('get_nearby_shops', {
        user_lat: options.location.lat,
        user_lng: options.location.lng,
        radius_km: options.location.radius || 50
      });

      if (shopsError) throw shopsError;
      if (!nearbyShops?.length) return { data: [], nextOffset: undefined };

      // Create shop distance map
      const shopDistanceMap = new Map<string, number>();
      nearbyShops.forEach((shop: any) => {
        if (shop.latitude && shop.longitude && options.location) {
          const dist = calculateDistance(
            { lat: options.location.lat, lng: options.location.lng },
            { lat: shop.latitude, lng: shop.longitude }
          );
          shopDistanceMap.set(shop.id, dist);
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
            logo_url,
            latitude,
            longitude
          )
        `)
        .eq('is_active', true)
        .in('shop_id', nearbyShopIds)
        .gte('valid_until', new Date().toISOString())
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

      // Enhance offers with distance and favorite status
      const enhancedOffers: EnhancedOffer[] = (offers || []).map((offer: any) => {
        const distanceKm = shopDistanceMap.get(offer.shop_id);
        return {
          ...offer,
          distanceKm,
          formattedDistance: distanceKm !== undefined ? formatDistance(distanceKm) : undefined,
          isFavoriteShop: favoriteSet.has(offer.shop_id),
        };
      });

      // Smart sort: favorites first (by distance), then non-favorites (by distance)
      enhancedOffers.sort((a, b) => {
        // Favorites first
        if (a.isFavoriteShop && !b.isFavoriteShop) return -1;
        if (!a.isFavoriteShop && b.isFavoriteShop) return 1;
        
        // Then by distance (closer first)
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
    error: infiniteQuery.error,
  };
}
