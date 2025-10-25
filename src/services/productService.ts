import { supabase } from '@/integrations/supabase/client';

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
            rating
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

      query = query.order('is_featured', { ascending: false })
                   .order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
      }

      return await query;
    }

    // If location is provided, filter by nearby shops first
    if (options?.location) {
      const { data: nearbyShops, error: shopsError } = await (supabase as any).rpc('get_nearby_shops', {
        user_lat: options.location.lat,
        user_lng: options.location.lng,
        radius_km: options.location.radius || 50
      });

      if (shopsError) {
        console.error('Error fetching nearby shops:', shopsError);
        return { data: [], error: shopsError };
      }

      const nearbyShopIds = nearbyShops?.map((s: any) => s.id) || [];
      
      if (nearbyShopIds.length === 0) {
        return { data: [], error: null };
      }

      let query = (supabase as any)
        .from('products')
        .select(`
          *,
          shops (
            id,
            name,
            address,
            rating
          )
        `)
        .eq('is_active', true)
        .in('shop_id', nearbyShopIds);

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

      if (options?.shopId) {
        query = query.eq('shop_id', options.shopId);
      }

      if (options?.featured) {
        query = query.eq('is_featured', true);
      }

      query = query.order('is_featured', { ascending: false })
                   .order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
      }

      const result = await query;
      
      // Transform shop location data from nearbyShops to match Product interface
      if (result.data && nearbyShops) {
        result.data = result.data.map((product: any) => {
          const shopWithLocation = nearbyShops.find((s: any) => s.id === product.shop_id);
          if (product.shops && shopWithLocation) {
            product.shops.location = shopWithLocation.latitude && shopWithLocation.longitude
              ? { lat: shopWithLocation.latitude, lng: shopWithLocation.longitude }
              : undefined;
          }
          return product;
        });
      }
      
      return result;
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

    query = query.order('is_featured', { ascending: false })
                 .order('name');

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    return await query;
  },

  // Get featured products
  async getFeaturedProducts(limit: number = 10, location?: { lat: number; lng: number; radius?: number }) {
    if (location) {
      const { data: nearbyShops, error: shopsError } = await (supabase as any).rpc('get_nearby_shops', {
        user_lat: location.lat,
        user_lng: location.lng,
        radius_km: location.radius || 50
      });

      if (shopsError) {
        return { data: [], error: shopsError };
      }

      const nearbyShopIds = nearbyShops?.map((s: any) => s.id) || [];
      
      if (nearbyShopIds.length === 0) {
        return { data: [], error: null };
      }

      return await (supabase as any)
        .from('products')
        .select(`
          *,
          shops (
            id,
            name,
            address
          )
        `)
        .eq('is_active', true)
        .eq('is_featured', true)
        .in('shop_id', nearbyShopIds)
        .order('created_at', { ascending: false })
        .limit(limit);
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
    return await (supabase as any)
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
      .order('is_featured', { ascending: false })
      .limit(limit);
  },
};