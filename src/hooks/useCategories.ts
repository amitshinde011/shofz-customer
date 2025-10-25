import { useQuery } from '@tanstack/react-query';
import { categoryService, Category } from '@/services/categoryService';

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAllCategories(),
    staleTime: 30 * 60 * 1000, // 30 minutes - categories don't change often
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

export const useShopCategories = () => {
  return useQuery({
    queryKey: ['categories', 'shops'],
    queryFn: () => categoryService.getShopCategories(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
};

export const useCategoryCounts = () => {
  return useQuery({
    queryKey: ['categories', 'counts'],
    queryFn: () => categoryService.getCategoryCounts(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
  });
};
