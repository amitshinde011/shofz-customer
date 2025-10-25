import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

// Default categories with icons (fallback if database is empty)
const DEFAULT_CATEGORIES: Category[] = [
  { id: "1", name: "Electronics", icon: "Smartphone", color: "bg-blue-500" },
  { id: "2", name: "Groceries", icon: "ShoppingCart", color: "bg-green-500" },
  { id: "3", name: "Fashion", icon: "Shirt", color: "bg-purple-500" },
  { id: "4", name: "Books", icon: "BookOpen", color: "bg-orange-500" },
  { id: "5", name: "Restaurants", icon: "UtensilsCrossed", color: "bg-red-500" },
  { id: "6", name: "Health", icon: "Heart", color: "bg-pink-500" },
  { id: "7", name: "Home", icon: "Home", color: "bg-indigo-500" },
  { id: "8", name: "Sports", icon: "Trophy", color: "bg-yellow-500" },
];

// Icon mapping for categories
const CATEGORY_ICON_MAP: Record<string, string> = {
  'Electronics': 'Smartphone',
  'Groceries': 'ShoppingCart',
  'Fashion': 'Shirt',
  'Books': 'BookOpen',
  'Restaurants': 'UtensilsCrossed',
  'Restaurant': 'UtensilsCrossed',
  'Food': 'UtensilsCrossed',
  'Health': 'Heart',
  'Healthcare': 'Heart',
  'Pharmacy': 'Heart',
  'Home': 'Home',
  'Sports': 'Trophy',
  'Fitness': 'Dumbbell',
  'Beauty': 'Sparkles',
  'Automotive': 'Car',
  'Pets': 'PawPrint',
  'Services': 'Wrench',
  'Education': 'GraduationCap',
  'Entertainment': 'Film',
};

// Color mapping for categories
const CATEGORY_COLOR_MAP: Record<string, string> = {
  'Electronics': 'bg-blue-500',
  'Groceries': 'bg-green-500',
  'Fashion': 'bg-purple-500',
  'Books': 'bg-orange-500',
  'Restaurants': 'bg-red-500',
  'Restaurant': 'bg-red-500',
  'Food': 'bg-red-500',
  'Health': 'bg-pink-500',
  'Healthcare': 'bg-pink-500',
  'Pharmacy': 'bg-pink-500',
  'Home': 'bg-indigo-500',
  'Sports': 'bg-yellow-500',
  'Fitness': 'bg-yellow-500',
  'Beauty': 'bg-rose-500',
  'Automotive': 'bg-slate-500',
  'Pets': 'bg-amber-500',
  'Services': 'bg-cyan-500',
  'Education': 'bg-violet-500',
  'Entertainment': 'bg-fuchsia-500',
};

export const categoryService = {
  // Get all categories from shops and products
  async getAllCategories(): Promise<Category[]> {
    try {
      // Get unique categories from shops
      const { data: shopCategories, error: shopError } = await (supabase as any)
        .from('shops')
        .select('categories')
        .eq('is_active', true);

      if (shopError) {
        console.error('Error fetching shop categories:', shopError);
      }

      // Get unique categories from products
      const { data: productCategories, error: productError } = await (supabase as any)
        .from('products')
        .select('category')
        .eq('is_active', true)
        .not('category', 'is', null);

      if (productError) {
        console.error('Error fetching product categories:', productError);
      }

      // Combine and deduplicate categories
      const allCategories = new Set<string>();

      // Add shop categories (array field)
      if (shopCategories) {
        shopCategories.forEach((shop: any) => {
          if (shop.categories && Array.isArray(shop.categories)) {
            shop.categories.forEach((cat: string) => allCategories.add(cat));
          }
        });
      }

      // Add product categories (single field)
      if (productCategories) {
        productCategories.forEach((product: any) => {
          if (product.category) {
            allCategories.add(product.category);
          }
        });
      }

      // If no categories found, return defaults
      if (allCategories.size === 0) {
        console.log('No categories found in database, using defaults');
        return DEFAULT_CATEGORIES;
      }

      // Convert to Category objects with icons and colors
      const categories: Category[] = Array.from(allCategories)
        .sort()
        .map((name, index) => ({
          id: `cat-${index + 1}`,
          name,
          icon: CATEGORY_ICON_MAP[name] || 'Store',
          color: CATEGORY_COLOR_MAP[name] || 'bg-gray-500',
        }));

      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return DEFAULT_CATEGORIES;
    }
  },

  // Get shop categories only
  async getShopCategories(): Promise<string[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('shops')
        .select('categories')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching shop categories:', error);
        return [];
      }

      const allCategories = new Set<string>();
      data?.forEach((shop: any) => {
        if (shop.categories && Array.isArray(shop.categories)) {
          shop.categories.forEach((cat: string) => allCategories.add(cat));
        }
      });

      return Array.from(allCategories).sort();
    } catch (error) {
      console.error('Error fetching shop categories:', error);
      return [];
    }
  },

  // Get product categories only
  async getProductCategories(): Promise<string[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('products')
        .select('category')
        .eq('is_active', true)
        .not('category', 'is', null);

      if (error) {
        console.error('Error fetching product categories:', error);
        return [];
      }

      const uniqueCategories = [...new Set(data?.map((p: any) => p.category).filter(Boolean) as string[])].sort();
      return uniqueCategories as string[];
    } catch (error) {
      console.error('Error fetching product categories:', error);
      return [];
    }
  },

  // Get category counts (number of shops/products per category)
  async getCategoryCounts(): Promise<Record<string, { shops: number; products: number }>> {
    try {
      const categories = await this.getAllCategories();
      const counts: Record<string, { shops: number; products: number }> = {};

      for (const category of categories) {
        // Count shops
        const { data: shops } = await (supabase as any)
          .from('shops')
          .select('id', { count: 'exact' })
          .contains('categories', [category.name])
          .eq('is_active', true);

        // Count products
        const { data: products } = await (supabase as any)
          .from('products')
          .select('id', { count: 'exact' })
          .eq('category', category.name)
          .eq('is_active', true);

        counts[category.name] = {
          shops: shops?.length || 0,
          products: products?.length || 0,
        };
      }

      return counts;
    } catch (error) {
      console.error('Error fetching category counts:', error);
      return {};
    }
  },
};
