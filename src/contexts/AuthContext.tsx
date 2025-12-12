import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { checkSessionHealth, attemptTokenRefresh, SessionHealth } from '@/lib/sessionValidator';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
}

interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
}

// Local storage keys
const USER_PROFILE_KEY = 'localconnect_user_profile';
const USER_PROFILE_TIMESTAMP_KEY = 'localconnect_user_profile_timestamp';
const PROFILE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Helper functions for local storage
const saveUserProfileToStorage = (profile: AuthUser) => {
  try {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    localStorage.setItem(USER_PROFILE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('[AuthContext] Failed to save profile to localStorage:', error);
  }
};

const getUserProfileFromStorage = (userId: string): AuthUser | null => {
  try {
    const cachedProfile = localStorage.getItem(USER_PROFILE_KEY);
    const timestamp = localStorage.getItem(USER_PROFILE_TIMESTAMP_KEY);

    if (!cachedProfile || !timestamp) {
      return null;
    }

    const age = Date.now() - parseInt(timestamp);
    if (age > PROFILE_CACHE_DURATION) {
      clearUserProfileFromStorage();
      return null;
    }

    const profile = JSON.parse(cachedProfile) as AuthUser;

    if (profile.id !== userId) {
      clearUserProfileFromStorage();
      return null;
    }

    return profile;
  } catch (error) {
    clearUserProfileFromStorage();
    return null;
  }
};

const clearUserProfileFromStorage = () => {
  try {
    localStorage.removeItem(USER_PROFILE_KEY);
    localStorage.removeItem(USER_PROFILE_TIMESTAMP_KEY);
  } catch (error) {
    console.error('[AuthContext] Failed to clear profile from localStorage:', error);
  }
};

// Utility: Check if device is online
const isOnline = () => navigator.onLine;

// Utility: Retry with exponential backoff
const retryWithBackoff = async <T,>(
  fn: () => Promise<T>,
  maxRetries = 3,
  operation = 'operation'
): Promise<T | null> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!isOnline() && attempt > 1) {
        console.log(`[AuthContext] Offline - skipping retry ${attempt}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
      const result = await fn();
      return result;
    } catch (error) {
      console.error(`[AuthContext] ${operation} attempt ${attempt}/${maxRetries} failed:`, error);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(`[AuthContext] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return null;
};

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<any>;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  authenticateWithEmail: (email: string, password: string, name?: string) => Promise<any>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => Promise<any>;
  requestPasswordReset: (email: string) => Promise<any>;
  updatePassword: (newPassword: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });
  const { toast } = useToast();
  const toastRef = useRef(toast);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // Monitor session health every 30 minutes (reduced from 2 minutes for efficiency)
  useEffect(() => {
    if (!authState.session) {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
      return;
    }

    const monitorSessionHealth = async () => {
      if (!isOnline()) {
        console.log('[AuthContext] Device offline - skipping health check');
        return;
      }
      
      const health = await checkSessionHealth();

      if (!health.isValid) {
        console.warn('[AuthContext] Session is invalid:', health.reason);
        
        // Try to refresh if token is expired
        if (health.shouldRefresh) {
          const refreshed = await attemptTokenRefresh();
          
          if (!refreshed) {
            console.error('[AuthContext] Token refresh failed - Supabase will handle sign-out if needed');
            toastRef.current({
              title: "Connection issue",
              description: "Your session may need to be refreshed. Please try again if you experience issues.",
              variant: "default",
            });
            // Don't force sign-out - let Supabase's autoRefreshToken handle it
          }
        }
      } else if (health.shouldRefresh) {
        // Proactively refresh before expiration
        console.log('[AuthContext] Proactively refreshing token');
        await attemptTokenRefresh();
      }
    };

    // Initial check
    monitorSessionHealth();

    // Check every 30 minutes (reduced from 2 minutes for efficiency)
    healthCheckIntervalRef.current = setInterval(monitorSessionHealth, 30 * 60 * 1000);

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [authState.session]);

  const fetchUserProfile = async (userId: string, session?: Session | null): Promise<AuthUser | null> => {
    try {
      // Check cache first
      const cached = getUserProfileFromStorage(userId);
      if (cached) {
        return cached;
      }

      // ✅ Check email verification from Supabase session (source of truth)
      if (session?.user && !session.user.email_confirmed_at) {
        console.warn('[AuthContext] User email not verified in Supabase session');
        // Don't sign out here - just return null and let the auth flow handle it
        toastRef.current({
          title: "Email verification required",
          description: "Please verify your email before signing in",
          variant: "destructive",
        });
        return null;
      }

      // Fetch from database
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[AuthContext] Error fetching profile:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      // Check if user has customer role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'customer')
        .eq('is_active', true)
        .single();

      if (!roleData) {
        return null;
      }

      const userProfile: AuthUser = {
        id: data.id,
        email: data.email,
        name: data.name,
        phone: data.phone,
        avatar_url: data.avatar_url,
        is_active: data.is_active
      };

      saveUserProfileToStorage(userProfile);
      return userProfile;
    } catch (error) {
      console.error('[AuthContext] Exception in fetchUserProfile:', error);
      return null;
    }
  };

  // Fetch user profile with retry logic
  const fetchUserProfileWithRetry = async (
    userId: string, 
    session: Session | null
  ): Promise<AuthUser | null> => {
    return await retryWithBackoff(
      () => fetchUserProfile(userId, session),
      3,
      'fetchUserProfile'
    );
  };

  // Set up auth listener ONCE (empty dependency array)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[AuthContext] Setting up global auth listener (ONCE)');
    }
    let mounted = true;

    const handleAuthChange = async (event: string, session: Session | null) => {
      if (!mounted) return;

      if (import.meta.env.DEV) {
        console.log('[AuthContext] Auth event:', event, 'Session:', !!session);
      }

      // Detect Supabase's automatic token refresh failures
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.error('[AuthContext] Supabase autoRefreshToken failed - likely network issue');
        toastRef.current({
          title: "Connection issue",
          description: "Having trouble staying connected. Your session is safe.",
          variant: "default"
        });
        // Don't sign out - Supabase will retry automatically
        return;
      }

      // Handle explicit sign out
      if (event === 'SIGNED_OUT') {
        clearUserProfileFromStorage();
        if (mounted) {
          setAuthState({ user: null, session: null, loading: false });
        }
        return;
      }

      // Explicitly handle token refresh
      if (event === 'TOKEN_REFRESHED') {
        if (!session) {
          console.warn('[AuthContext] Token refresh returned no session - likely transient issue');
          // Don't sign out - this could be temporary. Let Supabase handle it.
          return;
        }
        console.log('[AuthContext] Token refreshed successfully');
      }

      // Handle session updates (SIGNED_IN, TOKEN_REFRESHED, INITIAL_SESSION)
      try {
        if (session?.user) {
          const profile = await fetchUserProfileWithRetry(session.user.id, session);

          if (!profile) {
            console.warn('[AuthContext] Cannot load profile after retries');
            
            // For SIGNED_IN, keep the session even if profile fails
            if (event === 'SIGNED_IN') {
              console.warn('[AuthContext] SIGNED_IN profile fetch failed - keeping session active');
              toastRef.current({
                title: "Profile data unavailable",
                description: "You're signed in but profile couldn't load. Try refreshing.",
                variant: "default"
              });
              
              if (mounted) {
                setAuthState({ 
                  user: null, // No profile data
                  session: session, // But keep the session
                  loading: false 
                });
              }
              return;
            }
            
            // For token refresh or initial load, keep existing state
            if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
              console.warn('[AuthContext] Cannot load profile - may be network issue. Keeping existing state.');
              // Keep the existing user state if we have it
              if (!authState.user && mounted) {
                setAuthState({ 
                  user: null, 
                  session: session, // Keep session
                  loading: false 
                });
              }
              return;
            }
          }

          if (mounted) {
            setAuthState({
              user: profile,
              session,
              loading: false,
            });
          }
        } else {
          // Only clear on explicit sign out, not on transient states
          if (event === 'SIGNED_OUT') {
            clearUserProfileFromStorage();
            if (mounted) {
              setAuthState({ user: null, session: null, loading: false });
            }
          } else if (event === 'INITIAL_SESSION') {
            // Initialization complete - user not logged in
            console.log('[AuthContext] Initial session complete - no user logged in');
            if (mounted) {
              setAuthState({ user: null, session: null, loading: false });
            }
          } else {
            // For other events like TOKEN_REFRESHED, keep existing state to prevent sign-out on transient errors
            console.warn('[AuthContext] No session.user in event:', event, '- keeping existing state');
          }
        }
      } catch (error) {
        console.error('[AuthContext] Error in handleAuthChange:', error);
        
        // Don't sign out on errors - could be temporary network/DB issues
        if (event === 'TOKEN_REFRESHED') {
          console.error('[AuthContext] Error during token refresh - keeping existing state');
          // Keep existing state, don't clear user
          return;
        }
        
        // Don't clear state on errors - could be temporary network/DB issues
        console.error('[AuthContext] Error in non-refresh event - keeping existing state');
        // Keep user logged in, they can retry operations
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Get initial session with timeout and error handling
    const sessionTimeout = setTimeout(() => {
      if (mounted && authState.loading) {
        console.warn('[AuthContext] Session load timeout - checking offline status');
        
        // Don't clear storage or session on timeout - could be slow network
        // Only clear loading state so app becomes usable
        if (isOnline()) {
          console.warn('[AuthContext] Online but slow - keeping any cached session');
        } else {
          console.warn('[AuthContext] Device is offline - will retry when online');
        }
        
        setAuthState(prev => ({
          ...prev, // Keep existing user/session if any
          loading: false
        }));
      }
    }, 30000); // 30 second timeout (increased from 5s)

    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        clearTimeout(sessionTimeout);

        if (error) {
          console.error('[AuthContext] Session fetch error:', error);
          // Don't clear storage on error - keep any cached data
          if (mounted) {
            setAuthState(prev => ({
              ...prev,
              loading: false
            }));
          }
          return;
        }

        // Check if session is expired
        if (session) {
          const health = await checkSessionHealth();
          
          if (health.isExpired) {
            console.warn('[AuthContext] Loaded expired session, attempting refresh...');
            const refreshed = await attemptTokenRefresh();
            
            if (!refreshed) {
              console.warn('[AuthContext] Cannot refresh expired session - letting Supabase handle it');
              // Don't force sign-out - let Supabase's autoRefreshToken mechanism handle this
              // If the token is truly invalid, Supabase will send SIGNED_OUT event
              if (mounted) {
                setAuthState({ user: null, session: null, loading: false });
              }
              return;
            }
            
            // Get refreshed session
            const { data: { session: newSession } } = await supabase.auth.getSession();
            if (mounted && newSession) {
              handleAuthChange('INITIAL_SESSION', newSession);
            }
            return;
          }
        }

        if (mounted) {
          handleAuthChange('INITIAL_SESSION', session);
        }
      })
      .catch(async (error) => {
        clearTimeout(sessionTimeout);
        console.error('[AuthContext] Session fetch exception:', error);
        
        // Don't clear storage on fetch errors - could be network issues
        // Keep existing session if available
        if (mounted) {
          setAuthState(prev => ({
            ...prev,
            loading: false // Just stop loading, keep user/session if cached
          }));
        }
      });

    return () => {
      if (import.meta.env.DEV) {
        console.log('[AuthContext] Cleaning up global auth listener');
      }
      clearTimeout(sessionTimeout);
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // ← EMPTY DEPS = RUNS ONCE

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            name,
            app_type: 'customer' // Identify this is Customer App
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      // ✅ FIX 1: Check if email confirmation is required
      if (!error && data.user && !data.user.email_confirmed_at) {
        console.log('[AuthContext] Email confirmation required');
        return { 
          success: true, 
          requiresEmailConfirmation: true,
          user: data.user 
        };
      }

      // Handle "user already registered" in shared database
      if (error?.message?.includes('already registered')) {
        // Verify credentials by signing in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          return { success: false, error: 'This email is already registered. Please sign in instead.' };
        }

        const userId = signInData.user.id;

        // Check if user has customer role in shared user_roles table
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'customer')
          .eq('is_active', true)
          .maybeSingle();

        // ✅ FIX 2: User already has customer role - sign them in
        if (roleData) {
          console.log('[AuthContext] User already has customer role, signing in');
          return { 
            success: true, 
            isNewUser: false,
            user: signInData.user 
          };
        }

        // User exists but doesn't have customer role - add it
        // Ensure user exists in public.users (should already exist from other app)
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (!userData) {
          await supabase.from('users').insert({
            id: userId,
            email: signInData.user.email,
            name: signInData.user.user_metadata?.name || name || signInData.user.email?.split('@')[0] || 'User',
            email_verified: !!signInData.user.email_confirmed_at,
            email_verified_at: signInData.user.email_confirmed_at
          });
        }

        // Add customer role to shared user_roles table
        const { error: roleInsertError } = await supabase.from('user_roles').insert({
          user_id: userId,
          role: 'customer'
        });

        if (roleInsertError) {
          console.error('[AuthContext] Failed to add customer role:', roleInsertError);
          // Don't sign out - let user retry registration
          return { 
            success: false, 
            error: 'Failed to set up account. Please try again.',
          };
        }

        // Create customer profile
        const { error: profileInsertError } = await supabase.from('customer_profiles').insert({
          user_id: userId
        });

        if (profileInsertError) {
          console.error('[AuthContext] Failed to create customer profile:', profileInsertError);
          // Don't fail signup for this, profile can be created later
        }

        // ✅ FIX 3: Verify role was added successfully
        const { data: verifyRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'customer')
          .eq('is_active', true)
          .single();

      if (!verifyRole) {
        console.error('[AuthContext] Role verification failed');
        // Don't sign out - let user retry
        return { 
          success: false, 
          error: 'Failed to verify account setup. Please try again.',
        };
      }

        return { success: true, isNewUser: true, user: signInData.user };
      }

      if (error) {
        console.error('[AuthContext] Sign up error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, user: data.user };
    } catch (error: any) {
      console.error('[AuthContext] Exception in signUpWithEmail:', error);
      return { success: false, error: error.message || 'Failed to sign up' };
    }
  };

  const signInWithEmail = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem('auth_remember_me', 'true');
        localStorage.setItem('auth_remember_me_date', new Date().toISOString());
      } else {
        localStorage.removeItem('auth_remember_me');
        localStorage.removeItem('auth_remember_me_date');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Special handling for unverified email
        if (error.message.includes('Email not confirmed')) {
          return { 
            success: false, 
            error: 'Please verify your email before signing in. Check your inbox for the confirmation link.',
            requiresEmailConfirmation: true
          };
        }
        console.error('[AuthContext] Sign in error:', error);
        return { success: false, error: error.message };
      }

      // Check email verification
      if (!data.user.email_confirmed_at) {
        // ✅ INTENTIONAL: Sign out unverified users for security
        // This does NOT affect infinite sessions - user never had a valid session
        await supabase.auth.signOut();
        return { 
          success: false, 
          error: 'Please verify your email before signing in. Check your inbox for the confirmation link.',
          requiresEmailConfirmation: true
        };
      }

      // Verify user has customer role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'customer')
        .eq('is_active', true)
        .single();

      if (!roleData) {
        // User exists but doesn't have customer role - add it (cross-app authentication)
        console.log('[AuthContext] User from business app - adding customer role');
        
        const { error: roleInsertError } = await supabase.from('user_roles').insert({
          user_id: data.user.id,
          role: 'customer'
        });

        if (roleInsertError) {
          console.error('[AuthContext] Failed to add customer role:', roleInsertError);
          await supabase.auth.signOut();
          return { success: false, error: 'Failed to set up customer access. Please try again.' };
        }

        // Create customer profile if it doesn't exist
        const { error: profileInsertError } = await supabase.from('customer_profiles').insert({
          user_id: data.user.id
        });

        if (profileInsertError && !profileInsertError.message.includes('duplicate')) {
          console.error('[AuthContext] Failed to create customer profile:', profileInsertError);
          // Don't fail - profile can be created later
        }
        
        // Return as "new user" to this app for profile setup
        return { success: true, user: data.user, isNewUser: true };
      }

      return { success: true, user: data.user, isNewUser: false };
    } catch (error: any) {
      console.error('[AuthContext] Exception in signInWithEmail:', error);
      return { success: false, error: error.message || 'Failed to sign in' };
    }
  };

  const updateProfile = async (updates: Partial<AuthUser>) => {
    try {
      if (!authState.user) {
        return { success: false, error: 'No authenticated user' };
      }

      const updateData: any = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.avatar_url !== undefined) updateData.avatar_url = updates.avatar_url;

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', authState.user.id)
        .select()
        .single();

      if (error) {
        console.error('[AuthContext] Profile update error:', error);
        return { success: false, error: error.message };
      }

      const updatedProfile: AuthUser = {
        id: data.id,
        email: data.email,
        name: data.name,
        phone: data.phone,
        avatar_url: data.avatar_url,
        is_active: data.is_active
      };

      setAuthState(prev => ({ ...prev, user: updatedProfile }));
      saveUserProfileToStorage(updatedProfile);

      return { success: true };
    } catch (error: any) {
      console.error('[AuthContext] Exception in updateProfile:', error);
      return { success: false, error: error.message || 'Failed to update profile' };
    }
  };

  const authenticateWithEmail = async (email: string, password: string, name?: string, rememberMe: boolean = false) => {
    try {
      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem('auth_remember_me', 'true');
        localStorage.setItem('auth_remember_me_date', new Date().toISOString());
      } else {
        localStorage.removeItem('auth_remember_me');
        localStorage.removeItem('auth_remember_me_date');
      }

      // Try to sign in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (!signInError && signInData.user) {
        // Sign in successful - verify customer role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', signInData.user.id)
          .eq('role', 'customer')
          .eq('is_active', true)
          .single();

        if (!roleData) {
          // User exists but doesn't have customer role - add it (cross-app authentication)
          console.log('[AuthContext] Cross-app user detected - adding customer role');
          
          const { error: roleInsertError } = await supabase.from('user_roles').insert({
            user_id: signInData.user.id,
            role: 'customer'
          });

          if (roleInsertError) {
            console.error('[AuthContext] Failed to add customer role:', roleInsertError);
            await supabase.auth.signOut();
            return { success: false, error: 'Failed to set up customer access. Please try again.' };
          }

          // Create customer profile if needed
          await supabase.from('customer_profiles').insert({
            user_id: signInData.user.id
          });

          // Treat as new user to this app for profile setup
          return { success: true, isNewUser: true, user: signInData.user };
        }

        return { success: true, isNewUser: false, user: signInData.user };
      }

      // Sign in failed - try sign up if error is invalid credentials
      if (signInError?.message?.includes('Invalid login credentials')) {
        const signUpResult = await signUpWithEmail(email, password, name || email.split('@')[0]);
        
        if (signUpResult.success) {
          return { success: true, isNewUser: true, user: signUpResult.user };
        }
        
        return { success: false, error: signUpResult.error };
      }

      // Other sign in error
      console.error('[AuthContext] Sign in error:', signInError);
      return { success: false, error: signInError?.message || 'Authentication failed' };
    } catch (error: any) {
      console.error('[AuthContext] Exception in authenticateWithEmail:', error);
      return { success: false, error: error.message || 'Failed to authenticate' };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error: any) {
      console.error('[AuthContext] Error signing in with Google:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to sign in with Google' 
      };
    }
  };

  const signOut = async () => {
    try {
      // Clear remember me preference on sign out
      localStorage.removeItem('auth_remember_me');
      localStorage.removeItem('auth_remember_me_date');
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      clearUserProfileFromStorage();
      return { success: true };
    } catch (error: any) {
      console.error('[AuthContext] Error signing out:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign out'
      };
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('[AuthContext] Error requesting password reset:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send reset email' 
      };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('[AuthContext] Error updating password:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to update password' 
      };
    }
  };

  const value: AuthContextType = {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    isAuthenticated: !!authState.user && !!authState.session,
    signUpWithEmail,
    signInWithEmail,
    authenticateWithEmail,
    updateProfile,
    signInWithGoogle,
    signOut,
    requestPasswordReset,
    updatePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
