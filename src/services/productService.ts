import { supabase } from '@/integrations/supabase/client';
import { sortProductsBlended, sortFeaturedFirst } from '@/lib/sortUtils';

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  sku?: string;
  price: number;
  compare_at_price?: number;
  images: string[];
  specifications?: any;
  tags: string[];
  stock_quantity: number | null;
  low_stock_threshold: number;
  inventory_tracking: boolean;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  shops?: {
    id: string;
    name: string;
    address?: string;
    logo_url?: string;
    is_verified?: boolean;
    rating?: number;
    location?: { lat: number; lng: number };
    delivery_available?: boolean;
    delivery_coverage_km?: number;
    delivery_charge_per_km?: number;
    free_delivery_above?: number;
    delivery_notes?: string;
  };
}

export const productService = {
  // Search products with filters
  async searchProducts(options?: {
    query?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    shopId?: string;
    featured?: boolean;
    location?: { lat: number; lng: number; radius?: number };
    limit?: number;
    offset?: number;
  }) {
    // If shopId is provided without location, query directly
    if (options?.shopId && !options?.location) {
      let query = (supabase as any)
        .from('products')
        .select(`
          *,
          shops (
            id,
            name,
            address,
            rating,
            business_hours,
            total_reviews
          )
        `)
        .eq('shop_id', options.shopId)
        .eq('is_active', true);

      if (options?.query) {
        query = query.or(`name.ilike.%${options.query}%,description.ilike.%${options.query}%`);
      }

      if (options?.category) {
        query = query.eq('category', options.category);
      }

      if (options?.minPrice !== undefined) {
        query = query.gte('price', options.minPrice);
      }

      if (options?.maxPrice !== undefined) {
        query = query.lte('price', options.maxPrice);
      }

      if (options?.featured) {
        query = query.eq('is_featured', true);
      }

      query = query.order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
      }

      const result = await query;
      // No distance info, use simple featured-first sorting
      if (result.data) {
        result.data = sortFeaturedFirst(result.data);
      }
      return result;
    }

    // If location is provided, use RPC to get nearby products
    if (options?.location) {
      const { data, error } = await (supabase as any).rpc('get_nearby_products', {
        user_lat: options.location.lat,
        user_lng: options.location.lng,
        radius_km: options.location.radius || 50,
        p_category: options?.category || null,
        p_query: options?.query || null,
        p_min_price: options?.minPrice || null,
        p_max_price: options?.maxPrice || null,
        p_featured: options?.featured || null,
        p_limit: options?.limit || 100,
        p_offset: options?.offset || 0
      });

      if (error) {
        console.error('Error fetching nearby products:', error);
        return { data: [], error };
      }

      // Transform RPC response to match expected format
      const transformedProducts = (data || []).map((p: any) => ({
        ...p,
        shops: {
          id: p.shop_id,
          name: p.shop_name,
          address: p.shop_address,
          logo_url: p.shop_logo_url,
          is_verified: p.shop_is_verified,
          rating: p.shop_rating,
        }
      }));

      // Apply blended ranking (featured + distance)
      const sortedProducts = sortProductsBlended(transformedProducts);

      return { data: sortedProducts, error: null };
    }

    // No location provided - return empty (enforce location-based filtering)
    return { data: [], error: null };
  },

  // Get product by ID
  async getProductById(id: string) {
    return await (supabase as any)
      .from('products')
      .select(`
        *,
        shops (
          id,
          name,
          address,
          phone_number,
          rating,
          is_verified
        )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();
  },

  // Get products by shop
  async getProductsByShop(shopId: string, options?: {
    category?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
  }) {
    let query = (supabase as any)
      .from('products')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_active', true);

    if (options?.category) {
      query = query.eq('category', options.category);
    }

    if (options?.featured !== undefined) {
      query = query.eq('is_featured', options.featured);
    }

    query = query.order('name');

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const result = await query;
    // No distance info for single shop, use simple featured-first
    if (result.data) {
      result.data = sortFeaturedFirst(result.data);
    }
    return result;
  },

  // Get featured products
  async getFeaturedProducts(limit: number = 10, location?: { lat: number; lng: number; radius?: number }) {
    if (location) {
      const { data, error } = await (supabase as any).rpc('get_nearby_products', {
        user_lat: location.lat,
        user_lng: location.lng,
        radius_km: location.radius || 50,
        p_featured: true,
        p_limit: limit
      });

      if (error) {
        return { data: [], error };
      }

      // Transform RPC response to match expected format
      const transformedProducts = (data || []).map((p: any) => ({
        ...p,
        shops: {
          id: p.shop_id,
          name: p.shop_name,
          address: p.shop_address,
          logo_url: p.shop_logo_url,
          is_verified: p.shop_is_verified,
        }
      }));

      // Apply blended ranking
      const sortedProducts = sortProductsBlended(transformedProducts);

      return { data: sortedProducts, error: null };
    }

    return { data: [], error: null };
  },

  // Get product categories
  async getProductCategories() {
    const { data, error } = await (supabase as any)
      .from('products')
      .select('category')
      .eq('is_active', true)
      .not('category', 'is', null);

    if (error) return { data: [], error };

    const uniqueCategories = [...new Set(data.map((p: any) => p.category))].sort();
    return { data: uniqueCategories, error: null };
  },

  // Add product to favorites
  async addToFavorites(userId: string, productId: string) {
    return await (supabase as any)
      .from('user_favorites')
      .insert([{
        user_id: userId,
        product_id: productId,
      }]);
  },

  // Remove product from favorites
  async removeFromFavorites(userId: string, productId: string) {
    return await (supabase as any)
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);
  },

  // Get user's favorite products
  async getUserFavoriteProducts(userId: string) {
    return await (supabase as any)
      .from('user_favorites')
      .select(`
        *,
        products (
          *,
          shops (
            id,
            name,
            address
          )
        )
      `)
      .eq('user_id', userId)
      .not('products', 'is', null);
  },

  // Check if product is favorited by user
  async isProductFavorited(userId: string, productId: string) {
    const { data, error } = await (supabase as any)
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    return { isFavorited: !!data, error };
  },

  // Get related products (same category, different shop)
  async getRelatedProducts(productId: string, category: string, limit: number = 4) {
    const result = await (supabase as any)
      .from('products')
      .select(`
        *,
        shops (
          id,
          name,
          address
        )
      `)
      .eq('category', category)
      .eq('is_active', true)
      .neq('id', productId)
      .limit(limit);
    
    // No distance info, use simple featured-first
    if (result.data) {
      result.data = sortFeaturedFirst(result.data);
    }
    return result;
  },
};
