import { supabase } from '@/integrations/supabase/client';

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

        const featuredNearbyShops = (nearbyShops || [])
          .filter((shop: any) => shop.is_featured)
          .slice(0, limit);

        return {
          data: featuredNearbyShops.map((shop: any, index: number) => ({
            ...shop,
            featured_priority: (limit - index) * 10,
            featured_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })),
          error: null
        };
      }

      // Location is required - this shouldn't happen with LocationPermissionGate
      console.warn('getFeaturedShops called without location');
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
          .limit(limit);

        if (error) return { data: [], error };

        return { 
          data: (data || []).map((product, index) => ({
            ...product,
            featured_priority: (limit - index) * 10,
            featured_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })), 
          error: null 
        };
      }

      // Location is required - this shouldn't happen with LocationPermissionGate
      console.warn('getFeaturedProducts called without location');
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
          .limit(limit);

        if (result.error) return { data: [], error: result.error };

        return { 
          data: (result.data || []).map((offer: any, index: number) => ({
            ...offer,
            featured_priority: (limit - index) * 10,
            featured_until: offer.valid_until || '',
            products: [],
          })), 
          error: null 
        };
      }

      // Location is required - this shouldn't happen with LocationPermissionGate
      console.warn('getFeaturedOffers called without location');
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