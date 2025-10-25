import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

type EntityType = 'offer' | 'product' | 'shop';

/**
 * Hook to track entity views in the viewanalytics table
 * Automatically tracks a view when the component mounts
 */
export function useViewTracking(entityType: EntityType, entityId: string | undefined) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!entityId || hasTracked.current) return;

    const trackView = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get or create session ID
        let sessionId = sessionStorage.getItem('view_session_id');
        if (!sessionId) {
          sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          sessionStorage.setItem('view_session_id', sessionId);
        }

        // Prepare device info
        const deviceInfo = {
          user_agent: navigator.userAgent,
          screen_resolution: `${window.screen.width}x${window.screen.height}`,
          viewport_size: `${window.innerWidth}x${window.innerHeight}`,
          platform: navigator.platform,
          language: navigator.language,
        };

        // Insert view analytics
        const { error } = await supabase.from('viewanalytics' as any).insert({
          entity_type: entityType,
          entity_id: entityId,
          viewer_id: user?.id || null,
          viewer_type: user ? 'customer' : 'guest',
          session_id: sessionId,
          device_info: deviceInfo,
        });

        if (error) throw error;

        hasTracked.current = true;
        console.log(`Successfully tracked ${entityType} view for:`, entityId);
      } catch (error) {
        // Silently fail to not disrupt user experience
        console.log('View tracking error:', error);
      }
    };

    console.log(`Tracking ${entityType} view:`, entityId);
    trackView();
  }, [entityType, entityId]);
}
