import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ViewCounts {
  view_count: number;
  last_viewed_at?: string;
}

/**
 * Hook to fetch view counts for products, shops, or offers
 * Queries viewanalytics table directly with optimized COUNT query
 */
export function useEntityViewCounts(entityType: 'offer' | 'product' | 'shop', entityId: string | undefined) {
  return useQuery({
    queryKey: ['entityViewCounts', entityType, entityId],
    queryFn: async () => {
      if (!entityId) {
        console.log('[useEntityViewCounts] No entityId provided');
        return null;
      }

      console.log('[useEntityViewCounts] Fetching view count for:', entityType, entityId);

      // Query viewanalytics table directly with COUNT
      const { count, error: countError } = await (supabase as any)
        .from('viewanalytics')
        .select('*', { count: 'exact', head: true })
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);

      if (countError) {
        console.error(`[useEntityViewCounts] Query error for ${entityType}:`, countError);
        return { view_count: 0, last_viewed_at: undefined };
      }

      console.log(`[useEntityViewCounts] Result - count:`, count);
      return {
        view_count: count || 0,
        last_viewed_at: undefined,
      };
    },
    enabled: !!entityId,
    staleTime: 1000 * 30, // 30 seconds - fresher data for view counts
    refetchInterval: 1000 * 60, // Refetch every minute to show latest counts
  });
}
