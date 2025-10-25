import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToggleProductFavorite } from '@/hooks/useProducts';
import { Product } from '@/services/productService';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StickyActionBarProps {
  product: Product;
}

export const StickyActionBar = ({ product }: StickyActionBarProps) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const toggleFavorite = useToggleProductFavorite();

  const { data: favoriteData } = useQuery({
    queryKey: ['favorite', product.id, user?.id],
    queryFn: async () => {
      if (!user?.id) return { isFavorited: false };
      const { data } = await (supabase as any)
        .from('user_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();
      return { isFavorited: !!data };
    },
    enabled: !!user?.id,
  });

  const isFavorited = favoriteData?.isFavorited || false;

  const handleInquire = () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to inquire about this product');
      return;
    }

    const params = new URLSearchParams({
      productId: product.id,
      product_name: product.name,
      shop_id: product.shop_id,
    });

    const isOutOfStock = !product.is_active || (
      product.inventory_tracking && 
      product.stock_quantity !== null && 
      product.stock_quantity === 0
    );
    
    if (isOutOfStock) {
      params.append('type', 'availability');
    }

    navigate(`/inquiry/new?${params.toString()}`);
  };

  const handleFavorite = () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to add favorites');
      return;
    }
    toggleFavorite.mutate({ productId: product.id, isFavorited });
  };

  const isOutOfStock = !product.is_active || (
    product.inventory_tracking && 
    product.stock_quantity !== null && 
    product.stock_quantity === 0
  );
  const ctaText = isOutOfStock
    ? 'Check Availability'
    : 'Inquire';

  return (
    <div className="fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-3 sm:p-4 z-20 shadow-lg">
      <div className="flex gap-2 sm:gap-3 max-w-screen-lg mx-auto px-2 sm:px-0">
        <Button
          variant="outline"
          size="lg"
          onClick={handleFavorite}
          className="shrink-0 h-11 w-11 sm:h-12 sm:w-12 p-0"
          disabled={toggleFavorite.isPending}
        >
          <Heart
            className={`h-4 w-4 sm:h-5 sm:w-5 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`}
          />
        </Button>
        <Button
          size="lg"
          onClick={handleInquire}
          className="flex-1 h-11 sm:h-12 text-sm sm:text-base"
          disabled={!product.is_active}
        >
          <MessageSquare className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          {ctaText}
        </Button>
      </div>
    </div>
  );
};
