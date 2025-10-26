import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService, Product } from '@/services/productService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ProductSearchOptions {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  shopId?: string;
  featured?: boolean;
  location?: { lat: number; lng: number; radius?: number };
  limit?: number;
  offset?: number;
}

export const useProducts = (options?: ProductSearchOptions) => {
  return useQuery({
    queryKey: ['products', options],
    queryFn: async () => {
      console.log('Fetching products with options:', options);
      const result = await productService.searchProducts(options);
      console.log('Products result:', result);
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => productService.getProductById(id),
    enabled: !!id,
  });
};

export const useFeaturedProducts = (limit?: number) => {
  return useQuery({
    queryKey: ['products', 'featured', limit],
    queryFn: () => productService.getFeaturedProducts(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useProductCategories = () => {
  return useQuery({
    queryKey: ['products', 'categories'],
    queryFn: () => productService.getProductCategories(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useProductsByShop = (shopId: string, options?: {
  category?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: ['products', 'shop', shopId, options],
    queryFn: () => productService.getProductsByShop(shopId, options),
    enabled: !!shopId,
  });
};

export const useUserFavoriteProducts = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['products', 'favorites', user?.id],
    queryFn: () => productService.getUserFavoriteProducts(user!.id),
    enabled: !!user?.id,
  });
};

export const useToggleProductFavorite = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, isFavorited }: { productId: string; isFavorited: boolean }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      if (isFavorited) {
        return productService.removeFromFavorites(user.id, productId);
      } else {
        return productService.addToFavorites(user.id, productId);
      }
    },
    // Optimistic update
    onMutate: async ({ productId, isFavorited }) => {
      await queryClient.cancelQueries({ queryKey: ['products', 'favorites'] });
      
      const previousFavorites = queryClient.getQueryData(['products', 'favorites', user?.id]);
      
      queryClient.setQueryData(['products', 'favorites', user?.id], (old: any) => {
        if (!old?.data) return old;
        
        if (isFavorited) {
          return {
            ...old,
            data: old.data.filter((fav: any) => fav.product_id !== productId)
          };
        } else {
          return {
            ...old,
            data: [...old.data, { product_id: productId }]
          };
        }
      });
      
      return { previousFavorites };
    },
    onSuccess: (_, { isFavorited }) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'favorites'] });
      toast({
        title: isFavorited ? "Removed from favorites" : "Added to favorites",
        description: isFavorited 
          ? "Product removed from your favorites"
          : "Product added to your favorites",
      });
    },
    onError: (error, _, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(['products', 'favorites', user?.id], context.previousFavorites);
      }
      
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
      console.error('Error toggling product favorite:', error);
    },
  });
};

export const useRelatedProducts = (productId: string, category: string, limit?: number) => {
  return useQuery({
    queryKey: ['products', 'related', productId, category, limit],
    queryFn: () => productService.getRelatedProducts(productId, category, limit),
    enabled: !!productId && !!category,
  });
};