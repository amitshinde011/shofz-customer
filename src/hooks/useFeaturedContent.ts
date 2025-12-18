import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { featuredService } from '@/services/featuredService';
import { shopService } from '@/services/shopService';

const FEATURED_PAGE_SIZE = 10;

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

// Infinite scroll hooks for featured content
export const useInfiniteFeaturedShops = (location?: { lat: number; lng: number; radius?: number }) => {
  return useInfiniteQuery({
    queryKey: ['infinite-featured-shops', location],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await featuredService.getFeaturedShopsPaginated(
        FEATURED_PAGE_SIZE,
        pageParam * FEATURED_PAGE_SIZE,
        location
      );
      return {
        data: result.data || [],
        nextPage: pageParam + 1,
        hasMore: (result.data?.length || 0) >= FEATURED_PAGE_SIZE,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : undefined,
    enabled: !!location,
    staleTime: 5 * 60 * 1000,
  });
};

export const useInfiniteFeaturedProducts = (location?: { lat: number; lng: number; radius?: number }) => {
  return useInfiniteQuery({
    queryKey: ['infinite-featured-products', location],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await featuredService.getFeaturedProductsPaginated(
        FEATURED_PAGE_SIZE,
        pageParam * FEATURED_PAGE_SIZE,
        location
      );
      return {
        data: result.data || [],
        nextPage: pageParam + 1,
        hasMore: (result.data?.length || 0) >= FEATURED_PAGE_SIZE,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : undefined,
    enabled: !!location,
    staleTime: 5 * 60 * 1000,
  });
};

export const useInfiniteFeaturedOffers = (location?: { lat: number; lng: number; radius?: number }) => {
  return useInfiniteQuery({
    queryKey: ['infinite-featured-offers', location],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await featuredService.getFeaturedOffersPaginated(
        FEATURED_PAGE_SIZE,
        pageParam * FEATURED_PAGE_SIZE,
        location
      );
      return {
        data: result.data || [],
        nextPage: pageParam + 1,
        hasMore: (result.data?.length || 0) >= FEATURED_PAGE_SIZE,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : undefined,
    enabled: !!location,
    staleTime: 5 * 60 * 1000,
  });
};