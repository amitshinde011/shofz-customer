import { supabase } from '@/integrations/supabase/client';

export interface SearchOptions {
  query: string;
  categories?: string[];
  priceRange?: { min: number; max: number };
  location?: { lat: number; lng: number };
  radius?: number; // in kilometers
  rating?: number;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  products: any[];
  shops: any[];
  totalProducts: number;
  totalShops: number;
}

class SearchService {
  /**
   * Enhanced full-text search across products and shops
   * Uses PostgreSQL tsvector for fast text search
   */
  async search(options: SearchOptions): Promise<{ data: SearchResult | null; error: any }> {
    try {
      const {
        query,
        categories,
        priceRange,
        location,
        radius = 10,
        rating,
        limit = 20,
        offset = 0,
      } = options;

      // Search products with full-text search
      let productsQuery = (supabase as any)
        .from('products')
        .select(`
          *,
          shops (
            id,
            name,
            rating,
            location,
            address,
            logo_url
          )
        `, { count: 'exact' })
        .eq('is_active', true)
        .order('is_featured', { ascending: false });

      // Full-text search on products
      if (query) {
        productsQuery = productsQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%,brand.ilike.%${query}%,tags.cs.{${query}}`);
      }

      // Category filter
      if (categories && categories.length > 0) {
        productsQuery = productsQuery.in('category', categories);
      }

      // Price range filter
      if (priceRange) {
        if (priceRange.min > 0) {
          productsQuery = productsQuery.gte('price', priceRange.min);
        }
        if (priceRange.max < 999999) {
          productsQuery = productsQuery.lte('price', priceRange.max);
        }
      }

      // Apply limit and offset
      productsQuery = productsQuery.range(offset, offset + limit - 1);

      const { data: products, error: productsError, count: productCount } = await productsQuery;

      if (productsError) {
        console.error('Error searching products:', productsError);
      }

      // Search shops with geospatial queries if location provided
      let shopsQuery = supabase
        .from('shops')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .order('is_featured', { ascending: false });

      // Full-text search on shops
      if (query) {
        shopsQuery = shopsQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%,categories.cs.{${query}}`);
      }

      // Rating filter
      if (rating && rating > 0) {
        shopsQuery = shopsQuery.gte('rating', rating);
      }

      // Geospatial filtering using PostGIS
      if (location) {
        const { data: nearbyShops, error: shopsError } = await supabase
          .rpc('get_nearby_shops', {
            user_lat: location.lat,
            user_lng: location.lng,
            radius_km: radius,
          });

        if (shopsError) {
          console.error('Error searching nearby shops:', shopsError);
        }

        return {
          data: {
            products: products || [],
            shops: nearbyShops || [],
            totalProducts: productCount || 0,
            totalShops: nearbyShops?.length || 0,
          },
          error: productsError || shopsError,
        };
      }

      // Apply limit for shops
      shopsQuery = shopsQuery.range(offset, offset + limit - 1);

      const { data: shops, error: shopsError, count: shopCount } = await shopsQuery;

      if (shopsError) {
        console.error('Error searching shops:', shopsError);
      }

      return {
        data: {
          products: products || [],
          shops: shops || [],
          totalProducts: productCount || 0,
          totalShops: shopCount || 0,
        },
        error: productsError || shopsError,
      };
    } catch (error) {
      console.error('Search error:', error);
      return { data: null, error };
    }
  }

  /**
   * Get search suggestions based on query
   */
  async getSuggestions(query: string, limit: number = 5): Promise<{ data: string[] | null; error: any }> {
    try {
      if (!query || query.length < 2) {
        return { data: [], error: null };
      }

      // Get product name suggestions
      const { data: products, error: productsError } = await (supabase as any)
        .from('products')
        .select('name')
        .ilike('name', `${query}%`)
        .eq('is_active', true)
        .limit(limit);

      // Get shop name suggestions
      const { data: shops, error: shopsError } = await supabase
        .from('shops')
        .select('name')
        .ilike('name', `${query}%`)
        .eq('is_active', true)
        .limit(limit);

      const suggestions = [
        ...((products as any)?.map((p: any) => p.name) || []),
        ...((shops as any)?.map((s: any) => s.name) || []),
      ];

      // Remove duplicates and limit
      const uniqueSuggestions = [...new Set(suggestions)].slice(0, limit);

      return {
        data: uniqueSuggestions,
        error: productsError || shopsError,
      };
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return { data: null, error };
    }
  }

  /**
   * Track search query for analytics
   */
  async trackSearch(query: string, userId?: string): Promise<void> {
    try {
      await supabase.from('analytics_events').insert({
        user_id: userId,
        event_type: 'search',
        event_data: { query, timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  }
}

export const searchService = new SearchService();