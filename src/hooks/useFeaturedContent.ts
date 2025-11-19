import { useQuery } from '@tanstack/react-query';
import { featuredService } from '@/services/featuredService';
import { shopService } from '@/services/shopService';

export const useFeaturedShops = (limit?: number, location?: { lat: number; lng: number; radius?: number }) => {
  return useQuery({
    // ✅ FIX HIGH #8: Stable query key using lat/lng values instead of object reference
    queryKey: ['featured-shops', limit, location?.lat, location?.lng, location?.radius],
    queryFn: async () => shopService.getFeaturedShops(limit, location),
    staleTime: 5 * 60 * 1000,
    // ✅ FIX: Allow fetching without location (will show popular featured shops)
  });
};

export const useFeaturedProducts = (limit?: number, location?: { lat: number; lng: number; radius?: number }) => {
  return useQuery({
    // ✅ FIX HIGH #8: Stable query key using lat/lng values instead of object reference
    queryKey: ['featured-products', limit, location?.lat, location?.lng, location?.radius],
    queryFn: async () => featuredService.getFeaturedProducts(limit, location),
    staleTime: 5 * 60 * 1000,
    // ✅ FIX: Allow fetching without location (will show popular featured products)
  });
};

export const useFeaturedOffers = (limit?: number, location?: { lat: number; lng: number; radius?: number }) => {
  return useQuery({
    // ✅ FIX HIGH #8: Stable query key using lat/lng values instead of object reference
    queryKey: ['featured-offers', limit, location?.lat, location?.lng, location?.radius],
    queryFn: async () => featuredService.getFeaturedOffers(limit, location),
    staleTime: 5 * 60 * 1000,
    // ✅ FIX: Allow fetching without location (will show popular featured offers)
  });
};

export const useAllFeaturedContent = (location?: { lat: number; lng: number; radius?: number }) => {
  return useQuery({
    // ✅ FIX HIGH #8: Stable query key using lat/lng values instead of object reference
    queryKey: ['all-featured-content', location?.lat, location?.lng, location?.radius],
    queryFn: async () => featuredService.getAllFeaturedContent(location),
    staleTime: 5 * 60 * 1000,
    // ✅ FIX: Allow fetching without location (will show popular content)
  });
};