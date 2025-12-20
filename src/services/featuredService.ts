import { supabase } from '@/integrations/supabase/client';
import { sortShopsBlended, sortProductsBlended, sortOffersBlended, enrichWithDistance } from '@/lib/sortUtils';

export const featuredService = {
  async getFeaturedShops(limit: number = 6, location?: { lat: number; lng: number; radius?: number }) {
    try {
      if (location) {
        const { data: nearbyShops, error } = await (supabase as any).rpc('get_nearby_shops', {
          user_lat: location.lat,
          user_lng: location.lng,
          radius_km: location.radius || 50
        });

        if (error) return { data: [], error };

        // Filter for featured only, then apply blended ranking
        const featuredShops = (nearbyShops || []).filter((shop: any) => shop.is_featured);
        const sortedFeatured = sortShopsBlended(featuredShops).slice(0, limit);

        return {
          data: sortedFeatured.map((shop: any, index: number) => ({
            ...shop,
            featured_priority: (limit - index) * 10,
            featured_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })),
          error: null
        };
      }

      console.warn('getFeaturedShops called without location');
      return { data: [], error: new Error('Location is required') };
    } catch (error) {
      return { data: [], error };
    }
  },

  // Paginated version for infinite scroll
  async getFeaturedShopsPaginated(limit: number = 10, offset: number = 0, location?: { lat: number; lng: number; radius?: number }) {
    try {
      if (location) {
        const { data: nearbyShops, error } = await (supabase as any).rpc('get_nearby_shops', {
          user_lat: location.lat,
          user_lng: location.lng,
          radius_km: location.radius || 50
        });

        if (error) return { data: [], error };

        // Filter for featured only, apply blended ranking, then paginate
        const featuredShops = (nearbyShops || []).filter((shop: any) => shop.is_featured);
        const sortedFeatured = sortShopsBlended(featuredShops).slice(offset, offset + limit);

        return {
          data: sortedFeatured.map((shop: any, index: number) => ({
            ...shop,
            featured_priority: (limit - index) * 10,
            featured_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })),
          error: null
        };
      }

      return { data: [], error: new Error('Location is required') };
    } catch (error) {
      return { data: [], error };
    }
  },

  async getFeaturedProducts(limit: number = 12, location?: { lat: number; lng: number; radius?: number }) {
    try {
      if (location) {
        const { data: nearbyShops, error: shopsError } = await (supabase as any).rpc('get_nearby_shops', {
          user_lat: location.lat,
          user_lng: location.lng,
          radius_km: location.radius || 50
        });

        if (shopsError) return { data: [], error: shopsError };

        const nearbyShopIds = nearbyShops?.map((s: any) => s.id) || [];
        
        if (nearbyShopIds.length === 0) {
          return { data: [], error: null };
        }

        const { data, error } = await (supabase as any)
          .from('products')
          .select('*, shops!inner(id, name, address, logo_url, is_verified)')
          .eq('is_featured', true)
          .eq('is_active', true)
          .in('shop_id', nearbyShopIds)
          .order('created_at', { ascending: false })
          .limit(limit * 2); // Fetch more to allow for ranking

        if (error) return { data: [], error };

        // Enrich with distance and apply blended ranking
        const enrichedProducts = enrichWithDistance(data || [], nearbyShops);
        const sortedProducts = sortProductsBlended(enrichedProducts).slice(0, limit);

        return { 
          data: sortedProducts.map((product: any, index: number) => ({
            ...product,
            featured_priority: (limit - index) * 10,
            featured_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })), 
          error: null 
        };
      }

      console.warn('getFeaturedProducts called without location');
      return { data: [], error: new Error('Location is required') };
    } catch (error) {
      return { data: [], error };
    }
  },

  // Paginated version for infinite scroll
  async getFeaturedProductsPaginated(limit: number = 10, offset: number = 0, location?: { lat: number; lng: number; radius?: number }) {
    try {
      if (location) {
        const { data: nearbyShops, error: shopsError } = await (supabase as any).rpc('get_nearby_shops', {
          user_lat: location.lat,
          user_lng: location.lng,
          radius_km: location.radius || 50
        });

        if (shopsError) return { data: [], error: shopsError };

        const nearbyShopIds = nearbyShops?.map((s: any) => s.id) || [];
        
        if (nearbyShopIds.length === 0) {
          return { data: [], error: null };
        }

        const { data, error } = await (supabase as any)
          .from('products')
          .select('*, shops!inner(id, name, address, logo_url, is_verified)')
          .eq('is_featured', true)
          .eq('is_active', true)
          .in('shop_id', nearbyShopIds)
          .order('created_at', { ascending: false });

        if (error) return { data: [], error };

        // Enrich with distance, apply blended ranking, then paginate
        const enrichedProducts = enrichWithDistance(data || [], nearbyShops);
        const sortedProducts = sortProductsBlended(enrichedProducts).slice(offset, offset + limit);

        return { 
          data: sortedProducts.map((product: any, index: number) => ({
            ...product,
            featured_priority: (limit - index) * 10,
            featured_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })), 
          error: null 
        };
      }

      return { data: [], error: new Error('Location is required') };
    } catch (error) {
      return { data: [], error };
    }
  },

  async getFeaturedOffers(limit: number = 6, location?: { lat: number; lng: number; radius?: number }): Promise<{ data: any[]; error: any }> {
    try {
      if (location) {
        const { data: nearbyShops, error: shopsError } = await (supabase as any).rpc('get_nearby_shops', {
          user_lat: location.lat,
          user_lng: location.lng,
          radius_km: location.radius || 50
        });

        if (shopsError) return { data: [], error: shopsError };

        const nearbyShopIds = nearbyShops?.map((s: any) => s.id) || [];
        
        if (nearbyShopIds.length === 0) {
          return { data: [], error: null };
        }

        const result = await (supabase as any)
          .from('offers')
          .select('*')
          .eq('is_featured', true)
          .eq('is_active', true)
          .in('shop_id', nearbyShopIds)
          .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`)
          .order('created_at', { ascending: false })
          .limit(limit * 2); // Fetch more to allow for ranking

        if (result.error) return { data: [], error: result.error };

        // Enrich with distance and apply blended ranking
        const enrichedOffers = enrichWithDistance(result.data || [], nearbyShops);
        const sortedOffers = sortOffersBlended(enrichedOffers).slice(0, limit);

        return { 
          data: sortedOffers.map((offer: any, index: number) => ({
            ...offer,
            featured_priority: (limit - index) * 10,
            featured_until: offer.valid_until || '',
            products: [],
          })), 
          error: null 
        };
      }

      console.warn('getFeaturedOffers called without location');
      return { data: [], error: new Error('Location is required') };
    } catch (error) {
      return { data: [], error };
    }
  },

  // Paginated version for infinite scroll
  async getFeaturedOffersPaginated(limit: number = 10, offset: number = 0, location?: { lat: number; lng: number; radius?: number }): Promise<{ data: any[]; error: any }> {
    try {
      if (location) {
        const { data: nearbyShops, error: shopsError } = await (supabase as any).rpc('get_nearby_shops', {
          user_lat: location.lat,
          user_lng: location.lng,
          radius_km: location.radius || 50
        });

        if (shopsError) return { data: [], error: shopsError };

        const nearbyShopIds = nearbyShops?.map((s: any) => s.id) || [];
        
        if (nearbyShopIds.length === 0) {
          return { data: [], error: null };
        }

        // Include shop data in the query
        const result = await (supabase as any)
          .from('offers')
          .select('*, shops(id, name, logo_url, location, address)')
          .eq('is_featured', true)
          .eq('is_active', true)
          .in('shop_id', nearbyShopIds)
          .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`)
          .order('created_at', { ascending: false });

        if (result.error) return { data: [], error: result.error };

        // Enrich with distance, apply blended ranking, then paginate
        const enrichedOffers = enrichWithDistance(result.data || [], nearbyShops);
        const sortedOffers = sortOffersBlended(enrichedOffers).slice(offset, offset + limit);

        return { 
          data: sortedOffers.map((offer: any, index: number) => ({
            ...offer,
            featured_priority: (limit - index) * 10,
            featured_until: offer.valid_until || '',
            products: [],
          })), 
          error: null 
        };
      }

      return { data: [], error: new Error('Location is required') };
    } catch (error) {
      return { data: [], error };
    }
  },

  async getAllFeaturedContent(location?: { lat: number; lng: number; radius?: number }) {
    const [shops, products, offers] = await Promise.all([
      this.getFeaturedShops(6, location),
      this.getFeaturedProducts(12, location),
      this.getFeaturedOffers(6, location),
    ]);

    return {
      shops: shops.data || [],
      products: products.data || [],
      offers: offers.data || [],
    };
  },
};
