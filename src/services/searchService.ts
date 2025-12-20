import { supabase } from '@/integrations/supabase/client';
import { sortFeaturedFirst } from '@/lib/sortUtils';

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
  offers: any[];
  totalProducts: number;
  totalShops: number;
  totalOffers: number;
}

class SearchService {
  /**
   * Enhanced full-text search across products and shops
   * Uses PostgreSQL tsvector for fast text search via unified_search function
   * Falls back to client-side filtering if function doesn't exist
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

      // Try using the unified_search database function for better performance
      if (query && query.trim()) {
        try {
          const { data: unifiedResult, error: unifiedError } = await (supabase as any).rpc('unified_search', {
            search_query: query,
            user_lat: location?.lat || null,
            user_lng: location?.lng || null,
            radius_km: radius,
            category_filter: categories || null,
            price_min: priceRange?.min || null,
            price_max: priceRange?.max || null,
            rating_min: rating || null,
            result_limit: limit,
            result_offset: offset,
          });

          // If unified search succeeds, parse and return results
          if (!unifiedError && unifiedResult) {
            const parsed = typeof unifiedResult === 'string' ? JSON.parse(unifiedResult) : unifiedResult;
            return {
              data: {
                products: parsed.products || [],
                shops: parsed.shops || [],
                offers: parsed.offers || [],
                totalProducts: parsed.products?.length || 0,
                totalShops: parsed.shops?.length || 0,
                totalOffers: parsed.offers?.length || 0,
              },
              error: null,
            };
          }
        } catch (rpcError) {
          // Function doesn't exist or failed, fall back to client-side filtering
          console.log('Unified search not available, using fallback method');
        }
      }

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
        .eq('is_active', true);

      // Full-text search on products - search all important fields including specifications
      if (query) {
        productsQuery = productsQuery.or(
          `name.ilike.%${query}%,` +
          `description.ilike.%${query}%,` +
          `brand.ilike.%${query}%,` +
          `category.ilike.%${query}%,` +
          `subcategory.ilike.%${query}%,` +
          `sku.ilike.%${query}%,` +
          `meta_title.ilike.%${query}%,` +
          `meta_description.ilike.%${query}%,` +
          `tags.cs.{${query}},` +
          `specifications::text.ilike.%${query}%`
        );
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
        .eq('is_verified', true);

      // Full-text search on shops - search all important fields
      if (query) {
        shopsQuery = shopsQuery.or(
          `name.ilike.%${query}%,` +
          `description.ilike.%${query}%,` +
          `address.ilike.%${query}%,` +
          `slug.ilike.%${query}%,` +
          `delivery_notes.ilike.%${query}%,` +
          `categories.cs.{${query}}`
        );
      }

      // Rating filter
      if (rating && rating > 0) {
        shopsQuery = shopsQuery.gte('rating', rating);
      }

      // Search offers
      let offersQuery = (supabase as any)
        .from('offers')
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
        .eq('is_active', true);

      // Full-text search on offers - search all important fields including applicable_products
      if (query) {
        offersQuery = offersQuery.or(
          `title.ilike.%${query}%,` +
          `description.ilike.%${query}%,` +
          `terms_conditions.ilike.%${query}%,` +
          `offer_type.ilike.%${query}%,` +
          `discount_type.ilike.%${query}%,` +
          `applicable_categories.cs.{${query}},` +
          `applicable_products.cs.{${query}}`
        );
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

        // Filter nearby shops by query text if query exists
        let filteredShops = nearbyShops || [];
        if (query && nearbyShops) {
          const lowerQuery = query.toLowerCase();
          filteredShops = nearbyShops.filter((shop: any) => {
            return (
              shop.name?.toLowerCase().includes(lowerQuery) ||
              shop.description?.toLowerCase().includes(lowerQuery) ||
              shop.address?.toLowerCase().includes(lowerQuery) ||
              shop.slug?.toLowerCase().includes(lowerQuery) ||
              shop.delivery_notes?.toLowerCase().includes(lowerQuery) ||
              shop.categories?.some((cat: string) => cat.toLowerCase().includes(lowerQuery))
            );
          });
        }

        // Apply rating filter to nearby shops if specified
        if (rating && rating > 0 && filteredShops) {
          filteredShops = filteredShops.filter((shop: any) => shop.rating >= rating);
        }

        // Fetch offers without location filtering
        offersQuery = offersQuery.range(offset, offset + limit - 1);
        const { data: offersNearby, error: offersErrorNearby, count: offerCountNearby } = await offersQuery;

        return {
          data: {
            products: sortFeaturedFirst(products || []),
            shops: sortFeaturedFirst(filteredShops || []),
            offers: sortFeaturedFirst(offersNearby || []),
            totalProducts: productCount || 0,
            totalShops: filteredShops?.length || 0,
            totalOffers: offerCountNearby || 0,
          },
          error: productsError || shopsError || offersErrorNearby,
        };
      }

      // Apply limit for shops and offers
      shopsQuery = shopsQuery.range(offset, offset + limit - 1);
      offersQuery = offersQuery.range(offset, offset + limit - 1);

      const { data: shops, error: shopsError, count: shopCount } = await shopsQuery;
      const { data: offers, error: offersError, count: offerCount } = await offersQuery;

      if (shopsError) {
        console.error('Error searching shops:', shopsError);
      }

      if (offersError) {
        console.error('Error searching offers:', offersError);
      }

      return {
        data: {
          products: sortFeaturedFirst(products || []),
          shops: sortFeaturedFirst(shops || []),
          offers: sortFeaturedFirst(offers || []),
          totalProducts: productCount || 0,
          totalShops: shopCount || 0,
          totalOffers: offerCount || 0,
        },
        error: productsError || shopsError || offersError,
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

      // Get product suggestions - search name, brand, category, subcategory, description, tags
      const { data: products, error: productsError } = await (supabase as any)
        .from('products')
        .select('name, brand, category, subcategory, description, tags')
        .or(`name.ilike.%${query}%,brand.ilike.%${query}%,category.ilike.%${query}%,subcategory.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
        .eq('is_active', true)
        .limit(limit);

      // Get shop suggestions - search name, address, description, categories
      const { data: shops, error: shopsError } = await supabase
        .from('shops')
        .select('name, address, description, categories')
        .or(`name.ilike.%${query}%,address.ilike.%${query}%,description.ilike.%${query}%,categories.cs.{${query}}`)
        .eq('is_active', true)
        .eq('is_verified', true)
        .limit(limit);

      // Get offer suggestions - search title, description
      const { data: offers, error: offersError } = await (supabase as any)
        .from('offers')
        .select('title, description')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('is_active', true)
        .limit(Math.floor(limit / 3));

      // Combine suggestions from all sources
      const suggestions = [
        ...((products as any)?.map((p: any) => p.name) || []),
        ...((products as any)?.map((p: any) => p.brand).filter(Boolean) || []),
        ...((products as any)?.map((p: any) => p.category).filter(Boolean) || []),
        ...((products as any)?.map((p: any) => p.subcategory).filter(Boolean) || []),
        ...((shops as any)?.map((s: any) => s.name) || []),
        ...((offers as any)?.map((o: any) => o.title) || []),
      ];

      // Remove duplicates and limit
      const uniqueSuggestions = [...new Set(suggestions)].slice(0, limit);

      return {
        data: uniqueSuggestions,
        error: productsError || shopsError || offersError,
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