import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sortOffersBlended, enrichWithDistance, sortFeaturedFirst } from '@/lib/sortUtils';

export interface Offer {
  id: string;
  title: string;
  description?: string;
  offer_type: string;
  discount_type: string;
  discount_value: number;
  minimum_order_amount?: number;
  max_uses?: number;
  current_uses?: number;
  valid_from: string;
  valid_until?: string;
  applicable_products?: string[];
  applicable_categories?: string[];
  is_active: boolean;
  is_featured?: boolean;
  created_at: string;
  updated_at: string;
  shop_id: string;
  image_url?: string;
  shops?: {
    id: string;
    name: string;
    address?: string;
    logo_url?: string;
    location?: { lat: number; lng: number };
  };
  products?: {
    id: string;
    name: string;
    price: number;
    images?: string[];
  }[];
}

export const useOffers = (options?: {
  shopId?: string;
  active?: boolean;
  location?: { lat: number; lng: number; radius?: number };
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: ['offers', options],
    queryFn: async () => {
      // If shopId is provided without location, query directly
      if (options?.shopId && !options?.location) {
        let query = (supabase as any)
          .from('offers')
          .select(`
            *,
            shops (
              id,
              name,
              address,
              logo_url,
              location
            )
          `)
          .eq('shop_id', options.shopId)
          .eq('is_active', true)
          .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`)
          .order('created_at', { ascending: false });

        if (options?.limit) {
          query = query.limit(options.limit);
        }

        if (options?.offset) {
          query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
        }

        const { data: offers, error } = await query;

        if (error) throw error;

        // Fetch product details for offers with applicable_products
        const offersWithProducts = await Promise.all(
          (offers || []).map(async (offer: any) => {
            if (offer.applicable_products && offer.applicable_products.length > 0) {
              const { data: products } = await (supabase as any)
                .from('products')
                .select('id, name, price, images')
                .in('id', offer.applicable_products);

              return { ...offer, products: products || [] };
            }
            return { ...offer, products: [] };
          })
        );

        // No distance info, use simple featured-first sorting
        return { data: sortFeaturedFirst(offersWithProducts), error: null };
      }

      // If location is provided, filter by nearby shops
      if (options?.location) {
        const { data: nearbyShops, error: shopsError } = await (supabase as any).rpc('get_nearby_shops', {
          user_lat: options.location.lat,
          user_lng: options.location.lng,
          radius_km: options.location.radius || 50
        });

        if (shopsError) throw shopsError;

        const nearbyShopIds = nearbyShops?.map((s: any) => s.id) || [];
        
        if (nearbyShopIds.length === 0) {
          return { data: [], error: null };
        }

        let query = (supabase as any)
          .from('offers')
          .select(`
            *,
            shops (
              id,
              name,
              address,
              logo_url,
              location
            )
          `)
          .eq('is_active', true)
          .in('shop_id', nearbyShopIds)
          .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`)
          .order('created_at', { ascending: false });

        if (options?.shopId) {
          query = query.eq('shop_id', options.shopId);
        }

        if (options?.limit) {
          query = query.limit(options.limit);
        }

        if (options?.offset) {
          query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
        }

        const { data: offers, error } = await query;

        if (error) throw error;

        // Fetch product details for offers with applicable_products
        const offersWithProducts = await Promise.all(
          (offers || []).map(async (offer: any) => {
            if (offer.applicable_products && offer.applicable_products.length > 0) {
              const { data: products } = await (supabase as any)
                .from('products')
                .select('id, name, price, images')
                .in('id', offer.applicable_products);

              return { ...offer, products: products || [] };
            }
            return { ...offer, products: [] };
          })
        );

        // Enrich with distance and apply blended ranking
        const enrichedOffers = enrichWithDistance(offersWithProducts, nearbyShops);
        return { data: sortOffersBlended(enrichedOffers), error: null };
      }

      // No location provided - return empty
      return { data: [], error: null };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!(options?.location || options?.shopId),
  });
};

