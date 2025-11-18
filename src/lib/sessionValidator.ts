import { supabase } from '@/integrations/supabase/client';

export interface SessionHealth {
  isValid: boolean;
  isExpired: boolean;
  expiresIn: number; // seconds until expiration
  shouldRefresh: boolean;
  reason?: string;
}

/**
 * Check the health of the current session
 * Returns session validity status and whether refresh is needed
 */
export const checkSessionHealth = async (): Promise<SessionHealth> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return {
        isValid: false,
        isExpired: true,
        expiresIn: 0,
        shouldRefresh: false,
        reason: error?.message || 'No session found'
      };
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    const expiresIn = expiresAt - now;

    // Token is expired
    if (expiresIn <= 0) {
      console.warn('[SessionValidator] Token expired:', {
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        now: new Date(now * 1000).toISOString()
      });
      
      return {
        isValid: false,
        isExpired: true,
        expiresIn: 0,
        shouldRefresh: true,
        reason: 'Access token expired'
      };
    }

    // Token expires in less than 5 minutes - refresh proactively
    if (expiresIn < 300) {
      console.log('[SessionValidator] Token expiring soon, should refresh');
      return {
        isValid: true,
        isExpired: false,
        expiresIn,
        shouldRefresh: true,
        reason: 'Token expiring soon'
      };
    }

    // Token is valid
    return {
      isValid: true,
      isExpired: false,
      expiresIn,
      shouldRefresh: false
    };
  } catch (error) {
    console.error('[SessionValidator] Health check failed:', error);
    return {
      isValid: false,
      isExpired: true,
      expiresIn: 0,
      shouldRefresh: false,
      reason: 'Session validation error'
    };
  }
};

/**
 * Manually attempt to refresh the access token
 * Returns true if refresh succeeded, false otherwise
 */
export const attemptTokenRefresh = async (): Promise<boolean> => {
  try {
    console.log('[SessionValidator] Attempting manual token refresh...');
    
    // Set a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Token refresh timeout')), 15000);
    });
    
    // Race between refresh and timeout
    const refreshPromise = supabase.auth.refreshSession();
    
    const { data: { session }, error } = await Promise.race([
      refreshPromise,
      timeoutPromise
    ]) as Awaited<typeof refreshPromise>;
    
    if (error || !session) {
      console.error('[SessionValidator] Token refresh failed:', error);
      return false;
    }

    console.log('[SessionValidator] Token refresh successful');
    return true;
  } catch (error) {
    console.error('[SessionValidator] Token refresh exception:', error);
    return false;
  }
};
