import { supabase } from '@/integrations/supabase/client';
import { sortShopsBlended, sortFeaturedFirst } from '@/lib/sortUtils';

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  slug?: string;
  description?: string;
  categories: string[];
  address?: string;
  phone_number?: string;
  email?: string;
  logo_url?: string;
  cover_image_url?: string;
  gallery_images: string[];
  business_hours?: any;
  location?: { lat: number; lng: number };
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  is_active: boolean;
  subscription_tier: 'basic' | 'premium' | 'enterprise';
  subscription_expires_at?: string;
  created_at: string;
  updated_at: string;
  // Delivery information
  delivery_available?: boolean;
  delivery_coverage_km?: number;
  delivery_charge_per_km?: number;
  free_delivery_above?: number;
  delivery_notes?: string;
}

export const shopService = {
  // Get all active shops with optional filters
  async getShops(options?: {
    category?: string;
    search?: string;
    location?: { lat: number; lng: number; radius?: number };
    limit?: number;
    offset?: number;
  }) {
    // If location is provided, use the nearby shops RPC
    if (options?.location) {
      const { data, error } = await this.getNearbyShops(
        { lat: options.location.lat, lng: options.location.lng },
        options.location.radius || 50
      );

      if (error) {
        console.error('Error getting nearby shops:', error);
        return { data: [], error };
      }

      let filtered = data || [];

      // Apply additional filters
      if (options?.category) {
        filtered = filtered.filter((shop: any) => 
          shop.categories?.includes(options.category)
        );
      }

      if (options?.search) {
        const searchLower = options.search.toLowerCase();
        filtered = filtered.filter((shop: any) =>
          shop.name?.toLowerCase().includes(searchLower) ||
          shop.description?.toLowerCase().includes(searchLower)
        );
      }

      // Apply offset for pagination
      if (options?.offset) {
        filtered = filtered.slice(options.offset);
      }

      if (options?.limit) {
        filtered = filtered.slice(0, options.limit);
      }

      // Data already sorted by blended ranking in getNearbyShops
      return { data: filtered, error: null };
    }

    // Otherwise, use regular query - Only verified shops
    let query = (supabase as any)
      .from('shops')
      .select('*')
      .eq('is_active', true)
      .eq('is_verified', true)
      .order('rating', { ascending: false });

    if (options?.category) {
      query = query.contains('categories', [options.category]);
    }

    if (options?.search) {
      query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const result = await query;
    // No distance info without location, use simple featured-first
    if (result.data) {
      result.data = sortFeaturedFirst(result.data);
    }
    return result;
  },

  // Get shops with total count for infinite scroll
  async getShopsWithCount(options?: {
    category?: string;
    search?: string;
    location?: { lat: number; lng: number; radius?: number };
    limit?: number;
    offset?: number;
  }): Promise<{ data: any[]; error: any; totalCount: number }> {
    if (options?.location) {
      const { data, error } = await this.getNearbyShops(
        { lat: options.location.lat, lng: options.location.lng },
        options.location.radius || 50
      );

      if (error) {
        return { data: [], error, totalCount: 0 };
      }

      let filtered = data || [];

      // Apply additional filters BEFORE calculating totalCount
      if (options?.category) {
        filtered = filtered.filter((shop: any) => 
          shop.categories?.includes(options.category)
        );
      }

      if (options?.search) {
        const searchLower = options.search.toLowerCase();
        filtered = filtered.filter((shop: any) =>
          shop.name?.toLowerCase().includes(searchLower) ||
          shop.description?.toLowerCase().includes(searchLower)
        );
      }

      // Calculate totalCount AFTER filtering
      const totalCount = filtered.length;

      // Apply offset for pagination
      const offset = options?.offset || 0;
      const limit = options?.limit || 20;
      filtered = filtered.slice(offset, offset + limit);

      // Data already sorted by blended ranking in getNearbyShops
      return { data: filtered, error: null, totalCount };
    }

    return { data: [], error: null, totalCount: 0 };
  },

  // Get shop by ID
  async getShopById(id: string) {
    console.log('shopService.getShopById called with:', id);

    // First get the shop data - Only verified shops
    const result = await (supabase as any)
      .from('shops')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .eq('is_verified', true)
      .maybeSingle();

    console.log('shopService.getShopById raw result:', result);

    // Always try to extract coordinates using RPC
    if (result.data) {
      try {
        // Call get_nearby_shops to get formatted data with coordinates
        const { data: nearbyData } = await (supabase as any).rpc('get_nearby_shops', {
          user_lat: 18.5204,  // Pune approximate coordinates
          user_lng: 73.8567,
          radius_km: 1000  // Large radius to get all shops
        });

        // Find our shop in the results
        const shopWithCoords = nearbyData?.find((s: any) => s.id === id);
        if (shopWithCoords && shopWithCoords.latitude && shopWithCoords.longitude) {
          // Transform coordinates into location object
          result.data.location = {
            lat: shopWithCoords.latitude,
            lng: shopWithCoords.longitude
          };
          
          // Also ensure delivery fields are included from RPC response
          result.data.delivery_available = shopWithCoords.delivery_available ?? result.data.delivery_available;
          result.data.delivery_coverage_km = shopWithCoords.delivery_coverage_km ?? result.data.delivery_coverage_km;
          result.data.delivery_charge_per_km = shopWithCoords.delivery_charge_per_km ?? result.data.delivery_charge_per_km;
          result.data.free_delivery_above = shopWithCoords.free_delivery_above ?? result.data.free_delivery_above;
          result.data.delivery_notes = shopWithCoords.delivery_notes ?? result.data.delivery_notes;
        } else {
          result.data.location = null;
        }
      } catch (err) {
        console.error('Error extracting coordinates:', err);
        result.data.location = null;
      }
    }

    console.log('shopService.getShopById transformed result:', result);
    return result;
  },

  // Get shop by slug - Only verified shops
  async getShopBySlug(slug: string) {
    return await (supabase as any)
      .from('shops')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .eq('is_verified', true)
      .single();
  },

  // Get shops near a location with distance calculation
  async getNearbyShops(location: { lat: number; lng: number }, radiusKm: number = 10) {
    try {
      const { data, error } = await (supabase as any).rpc('get_nearby_shops', {
        user_lat: location.lat,
        user_lng: location.lng,
        radius_km: radiusKm
      });

      if (error) {
        console.error('Error from get_nearby_shops RPC:', error);
        return { data: [], error };
      }

      // Format the data to match the Shop interface
      const formattedData = (data || []).map((shop: any) => ({
        ...shop,
        location: shop.latitude && shop.longitude 
          ? { lat: shop.latitude, lng: shop.longitude }
          : undefined
      }));

      // Apply blended ranking: combines featured status + distance
      const sortedData = sortShopsBlended(formattedData);

      console.log('Formatted nearby shops:', sortedData);
      return { data: sortedData, error: null };
    } catch (error) {
      console.error('Error calling get_nearby_shops:', error);
      return { data: [], error };
    }
  },

  // Get shop categories - Only verified shops
  async getShopCategories() {
    const { data, error } = await (supabase as any)
      .from('shops')
      .select('categories')
      .eq('is_active', true)
      .eq('is_verified', true);

    if (error) return { data: [], error };

    // Extract unique categories
    const allCategories = data.flatMap((shop: any) => shop.categories || []);
    const uniqueCategories = [...new Set(allCategories)].sort();

    return { data: uniqueCategories, error: null };
  },

  // Add shop to favorites
  async addToFavorites(userId: string, shopId: string) {
    return await (supabase as any)
      .from('user_favorites')
      .insert([{
        user_id: userId,
        shop_id: shopId,
      }]);
  },

  // Remove shop from favorites
  async removeFromFavorites(userId: string, shopId: string) {
    return await (supabase as any)
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('shop_id', shopId);
  },

  // Get user's favorite shops - Only verified shops
  async getUserFavoriteShops(userId: string) {
    return await (supabase as any)
      .from('user_favorites')
      .select(`
        *,
        shops!inner (*)
      `)
      .eq('user_id', userId)
      .eq('shops.is_active', true)
      .eq('shops.is_verified', true);
  },

  // Check if shop is favorited by user
  async isShopFavorited(userId: string, shopId: string) {
    const { data, error } = await (supabase as any)
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('shop_id', shopId)
      .single();

    return { isFavorited: !!data, error };
  },

  // Get featured shops  
  async getFeaturedShops(limit: number = 10, location?: { lat: number; lng: number; radius?: number }) {
    try {
      if (location) {
        // Get nearby shops first (already sorted by blended ranking)
        const { data: nearbyShops, error: nearbyError } = await this.getNearbyShops(
          { lat: location.lat, lng: location.lng },
          location.radius || 50
        );

        if (nearbyError) {
          console.error('Error getting nearby shops:', nearbyError);
          return { data: [], error: nearbyError };
        }

        // Filter for featured shops only
        const featuredNearby = (nearbyShops || [])
          .filter((shop: any) => shop.is_featured)
          .slice(0, limit);

        return { data: featuredNearby, error: null };
      }

      // Location is required - this shouldn't happen with LocationPermissionGate
      console.warn('getFeaturedShops called without location');
      return { data: [], error: new Error('Location is required') };
    } catch (error) {
      console.error('Error calling get_featured_shops:', error);
      return { data: [], error };
    }
  },

  // Get shop reviews
  async getShopReviews(shopId: string, limit: number = 10, offset: number = 0) {
    return await (supabase as any)
      .from('reviews')
      .select(`
        *,
        users:customer_id (
          id,
          name,
          profile_image_url
        )
      `)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
  },
};
