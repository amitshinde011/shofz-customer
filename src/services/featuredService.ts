import { supabase } from '@/integrations/supabase/client';
import { sortShopsBlended, sortProductsBlended, sortOffersBlended } from '@/lib/sortUtils';

export const featuredService = {
  async getFeaturedShops(limit: number = 6, location?: { lat: number; lng: number; radius?: number }) {
    try {
      if (!location) {
        console.warn('getFeaturedShops called without location');
        return { data: [], error: new Error('Location is required') };
      }

      const { data: nearbyShops, error } = await (supabase as any).rpc('get_nearby_shops', {
        user_lat: location.lat,
        user_lng: location.lng,
        radius_km: location.radius || 50
      });

      if (error) {
        console.error('getFeaturedShops error:', error);
        return { data: [], error };
      }

      // Sort all shops by blended ranking (featured + distance)
      const sortedShops = sortShopsBlended(nearbyShops || []).slice(0, limit);

      return {
        data: sortedShops.map((shop: any, index: number) => ({
          ...shop,
          featured_priority: (limit - index) * 10,
          featured_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })),
        error: null
      };
    } catch (error) {
      console.error('getFeaturedShops exception:', error);
      return { data: [], error };
    }
  },

  // Paginated version for infinite scroll - uses server-side pagination
  async getFeaturedShopsPaginated(limit: number = 10, offset: number = 0, location?: { lat: number; lng: number; radius?: number }) {
    try {
      if (!location) {
        return { data: [], error: new Error('Location is required') };
      }

      const { data: nearbyShops, error } = await (supabase as any).rpc('get_nearby_shops', {
        user_lat: location.lat,
        user_lng: location.lng,
        radius_km: location.radius || 50
      });

      if (error) {
        console.error('getFeaturedShopsPaginated error:', error);
        return { data: [], error };
      }

      // Sort all shops by blended ranking, then paginate
      const sortedShops = sortShopsBlended(nearbyShops || []).slice(offset, offset + limit);

      return {
        data: sortedShops.map((shop: any, index: number) => ({
          ...shop,
          featured_priority: (limit - index) * 10,
          featured_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })),
        error: null
      };
    } catch (error) {
      console.error('getFeaturedShopsPaginated exception:', error);
      return { data: [], error };
    }
  },

  async getFeaturedProducts(limit: number = 12, location?: { lat: number; lng: number; radius?: number }) {
    try {
      if (!location) {
        console.warn('getFeaturedProducts called without location');
        return { data: [], error: new Error('Location is required') };
      }

      // Use RPC to get products with distance - fetch more for blended ranking
      const { data, error } = await (supabase as any).rpc('get_nearby_products', {
        user_lat: location.lat,
        user_lng: location.lng,
        radius_km: location.radius || 50,
        p_limit: limit * 3
      });

      if (error) {
        console.error('getFeaturedProducts error:', error);
        return { data: [], error };
      }

      // Transform to match expected format and apply blended ranking
      const transformedProducts = (data || []).map((p: any) => ({
        ...p,
        shops: {
          id: p.shop_id,
          name: p.shop_name,
          address: p.shop_address,
          logo_url: p.shop_logo_url,
          is_verified: p.shop_is_verified,
          is_featured: p.shop_is_featured,
        }
      }));

      const sortedProducts = sortProductsBlended(transformedProducts).slice(0, limit);

      return { 
        data: sortedProducts.map((product: any, index: number) => ({
          ...product,
          featured_priority: (limit - index) * 10,
          featured_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })), 
        error: null 
      };
    } catch (error) {
      console.error('getFeaturedProducts exception:', error);
      return { data: [], error };
    }
  },

  // Paginated version - uses proper server-side pagination
  async getFeaturedProductsPaginated(limit: number = 10, offset: number = 0, location?: { lat: number; lng: number; radius?: number }) {
    try {
      if (!location) {
        return { data: [], error: new Error('Location is required') };
      }

      // Use RPC with proper server-side pagination
      const { data, error } = await (supabase as any).rpc('get_nearby_products', {
        user_lat: location.lat,
        user_lng: location.lng,
        radius_km: location.radius || 50,
        p_limit: limit,
        p_offset: offset
      });

      if (error) {
        console.error('getFeaturedProductsPaginated error:', error);
        return { data: [], error };
      }

      // Transform to match expected format
      const transformedProducts = (data || []).map((p: any) => ({
        ...p,
        shops: {
          id: p.shop_id,
          name: p.shop_name,
          address: p.shop_address,
          logo_url: p.shop_logo_url,
          is_verified: p.shop_is_verified,
          is_featured: p.shop_is_featured,
        }
      }));

      // Apply blended ranking on this page
      const sortedProducts = sortProductsBlended(transformedProducts);

      return { 
        data: sortedProducts.map((product: any, index: number) => ({
          ...product,
          featured_priority: (limit - index) * 10,
          featured_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })), 
        error: null 
      };
    } catch (error) {
      console.error('getFeaturedProductsPaginated exception:', error);
      return { data: [], error };
    }
  },

  async getFeaturedOffers(limit: number = 6, location?: { lat: number; lng: number; radius?: number }): Promise<{ data: any[]; error: any }> {
    try {
      if (!location) {
        console.warn('getFeaturedOffers called without location');
        return { data: [], error: new Error('Location is required') };
      }

      // Use RPC to get offers with distance - fetch more for blended ranking
      const { data, error } = await (supabase as any).rpc('get_nearby_offers', {
        user_lat: location.lat,
        user_lng: location.lng,
        radius_km: location.radius || 50,
        p_limit: limit * 3
      });

      if (error) {
        console.error('getFeaturedOffers error:', error);
        return { data: [], error };
      }

      // Transform to match expected format and apply blended ranking
      const transformedOffers = (data || []).map((o: any) => ({
        ...o,
        shops: {
          id: o.shop_id,
          name: o.shop_name,
          address: o.shop_address,
          logo_url: o.shop_logo_url,
          is_verified: o.shop_is_verified,
          is_featured: o.shop_is_featured,
        }
      }));

      const sortedOffers = sortOffersBlended(transformedOffers).slice(0, limit);

      return { 
        data: sortedOffers.map((offer: any, index: number) => ({
          ...offer,
          featured_priority: (limit - index) * 10,
          featured_until: offer.valid_until || '',
          products: [],
        })), 
        error: null 
      };
    } catch (error) {
      console.error('getFeaturedOffers exception:', error);
      return { data: [], error };
    }
  },

  // Paginated version - uses proper server-side pagination
  async getFeaturedOffersPaginated(limit: number = 10, offset: number = 0, location?: { lat: number; lng: number; radius?: number }): Promise<{ data: any[]; error: any }> {
    try {
      if (!location) {
        return { data: [], error: new Error('Location is required') };
      }

      // Use RPC with proper server-side pagination
      const { data, error } = await (supabase as any).rpc('get_nearby_offers', {
        user_lat: location.lat,
        user_lng: location.lng,
        radius_km: location.radius || 50,
        p_limit: limit,
        p_offset: offset
      });

      if (error) {
        console.error('getFeaturedOffersPaginated error:', error);
        return { data: [], error };
      }

      // Transform to match expected format
      const transformedOffers = (data || []).map((o: any) => ({
        ...o,
        shops: {
          id: o.shop_id,
          name: o.shop_name,
          address: o.shop_address,
          logo_url: o.shop_logo_url,
          is_verified: o.shop_is_verified,
          is_featured: o.shop_is_featured,
        }
      }));

      // Apply blended ranking on this page
      const sortedOffers = sortOffersBlended(transformedOffers);

      return { 
        data: sortedOffers.map((offer: any, index: number) => ({
          ...offer,
          featured_priority: (limit - index) * 10,
          featured_until: offer.valid_until || '',
          products: [],
        })), 
        error: null 
      };
    } catch (error) {
      console.error('getFeaturedOffersPaginated exception:', error);
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
