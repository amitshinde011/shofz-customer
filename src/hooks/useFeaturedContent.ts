import { useQuery } from '@tanstack/react-query';
import { featuredService } from '@/services/featuredService';
import { shopService } from '@/services/shopService';

export const useFeaturedShops = (limit?: number, location?: { lat: number; lng: number; radius?: number }) => {
  return useQuery({
    queryKey: ['featured-shops', limit, location],
    queryFn: async () => shopService.getFeaturedShops(limit, location),
    staleTime: 5 * 60 * 1000,
    enabled: !!location,
  });
};

export const useFeaturedProducts = (limit?: number, location?: { lat: number; lng: number; radius?: number }) => {
  return useQuery({
    queryKey: ['featured-products', limit, location],
    queryFn: async () => featuredService.getFeaturedProducts(limit, location),
    staleTime: 5 * 60 * 1000,
    enabled: !!location,
  });
};

export const useFeaturedOffers = (limit?: number, location?: { lat: number; lng: number; radius?: number }) => {
  return useQuery({
    queryKey: ['featured-offers', limit, location],
    queryFn: async () => featuredService.getFeaturedOffers(limit, location),
    staleTime: 5 * 60 * 1000,
    enabled: !!location,
  });
};

export const useAllFeaturedContent = (location?: { lat: number; lng: number; radius?: number }) => {
  return useQuery({
    queryKey: ['all-featured-content', location],
    queryFn: async () => featuredService.getAllFeaturedContent(location),
    staleTime: 5 * 60 * 1000,
    enabled: !!location,
  });
};