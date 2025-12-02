import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchService, SearchOptions } from '@/services/searchService';
import { useUserLocation } from '@/contexts/LocationContext';

const RECENT_SEARCHES_KEY = 'shofz_recent_searches';
const MAX_RECENT_SEARCHES = 10;

/**
 * Get recent searches from localStorage
 */
export const useRecentSearches = () => {
  const [searches, setSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  }, []);

  const addSearch = (query: string) => {
    if (!query.trim()) return;
    
    try {
      setSearches(prev => {
        // Remove if exists, add to front, limit to MAX
        const filtered = prev.filter(s => s.toLowerCase() !== query.toLowerCase());
        const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      console.error('Error saving search:', error);
    }
  };

  const clearSearches = () => {
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
      setSearches([]);
    } catch (error) {
      console.error('Error clearing searches:', error);
    }
  };

  return { searches, addSearch, clearSearches };
};

/**
 * Get search suggestions (autocomplete)
 */
export const useSearchSuggestions = (query: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['search-suggestions', query],
    queryFn: async () => {
      const { data, error } = await searchService.getSuggestions(query, 5);
      if (error) throw error;
      return data || [];
    },
    enabled: enabled && query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Unified search across products, shops, and offers
 */
export const useUnifiedSearch = (
  query: string,
  options?: {
    categories?: string[];
    priceRange?: { min: number; max: number };
    rating?: number;
    radius?: number;
  }
) => {
  const { location } = useUserLocation();

  const searchOptions: SearchOptions = {
    query,
    categories: options?.categories,
    priceRange: options?.priceRange,
    location: location ? { lat: location.lat, lng: location.lng } : undefined,
    radius: options?.radius || 50,
    rating: options?.rating,
    limit: 20,
  };

  return useQuery({
    queryKey: ['unified-search', searchOptions],
    queryFn: async () => {
      const { data, error } = await searchService.search(searchOptions);
      if (error) throw error;
      return data;
    },
    enabled: query.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Get popular searches (from analytics)
 */
export const usePopularSearches = () => {
  return useQuery({
    queryKey: ['popular-searches'],
    queryFn: async () => {
      // TODO: Implement analytics-based popular searches
      // For now, return static popular searches
      return [
        'Electronics',
        'Clothing',
        'Groceries',
        'Mobile phones',
        'Furniture',
      ];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};
