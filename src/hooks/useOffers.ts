import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sortOffersBlended, sortFeaturedFirst } from '@/lib/sortUtils';

export interface Offer {
  id: string;
  title: string;
  description?: string;
  offer_type: string;
  discount_type: string;
  discount_value: number;
  discount_percentage?: number;
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
  distance_km?: number;
  shops?: {
    id: string;
    name: string;
    address?: string;
    logo_url?: string;
    location?: { lat: number; lng: number };
    is_verified?: boolean;
    is_featured?: boolean;
  };
  products?: {
    id: string;
    name: string;
    price: number;
    images?: string[];
  }[];
}

// Transform RPC response to Offer interface
const transformRpcOfferToOffer = (rpcOffer: any): Offer => ({
  id: rpcOffer.id,
  title: rpcOffer.title,
  description: rpcOffer.description,
  offer_type: rpcOffer.offer_type,
  discount_type: rpcOffer.discount_type,
  discount_value: rpcOffer.discount_value,
  discount_percentage: rpcOffer.discount_percentage,
  valid_from: rpcOffer.valid_from,
  valid_until: rpcOffer.valid_until,
  applicable_products: rpcOffer.applicable_products,
  applicable_categories: rpcOffer.applicable_categories,
  is_active: rpcOffer.is_active,
  is_featured: rpcOffer.is_featured,
  created_at: rpcOffer.created_at,
  updated_at: rpcOffer.updated_at,
  shop_id: rpcOffer.shop_id,
  image_url: rpcOffer.image_url,
  distance_km: rpcOffer.distance_km,
  shops: {
    id: rpcOffer.shop_id,
    name: rpcOffer.shop_name,
    address: rpcOffer.shop_address,
    logo_url: rpcOffer.shop_logo_url,
    is_verified: rpcOffer.shop_is_verified,
    is_featured: rpcOffer.shop_is_featured,
  },
  products: [],
});

// Fetch product details for offers with applicable_products
const enrichOffersWithProducts = async (offers: Offer[]): Promise<Offer[]> => {
  return Promise.all(
    offers.map(async (offer) => {
      if (offer.applicable_products && offer.applicable_products.length > 0) {
        const { data: products } = await (supabase as any)
          .from('products')
          .select('id, name, price, images')
          .in('id', offer.applicable_products);
        return { ...offer, products: products || [] };
      }
      return offer;
    })
  );
};

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
        if (error) {
          console.error('Error fetching offers by shopId:', error);
          throw error;
        }

        const offersWithProducts = await enrichOffersWithProducts(offers || []);
        return { data: sortFeaturedFirst(offersWithProducts), error: null };
      }

      // Use RPC for location-based queries
      if (options?.location) {
        const { data: rpcOffers, error } = await (supabase as any).rpc('get_nearby_offers', {
          user_lat: options.location.lat,
          user_lng: options.location.lng,
          radius_km: options.location.radius || 50,
          p_limit: options.limit || 100,
          p_offset: options.offset || 0,
        });

        if (error) {
          console.error('Error fetching nearby offers:', error);
          throw error;
        }

        if (!rpcOffers || rpcOffers.length === 0) {
          return { data: [], error: null };
        }

        const offers = rpcOffers.map(transformRpcOfferToOffer);
        const offersWithProducts = await enrichOffersWithProducts(offers);
        return { data: sortOffersBlended(offersWithProducts), error: null };
      }

      return { data: [], error: null };
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!(options?.location || options?.shopId),
  });
};

export const useActiveOffers = (limit?: number, location?: { lat: number; lng: number; radius?: number }) => {
  return useQuery({
    queryKey: ['offers', 'active', limit, location],
    queryFn: async () => {
      if (!location) {
        return { data: [], error: null };
      }

      const { data: rpcOffers, error } = await (supabase as any).rpc('get_nearby_offers', {
        user_lat: location.lat,
        user_lng: location.lng,
        radius_km: location.radius || 50,
        p_limit: limit || 10,
        p_offset: 0,
      });

      if (error) {
        console.error('Error fetching active offers:', error);
        throw error;
      }

      if (!rpcOffers || rpcOffers.length === 0) {
        return { data: [], error: null };
      }

      const offers = rpcOffers.map(transformRpcOfferToOffer);
      const offersWithProducts = await enrichOffersWithProducts(offers);
      return { data: sortOffersBlended(offersWithProducts), error: null };
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!location,
  });
};

// Infinite scroll version using RPC
export const useInfiniteOffers = (options?: {
  shopId?: string;
  active?: boolean;
  location?: { lat: number; lng: number; radius?: number };
}) => {
  const PAGE_SIZE = 20;

  return useInfiniteQuery({
    queryKey: ['offers-infinite', options],
    queryFn: async ({ pageParam = 0 }) => {
      // If shopId is provided without location, query directly
      if (options?.shopId && !options?.location) {
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
          .eq('shop_id', options.shopId)
          .eq('is_active', true)
          .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`)
          .order('created_at', { ascending: false })
          .range(pageParam, pageParam + PAGE_SIZE - 1);

        if (error) {
          console.error('Error fetching offers by shopId:', error);
          throw error;
        }

        const offersWithProducts = await enrichOffersWithProducts(offers || []);
        return { data: sortFeaturedFirst(offersWithProducts), error: null };
      }

      // Use RPC for location-based queries - single efficient call
      if (options?.location) {
        const { data: rpcOffers, error } = await (supabase as any).rpc('get_nearby_offers', {
          user_lat: options.location.lat,
          user_lng: options.location.lng,
          radius_km: options.location.radius || 50,
          p_limit: PAGE_SIZE,
          p_offset: pageParam,
        });

        if (error) {
          console.error('Error fetching nearby offers via RPC:', error);
          throw error;
        }

        if (!rpcOffers || rpcOffers.length === 0) {
          return { data: [], error: null };
        }

        const offers = rpcOffers.map(transformRpcOfferToOffer);
        const offersWithProducts = await enrichOffersWithProducts(offers);
        // Apply blended sorting to each page (global sorting done in consumer)
        return { data: sortOffersBlended(offersWithProducts), error: null };
      }

      return { data: [], error: null };
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((sum, page) => sum + (page.data?.length || 0), 0);
      const hasMore = lastPage.data && lastPage.data.length === PAGE_SIZE;
      return hasMore ? loadedCount : undefined;
    },
    initialPageParam: 0,
    staleTime: 10 * 60 * 1000,
    enabled: !!(options?.location || options?.shopId),
  });
};
