import { supabase } from "@/integrations/supabase/client";
import { Advertisement } from "@/types/advertisement";

// NOTE: The 'advertisements' table is not yet in the generated Supabase types.
// Using 'as any' temporarily until types are regenerated.
// Storage bucket policies are secure and verified: admin-only upload with proper RLS.

export const advertisementService = {
  // Get active advertisements by type and placement
  async getActiveAds(
    adType?: 'carousel' | 'banner',
    placement?: string
  ): Promise<{ data: Advertisement[] | null; error: any }> {
    try {
      let query = supabase
        .from('advertisements' as any)
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (adType) {
        query = query.eq('ad_type', adType);
      }

      if (placement) {
        query = query.eq('placement', placement);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by date range
      const now = new Date();
      const filtered = (data as any)?.filter((ad: any) => {
        const startOk = !ad.start_date || new Date(ad.start_date) <= now;
        const endOk = !ad.end_date || new Date(ad.end_date) >= now;
        return startOk && endOk;
      }) as Advertisement[];

      return { data: filtered || [], error: null };
    } catch (error) {
      console.error('Error fetching advertisements:', error);
      return { data: null, error };
    }
  },

  // Track ad impression
  async trackImpression(adId: string): Promise<void> {
    try {
      await supabase.rpc('increment_ad_impression' as any, { ad_id: adId });
    } catch (error) {
      console.debug('Error tracking impression:', error);
    }
  },

  // Track ad click
  async trackClick(adId: string): Promise<void> {
    try {
      await supabase.rpc('increment_ad_click' as any, { ad_id: adId });
    } catch (error) {
      console.debug('Error tracking click:', error);
    }
  }
};