export const useActiveOffers = (limit?: number, location?: { lat: number; lng: number; radius?: number }) => {
  return useQuery({
    queryKey: ['offers', 'active', limit, location],
    queryFn: async () => {
      if (location) {
        const { data: nearbyShops, error: shopsError } = await (supabase as any).rpc('get_nearby_shops', {
          user_lat: location.lat,
          user_lng: location.lng,
          radius_km: location.radius || 50
        });

        if (shopsError) throw shopsError;

        const nearbyShopIds = nearbyShops?.map((s: any) => s.id) || [];
        
        if (nearbyShopIds.length === 0) {
          return { data: [], error: null };
        }

        const { data: offers, error } = await (supabase as any)
          .from('offers')
          .select(`
            *,
            shops (
              id,
              name,
              address,
              logo_url,
              location
            )
          `)
          .eq('is_active', true)
          .in('shop_id', nearbyShopIds)
          .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`)
          .order('created_at', { ascending: false })
          .limit(limit || 10);

        if (error) throw error;

        // Fetch product details for offers with applicable_products
        const offersWithProducts = await Promise.all(
          (offers || []).map(async (offer: any) => {
            if (offer.applicable_products && offer.applicable_products.length > 0) {
              const { data: products } = await (supabase as any)
                .from('products')
                .select('id, name, price, images')
                .in('id', offer.applicable_products);

              return { ...offer, products: products || [] };
            }
            return { ...offer, products: [] };
          })
        );

        // Enrich with distance and apply blended ranking
        const enrichedOffers = enrichWithDistance(offersWithProducts, nearbyShops);
        return { data: sortOffersBlended(enrichedOffers), error: null };
      }

      return { data: [], error: null };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!location,
  });
};

// Infinite scroll version
export const useInfiniteOffers = (options?: {
  shopId?: string;
  active?: boolean;
  location?: { lat: number; lng: number; radius?: number };
}) => {
  return useInfiniteQuery({
    queryKey: ['offers-infinite', options],
    queryFn: async ({ pageParam = 0 }) => {
      // If shopId is provided without location, query directly
      if (options?.shopId && !options?.location) {
        let query = (supabase as any)
          .from('offers')
          .select(`
            *,
            shops (
              id,
              name,
              address,
              logo_url,
              location
            )
          `)
          .eq('shop_id', options.shopId)
          .eq('is_active', true)
          .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`)
          .order('created_at', { ascending: false })
          .range(pageParam, pageParam + 19);

        const { data: offers, error } = await query;
        if (error) throw error;

        const offersWithProducts = await Promise.all(
          (offers || []).map(async (offer: any) => {
            if (offer.applicable_products && offer.applicable_products.length > 0) {
              const { data: products } = await (supabase as any)
                .from('products')
                .select('id, name, price, images')
                .in('id', offer.applicable_products);
              return { ...offer, products: products || [] };
            }
            return { ...offer, products: [] };
          })
        );

        // No distance info, use simple featured-first sorting
        return { data: sortFeaturedFirst(offersWithProducts), error: null };
      }

      // If location is provided, filter by nearby shops
      if (options?.location) {
        const { data: nearbyShops, error: shopsError } = await (supabase as any).rpc('get_nearby_shops', {
          user_lat: options.location.lat,
          user_lng: options.location.lng,
          radius_km: options.location.radius || 50
        });

        if (shopsError) throw shopsError;

        const nearbyShopIds = nearbyShops?.map((s: any) => s.id) || [];
        
        if (nearbyShopIds.length === 0) {
          return { data: [], error: null };
        }

        let query = (supabase as any)
          .from('offers')
          .select(`
            *,
            shops (
              id,
              name,
              address,
              logo_url,
              location
            )
          `)
          .eq('is_active', true)
          .in('shop_id', nearbyShopIds)
          .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`)
          .order('created_at', { ascending: false })
          .range(pageParam, pageParam + 19);

        if (options?.shopId) {
          query = query.eq('shop_id', options.shopId);
        }

        const { data: offers, error } = await query;
        if (error) throw error;

        const offersWithProducts = await Promise.all(
          (offers || []).map(async (offer: any) => {
            if (offer.applicable_products && offer.applicable_products.length > 0) {
              const { data: products } = await (supabase as any)
                .from('products')
                .select('id, name, price, images')
                .in('id', offer.applicable_products);
              return { ...offer, products: products || [] };
            }
            return { ...offer, products: [] };
          })
        );

        // Enrich with distance and apply blended ranking
        const enrichedOffers = enrichWithDistance(offersWithProducts, nearbyShops);
        return { data: sortOffersBlended(enrichedOffers), error: null };
      }

      return { data: [], error: null };
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((sum, page) => sum + (page.data?.length || 0), 0);
      const hasMore = lastPage.data && lastPage.data.length === 20;
      return hasMore ? loadedCount : undefined;
    },
    initialPageParam: 0,
    staleTime: 10 * 60 * 1000,
    enabled: !!(options?.location || options?.shopId),
  });
};
