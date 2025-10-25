import { useState, useEffect } from 'react';
import * as React from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
    console.log('[useAuth] User profile saved to localStorage');
  } catch (error) {
    console.error('[useAuth] Failed to save profile to localStorage:', error);
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
    console.error('[useAuth] Failed to clear profile from localStorage:', error);
  }
};

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });
  const { toast } = useToast();
  const toastRef = React.useRef(toast);

  React.useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const fetchUserProfile = async (userId: string): Promise<AuthUser | null> => {
    try {
      console.log('[useAuth] Fetching profile for user:', userId);
      
      // Check cache first
      const cached = getUserProfileFromStorage(userId);
      if (cached) {
        console.log('[useAuth] Using cached profile');
        return cached;
      }

      // Fetch from database
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[useAuth] Error fetching profile:', error);
        return null;
      }

      if (!data) {
        console.log('[useAuth] No profile found');
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
        console.log('[useAuth] User does not have customer role');
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
      console.log('[useAuth] Profile fetched successfully');
      return userProfile;
    } catch (error) {
      console.error('[useAuth] Exception in fetchUserProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('[useAuth] Setting up auth listener');
    let mounted = true;

    const handleAuthChange = async (event: string, session: Session | null) => {
      if (!mounted) return;

      console.log('[useAuth] Auth event:', event, 'Session:', !!session);

      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        
        if (mounted) {
          setAuthState({
            user: profile,
            session,
            loading: false,
          });
        }
      } else {
        clearUserProfileFromStorage();
        if (mounted) {
          setAuthState({
            user: null,
            session: null,
            loading: false,
          });
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        handleAuthChange('INITIAL_SESSION', session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    try {
      console.log('[useAuth] Signing up with email:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      // Handle "user already registered" in shared database
      if (error?.message?.includes('already registered')) {
        console.log('[useAuth] User exists in shared auth.users, checking for customer role...');
        
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

        if (roleData) {
          // User already has customer role
          await supabase.auth.signOut();
          return { 
            success: false, 
            error: 'You already have a customer account. Please sign in instead.' 
          };
        }

        // User exists but doesn't have customer role - add it
        console.log('[useAuth] Adding customer role to existing user...');

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
        await supabase.from('user_roles').insert({
          user_id: userId,
          role: 'customer'
        });

        // Create customer profile
        await supabase.from('customer_profiles').insert({
          user_id: userId
        });

        console.log('[useAuth] Customer role added successfully');
        return { success: true, user: signInData.user };
      }

      if (error) {
        console.error('[useAuth] Sign up error:', error);
        return { success: false, error: error.message };
      }

      console.log('[useAuth] Sign up successful');
      return { success: true, user: data.user };
    } catch (error: any) {
      console.error('[useAuth] Exception in signUpWithEmail:', error);
      return { success: false, error: error.message || 'Failed to sign up' };
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('[useAuth] Signing in with email:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('[useAuth] Sign in error:', error);
        return { success: false, error: error.message };
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
        await supabase.auth.signOut();
        return { success: false, error: 'This app is for customers only. Please use the Shop Owner app.' };
      }

      console.log('[useAuth] Sign in successful');
      return { success: true, user: data.user };
    } catch (error: any) {
      console.error('[useAuth] Exception in signInWithEmail:', error);
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
        console.error('[useAuth] Profile update error:', error);
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
      console.error('[useAuth] Exception in updateProfile:', error);
      return { success: false, error: error.message || 'Failed to update profile' };
    }
  };

  const authenticateWithEmail = async (email: string, password: string, name?: string) => {
    try {
      console.log('[useAuth] Authenticating with email:', email);
      
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
          await supabase.auth.signOut();
          return { success: false, error: 'This app is for customers only. Please use the Shop Owner app.' };
        }

        console.log('[useAuth] Existing user signed in');
        return { success: true, isNewUser: false, user: signInData.user };
      }

      // Sign in failed - try sign up if error is invalid credentials
      if (signInError?.message?.includes('Invalid login credentials')) {
        console.log('[useAuth] User not found, attempting sign up...');
        
        const signUpResult = await signUpWithEmail(email, password, name || email.split('@')[0]);
        
        if (signUpResult.success) {
          console.log('[useAuth] New user created');
          return { success: true, isNewUser: true, user: signUpResult.user };
        }
        
        return { success: false, error: signUpResult.error };
      }

      // Other sign in error
      console.error('[useAuth] Sign in error:', signInError);
      return { success: false, error: signInError?.message || 'Authentication failed' };
    } catch (error: any) {
      console.error('[useAuth] Exception in authenticateWithEmail:', error);
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
      console.error('[useAuth] Error signing in with Google:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to sign in with Google' 
      };
    }
  };

  const signOut = async () => {
    try {
      console.log('[useAuth] Signing out');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      clearUserProfileFromStorage();
      return { success: true };
    } catch (error: any) {
      console.error('[useAuth] Error signing out:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign out'
      };
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      console.log('[useAuth] Requesting password reset for:', email);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('[useAuth] Error requesting password reset:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send reset email' 
      };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      console.log('[useAuth] Updating password');
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('[useAuth] Error updating password:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to update password' 
      };
    }
  };

  return {
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
}
